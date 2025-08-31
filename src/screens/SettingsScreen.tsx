import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

import { AlarmScheduler } from '../services/AlarmScheduler';
import { NotificationService } from '../services/NotificationService';
import { PermissionService } from '../services/PermissionService';
import { StorageService } from '../services/StorageService';
import { Alarm, PuzzleType } from '../types';

interface Settings {
  defaultSound: string;
  defaultVibration: boolean;
  defaultSnoozeDuration: number;
  defaultPuzzleType: PuzzleType;
  debugLogging: boolean;
  autoCleanup: boolean;
}

interface DiagnosticData {
  scheduledNotifications: any[];
  storedAlarms: Alarm[];
  permissions: any;
  notificationListenerStatus: boolean;
  lastAlarmTrigger: string | null;
  systemHealth: {
    alarmsConsistent: boolean;
    notificationsValid: boolean;
    permissionsValid: boolean;
  };
}

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<Settings>({
    defaultSound: 'alarm_default',
    defaultVibration: true,
    defaultSnoozeDuration: 5,
    defaultPuzzleType: PuzzleType.MATH,
    debugLogging: false,
    autoCleanup: true,
  });
  
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData>({
    scheduledNotifications: [],
    storedAlarms: [],
    permissions: {},
    notificationListenerStatus: false,
    lastAlarmTrigger: null,
    systemHealth: {
      alarmsConsistent: false,
      notificationsValid: false,
      permissionsValid: false,
    },
  });

  const [debugMode, setDebugMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSettings();
    loadDiagnosticData();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const loadDiagnosticData = async () => {
    setRefreshing(true);
    try {
      // Get scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      // Get stored alarms
      const alarms = await StorageService.getAllAlarms();
      
      // Get permissions
      const permissions = await PermissionService.checkAllPermissions();
      
      // Get last alarm trigger
      const lastTrigger = await AsyncStorage.getItem('last_alarm_trigger');
      
      // Check system health
      const systemHealth = await checkSystemHealth(scheduled, alarms, permissions);
      
      setDiagnosticData({
        scheduledNotifications: scheduled,
        storedAlarms: alarms,
        permissions: permissions,
        notificationListenerStatus: true, // Assume active if we can check
        lastAlarmTrigger: lastTrigger,
        systemHealth,
      });
    } catch (error) {
      console.error('Failed to load diagnostic data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const checkSystemHealth = async (
    notifications: any[],
    alarms: Alarm[],
    permissions: any
  ) => {
    const enabledAlarms = alarms.filter(alarm => alarm.isEnabled);
    const alarmNotifications = notifications.filter(n => 
      n.content?.data?.alarmId && !n.content?.data?.isEndTime
    );

    return {
      alarmsConsistent: enabledAlarms.length > 0 ? alarmNotifications.length > 0 : true,
      notificationsValid: notifications.every(n => n.trigger && n.content),
      permissionsValid: permissions.notifications?.granted && permissions.wakeLock?.granted,
    };
  };

  // Settings Handlers
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  // Debug Tools
  const testImmediateAlarm = async () => {
    try {
      await NotificationService.scheduleAlarmNotification(
        'test_immediate',
        new Date(Date.now() + 3000), // 3 seconds from now
        'Test Alarm'
      );
      Alert.alert('Test Alarm Scheduled', 'Test alarm will trigger in 3 seconds');
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule test alarm');
      console.error('Test alarm error:', error);
    }
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Clear All Notifications',
      'This will cancel all scheduled alarms. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await Notifications.cancelAllScheduledNotificationsAsync();
              Alert.alert('Success', 'All notifications cleared');
              loadDiagnosticData();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const forceReinitialize = async () => {
    Alert.alert(
      'Force Re-initialize',
      'This will restart all alarm services. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-initialize',
          onPress: async () => {
            try {
              // Clear all notifications
              await Notifications.cancelAllScheduledNotificationsAsync();
              
              // Re-schedule all alarms
              const alarms = await StorageService.getAllAlarms();
              for (const alarm of alarms.filter((a: Alarm) => a.isEnabled)) {
                await AlarmScheduler.scheduleAlarm(alarm);
              }
              
              Alert.alert('Success', 'System re-initialized successfully');
              loadDiagnosticData();
            } catch (error) {
              Alert.alert('Error', 'Failed to re-initialize system');
              console.error('Re-initialize error:', error);
            }
          },
        },
      ]
    );
  };

  const exportLogs = async () => {
    try {
      const logs = {
        timestamp: new Date().toISOString(),
        settings,
        diagnosticData,
        systemInfo: {
          platform: 'mobile',
          version: '1.0.0',
        },
      };

      const logString = JSON.stringify(logs, null, 2);
      
      await Share.share({
        message: logString,
        title: 'AltRise Debug Logs',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs');
      console.error('Export logs error:', error);
    }
  };

  const clearStorageData = async () => {
    Alert.alert(
      'Clear Storage Data',
      'This will delete all alarm data. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All storage data cleared');
              loadDiagnosticData();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear storage');
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    title: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color="#666" style={styles.settingIcon} />
        <View>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e0e0e0', true: '#4CAF50' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );

  const renderPickerItem = (
    title: string,
    description: string,
    value: string,
    options: { label: string; value: string }[],
    onValueChange: (value: string) => void,
    icon: string
  ) => (
    <TouchableOpacity style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color="#666" style={styles.settingIcon} />
        <View>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
          <Text style={styles.settingValue}>{value}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderDebugItem = (
    title: string,
    description: string,
    onPress: () => void,
    icon: string,
    dangerous?: boolean
  ) => (
    <TouchableOpacity 
      style={[styles.debugItem, dangerous && styles.dangerousItem]} 
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons 
          name={icon as any} 
          size={24} 
          color={dangerous ? "#f44336" : "#2196F3"} 
          style={styles.settingIcon} 
        />
        <View>
          <Text style={[styles.settingTitle, dangerous && styles.dangerousText]}>
            {title}
          </Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const HealthIndicator = ({ status, label }: { status: boolean; label: string }) => (
    <View style={styles.healthItem}>
      <Ionicons 
        name={status ? "checkmark-circle" : "close-circle"} 
        size={20} 
        color={status ? "#4CAF50" : "#f44336"} 
      />
      <Text style={[styles.healthLabel, { color: status ? "#4CAF50" : "#f44336" }]}>
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity
          style={styles.debugToggle}
          onPress={() => setDebugMode(!debugMode)}
        >
          <Ionicons 
            name={debugMode ? "bug" : "bug-outline"} 
            size={24} 
            color={debugMode ? "#f44336" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Alarm Defaults */}
        {renderSection('Alarm Defaults', (
          <>
            {renderPickerItem(
              'Default Sound',
              'Sound used for new alarms',
              settings.defaultSound,
              [
                { label: 'Default Alarm', value: 'alarm_default' },
                { label: 'Gentle Alarm', value: 'alarm_gentle' },
              ],
              (value) => updateSetting('defaultSound', value),
              'volume-high'
            )}
            {renderSettingItem(
              'Default Vibration',
              'Vibrate for new alarms',
              settings.defaultVibration,
              (value) => updateSetting('defaultVibration', value),
              'phone-portrait'
            )}
            {renderPickerItem(
              'Snooze Duration',
              'Default snooze time',
              `${settings.defaultSnoozeDuration} minutes`,
              [
                { label: '5 minutes', value: '5' },
                { label: '10 minutes', value: '10' },
                { label: '15 minutes', value: '15' },
              ],
              (value) => updateSetting('defaultSnoozeDuration', parseInt(value)),
              'time'
            )}
            {renderPickerItem(
              'Default Puzzle',
              'Puzzle type for new alarms',
              settings.defaultPuzzleType,
              [
                { label: 'Math Problem', value: 'math' },
                { label: 'Pattern Match', value: 'pattern' },
                { label: 'None', value: 'none' },
              ],
              (value) => updateSetting('defaultPuzzleType', value as PuzzleType),
              'calculator'
            )}
          </>
        ))}

        {/* System Settings */}
        {renderSection('System', (
          <>
            {renderSettingItem(
              'Debug Logging',
              'Enable detailed logging',
              settings.debugLogging,
              (value) => updateSetting('debugLogging', value),
              'bug'
            )}
            {renderSettingItem(
              'Auto Cleanup',
              'Automatically clean old notifications',
              settings.autoCleanup,
              (value) => updateSetting('autoCleanup', value),
              'trash'
            )}
          </>
        ))}

        {/* Debug Tools */}
        {debugMode && (
          <>
            {/* System Health */}
            {renderSection('System Health', (
              <View style={styles.healthSection}>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={loadDiagnosticData}
                  disabled={refreshing}
                >
                  <Ionicons name="refresh" size={20} color="#2196F3" />
                  <Text style={styles.refreshText}>
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.healthGrid}>
                  <HealthIndicator 
                    status={diagnosticData.systemHealth.alarmsConsistent}
                    label="Alarms Consistent"
                  />
                  <HealthIndicator 
                    status={diagnosticData.systemHealth.notificationsValid}
                    label="Notifications Valid"
                  />
                  <HealthIndicator 
                    status={diagnosticData.systemHealth.permissionsValid}
                    label="Permissions OK"
                  />
                  <HealthIndicator 
                    status={diagnosticData.notificationListenerStatus}
                    label="Listener Active"
                  />
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{diagnosticData.scheduledNotifications.length}</Text>
                    <Text style={styles.statLabel}>Scheduled</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{diagnosticData.storedAlarms.length}</Text>
                    <Text style={styles.statLabel}>Stored Alarms</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {diagnosticData.storedAlarms.filter((a: Alarm) => a.isEnabled).length}
                    </Text>
                    <Text style={styles.statLabel}>Enabled</Text>
                  </View>
                </View>

                {diagnosticData.lastAlarmTrigger && (
                  <View style={styles.lastTrigger}>
                    <Text style={styles.lastTriggerLabel}>Last Alarm Trigger:</Text>
                    <Text style={styles.lastTriggerValue}>
                      {new Date(diagnosticData.lastAlarmTrigger).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            ))}

            {/* Debug Actions */}
            {renderSection('Debug Tools', (
              <>
                {renderDebugItem(
                  'Test Immediate Alarm',
                  'Trigger a test alarm in 3 seconds',
                  testImmediateAlarm,
                  'alarm'
                )}
                {renderDebugItem(
                  'View Scheduled Notifications',
                  `${diagnosticData.scheduledNotifications.length} notifications`,
                  () => {
                    Alert.alert(
                      'Scheduled Notifications',
                      JSON.stringify(diagnosticData.scheduledNotifications.map(n => ({
                        id: n.identifier,
                        title: n.content.title,
                        trigger: n.trigger.type === 'date' ? 
                          new Date(n.trigger.value).toLocaleString() : 
                          'Unknown',
                      })), null, 2)
                    );
                  },
                  'list'
                )}
                {renderDebugItem(
                  'View Permission Status',
                  'Check all required permissions',
                  () => {
                    Alert.alert(
                      'Permission Status',
                      JSON.stringify(diagnosticData.permissions, null, 2)
                    );
                  },
                  'shield-checkmark'
                )}
                {renderDebugItem(
                  'Export Debug Logs',
                  'Share diagnostic data',
                  exportLogs,
                  'share'
                )}
                {renderDebugItem(
                  'Force Re-initialize',
                  'Restart all alarm services',
                  forceReinitialize,
                  'refresh-circle',
                  true
                )}
                {renderDebugItem(
                  'Clear All Notifications',
                  'Cancel all scheduled alarms',
                  clearAllNotifications,
                  'notifications-off',
                  true
                )}
                {renderDebugItem(
                  'Clear Storage Data',
                  'Delete all alarm data',
                  clearStorageData,
                  'trash',
                  true
                )}
              </>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  debugToggle: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    marginHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  settingValue: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 2,
  },
  debugItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dangerousItem: {
    backgroundColor: '#fff5f5',
  },
  dangerousText: {
    color: '#f44336',
  },
  healthSection: {
    padding: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginBottom: 15,
  },
  refreshText: {
    marginLeft: 5,
    color: '#2196F3',
    fontWeight: '500',
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
  },
  healthLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  lastTrigger: {
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  lastTriggerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  lastTriggerValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
});

export default SettingsScreen;
