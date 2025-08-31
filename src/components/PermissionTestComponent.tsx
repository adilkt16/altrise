// Test component for permission system
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { PermissionService, PermissionType, AllPermissionsStatus } from '../services/PermissionService';
import { 
  hasCriticalPermissions, 
  hasAllPermissions, 
  getMissingPermissions,
  getPermanentlyDeniedPermissions,
  syncPermissionsToSettings,
  logPermissionStatus,
  getPermissionSummary,
} from '../utils/permissionUtils';

const PermissionTestComponent: React.FC = () => {
  const [permissionStatus, setPermissionStatus] = useState<AllPermissionsStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      setLoading(true);
      const status = await PermissionService.checkAllPermissions();
      setPermissionStatus(status);
      await logPermissionStatus();
    } catch (error) {
      Alert.alert('Error', 'Failed to check permissions');
    } finally {
      setLoading(false);
    }
  };

  const requestNotifications = async () => {
    try {
      setLoading(true);
      await PermissionService.requestNotificationPermissions();
      await checkPermissions();
    } catch (error) {
      Alert.alert('Error', 'Failed to request notification permissions');
    } finally {
      setLoading(false);
    }
  };

  const requestDisplayOverApps = async () => {
    try {
      setLoading(true);
      await PermissionService.requestDisplayOverOtherAppsPermission();
      Alert.alert(
        'Permission Requested',
        'Please enable "Display over other apps" in the settings and return to the app.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to request display over apps permission');
    } finally {
      setLoading(false);
    }
  };

  const requestExactAlarms = async () => {
    try {
      setLoading(true);
      await PermissionService.requestExactAlarmPermission();
      Alert.alert(
        'Permission Requested',
        'Please enable "Alarms & reminders" in the settings and return to the app.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to request exact alarm permission');
    } finally {
      setLoading(false);
    }
  };

  const requestAllPermissions = async () => {
    try {
      setLoading(true);
      await PermissionService.requestAllMissingPermissions();
      await checkPermissions();
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setLoading(false);
    }
  };

  const openNotificationSettings = async () => {
    try {
      await PermissionService.openNotificationSettings();
    } catch (error) {
      Alert.alert('Error', 'Failed to open notification settings');
    }
  };

  const openDisplayOverAppsSettings = async () => {
    try {
      await PermissionService.openDisplayOverOtherAppsSettings();
    } catch (error) {
      Alert.alert('Error', 'Failed to open display over apps settings');
    }
  };

  const showPermissionSummary = async () => {
    try {
      const summary = await getPermissionSummary();
      Alert.alert('Permission Summary', summary);
    } catch (error) {
      Alert.alert('Error', 'Failed to get permission summary');
    }
  };

  const syncToSettings = async () => {
    try {
      await syncPermissionsToSettings();
      Alert.alert('Success', 'Permissions synced to settings');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync permissions to settings');
    }
  };

  const testUtilityFunctions = async () => {
    try {
      const critical = await hasCriticalPermissions();
      const all = await hasAllPermissions();
      const missing = await getMissingPermissions();
      const denied = await getPermanentlyDeniedPermissions();

      const message = [
        `Critical Permissions: ${critical ? 'Yes' : 'No'}`,
        `All Permissions: ${all ? 'Yes' : 'No'}`,
        `Missing: ${missing.length} permissions`,
        `Permanently Denied: ${denied.length} permissions`,
      ].join('\n');

      Alert.alert('Utility Test Results', message);
    } catch (error) {
      Alert.alert('Error', 'Failed to test utility functions');
    }
  };

  const renderPermissionStatus = (title: string, status: any) => (
    <View style={styles.permissionItem}>
      <Text style={styles.permissionTitle}>{title}</Text>
      <Text style={[styles.permissionState, status.granted && styles.granted]}>
        {status.state}
      </Text>
      <Text style={styles.permissionMessage}>{status.message}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Permission Test Component</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        {loading && <Text style={styles.loading}>Loading...</Text>}
        
        {permissionStatus && (
          <>
            {renderPermissionStatus('Notifications', permissionStatus.notifications)}
            {renderPermissionStatus('Display Over Apps', permissionStatus.displayOverOtherApps)}
            {renderPermissionStatus('Exact Alarms', permissionStatus.exactAlarm)}
            {renderPermissionStatus('Wake Lock', permissionStatus.wakeLock)}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Critical Granted:</Text>
              <Text style={[styles.summaryValue, permissionStatus.criticalGranted && styles.granted]}>
                {permissionStatus.criticalGranted ? 'Yes' : 'No'}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>All Granted:</Text>
              <Text style={[styles.summaryValue, permissionStatus.allGranted && styles.granted]}>
                {permissionStatus.allGranted ? 'Yes' : 'No'}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Individual Requests</Text>
        <TouchableOpacity style={styles.button} onPress={requestNotifications}>
          <Text style={styles.buttonText}>Request Notifications</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={requestDisplayOverApps}>
          <Text style={styles.buttonText}>Request Display Over Apps</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={requestExactAlarms}>
          <Text style={styles.buttonText}>Request Exact Alarms</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={requestAllPermissions}>
          <Text style={[styles.buttonText, styles.primaryButtonText]}>Request All Missing</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Open Settings</Text>
        <TouchableOpacity style={styles.button} onPress={openNotificationSettings}>
          <Text style={styles.buttonText}>Open Notification Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={openDisplayOverAppsSettings}>
          <Text style={styles.buttonText}>Open Display Over Apps Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Utilities</Text>
        <TouchableOpacity style={styles.button} onPress={checkPermissions}>
          <Text style={styles.buttonText}>Refresh Status</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={showPermissionSummary}>
          <Text style={styles.buttonText}>Show Summary</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={syncToSettings}>
          <Text style={styles.buttonText}>Sync to Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testUtilityFunctions}>
          <Text style={styles.buttonText}>Test Utilities</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  loading: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  permissionState: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
    marginBottom: 2,
  },
  granted: {
    color: '#059669',
  },
  permissionMessage: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  button: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
});

export default PermissionTestComponent;
