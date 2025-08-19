import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import AddAlarmScreen from './src/screens/AddAlarmScreen';
import EditAlarmScreen from './src/screens/EditAlarmScreen';

// Import services
import { AlarmScheduler } from './src/services/AlarmScheduler';
import { PermissionService } from './src/services/PermissionService';

// Create stack navigator
const Stack = createStackNavigator();

// Main App Component
const App: React.FC = () => {
  const appState = useRef(AppState.currentState);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Initialize alarm system
    initializeAlarmSystem();

    // Set up notification listeners
    setupNotificationListeners();

    // Handle app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Cleanup
      subscription?.remove();
      cleanupNotificationListeners();
    };
  }, []);

  const cleanupNotificationListeners = () => {
    console.log('🧹 Cleaning up notification listeners...');
    
    if (notificationListener.current) {
      Notifications.removeNotificationSubscription(notificationListener.current);
      notificationListener.current = null;
    }
    if (responseListener.current) {
      Notifications.removeNotificationSubscription(responseListener.current);
      responseListener.current = null;
    }
    
    console.log('✅ Notification listeners cleaned up');
  };

  const initializeAlarmSystem = async () => {
    try {
      console.log('🚀 Initializing AltRise alarm system...');
      
      // Request notification permissions first
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      console.log('📋 Current notification permission:', existingStatus);
      
      if (existingStatus !== 'granted') {
        console.log('📱 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
          android: {
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          },
        });
        finalStatus = status;
        console.log('📋 New notification permission:', finalStatus);
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Notification permissions are required for alarms to work. Please enable them in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                // This will be handled by the PermissionService
                console.log('🔧 User chose to open settings');
              }
            }
          ]
        );
        // Continue initialization even without permissions for now
        console.log('⚠️ Continuing without notification permissions');
      } else {
        console.log('✅ Notification permissions granted');
      }
      
      // Check and request other permissions
      const permissionResult = await PermissionService.checkAllPermissions();
      console.log('📋 All permission status:', permissionResult);

      // Initialize the alarm scheduler
      await AlarmScheduler.initialize();
      
      console.log('✅ AltRise alarm system initialized successfully');
      
      // Import debug utilities in development
      if (__DEV__) {
        try {
          const debugUtils = await import('./src/utils/NotificationDebugger');
          console.log('🔧 Debug utilities loaded - use global functions for testing');
        } catch (error) {
          console.warn('⚠️ Could not load debug utilities:', error);
        }
      }
      
      // Log helpful debug info
      console.log('🔍 Debug: You can test notifications with:');
      console.log('• testNotifications() - Test immediate notification');
      console.log('• testScheduled(10) - Test scheduled in 10 seconds');
      console.log('• refreshAlarms() - Force refresh scheduling');
      console.log('• debugAlarms() - Run full diagnostics');
      console.log('• quickDebug() - Run comprehensive test session');
      
    } catch (error) {
      console.error('❌ Error initializing alarm system:', error);
      Alert.alert(
        'Initialization Error',
        'There was a problem setting up the alarm system. Please restart the app.',
        [{ text: 'OK' }]
      );
    }
  };

  const setupNotificationListeners = () => {
    console.log('🔧 Setting up notification listeners...');
    
    // Clean up any existing listeners first
    cleanupNotificationListeners();
    
    // Listen for notifications that come in while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received in foreground:', notification.request.identifier);
      console.log('📱 Notification content:', notification.request.content.title);
      console.log('📊 Notification data:', JSON.stringify(notification.request.content.data, null, 2));
      handleNotificationReceived(notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification response received:', response.notification.request.identifier);
      console.log('📊 Response data:', JSON.stringify(response.notification.request.content.data, null, 2));
      handleNotificationResponse(response);
    });
    
    console.log('✅ Notification listeners set up successfully');
  };

    const handleNotificationReceived = (notification: Notifications.Notification) => {
    const { data } = notification.request.content;
    const now = new Date();
    
    console.log('🔔 ===============================================');
    console.log('🔔 NOTIFICATION RECEIVED IN FOREGROUND');
    console.log('🔔 ===============================================');
    console.log(`🔔 Notification ID: ${notification.request.identifier}`);
    console.log(`🔔 Title: ${notification.request.content.title}`);
    console.log(`🔔 Body: ${notification.request.content.body}`);
    console.log(`🔔 Current Time: ${now.toLocaleString()}`);
    console.log(`🔔 Received At: ${now.toISOString()}`);
    console.log('🔔 Notification Data:', JSON.stringify(data, null, 2));
    
    if (data?.alarmId && typeof data.alarmId === 'string') {
      console.log(`⏰ ALARM ${data.alarmId} TRIGGERED at ${now.toLocaleTimeString()}`);
      
      // Log timing information
      if (data.expectedTriggerTime && typeof data.expectedTriggerTime === 'string') {
        const expectedTime = new Date(data.expectedTriggerTime);
        const timeDiff = now.getTime() - expectedTime.getTime();
        console.log(`⏱️ Expected trigger: ${expectedTime.toLocaleString()}`);
        console.log(`⏱️ Actual trigger: ${now.toLocaleString()}`);
        console.log(`⏱️ Time difference: ${timeDiff}ms (${Math.round(timeDiff/1000)}s)`);
      }
      
      if (data.isEndTime) {
        console.log('🔚 ALARM END TIME REACHED');
        Alert.alert(
          'Alarm Ended',
          `Your alarm period has ended.

Time: ${now.toLocaleTimeString()}`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('🚨 MAIN ALARM IS RINGING!');
        console.log(`📱 Showing alarm notification for: ${data.alarmLabel || 'Unnamed Alarm'}`);
        
        // Handle the triggered notification (reschedule if needed)
        AlarmScheduler.handleNotificationTriggered(data.alarmId as string, false);
        
        // Show alarm alert
        Alert.alert(
          '⏰ ALARM RINGING!',
          `${data.alarmLabel || 'Alarm'} is ringing!

Started: ${now.toLocaleTimeString()}
Original Time: ${data.originalTime || 'Unknown'}`,
          [
            { 
              text: 'Dismiss', 
              style: 'cancel',
              onPress: () => {
                console.log(`✅ ALARM ${data.alarmId} DISMISSED by user at ${new Date().toLocaleTimeString()}`);
              }
            },
            { 
              text: 'Snooze (5 min)', 
              onPress: () => {
                console.log(`😴 ALARM ${data.alarmId} SNOOZED by user at ${new Date().toLocaleTimeString()}`);
                handleSnooze(data.alarmId as string);
              }
            }
          ]
        );
        
        console.log(`📱 ALARM ALERT DISPLAYED for alarm ${data.alarmId}`);
      }
    } else {
      console.log('⚠️ Notification received but no valid alarm data found');
      console.log('⚠️ This might be a test notification or system notification');
    }
    
    console.log('🔔 ===============================================');
  };

const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
  const { data } = response.notification.request.content;
  const now = new Date();
  
  console.log('👆 ===============================================');
  console.log('👆 NOTIFICATION RESPONSE (USER TAPPED)');
  console.log('👆 ===============================================');
  console.log(`👆 Notification ID: ${response.notification.request.identifier}`);
  console.log(`👆 Action Type: ${response.actionIdentifier}`);
  console.log(`👆 User Input: ${response.userText || 'None'}`);
  console.log(`👆 Response Time: ${now.toLocaleString()}`);
  console.log('👆 Response Data:', JSON.stringify(data, null, 2));
  
  if (data?.alarmId && typeof data.alarmId === 'string') {
    console.log(`👆 User interacted with alarm ${data.alarmId}`);
    
    if (!data.isEndTime) {
      console.log('� User tapped MAIN ALARM notification');
      
      // Handle the triggered notification (reschedule if needed)
      AlarmScheduler.handleNotificationTriggered(data.alarmId as string, false);
      
      // Show alarm alert when user taps notification
      Alert.alert(
        '⏰ ALARM ACTIVATED',
        `${data.alarmLabel || 'Alarm'} was triggered from notification.\n\nTapped at: ${now.toLocaleTimeString()}\nOriginal Time: ${data.originalTime || 'Unknown'}`,
        [
          { 
            text: 'Dismiss', 
            style: 'cancel',
            onPress: () => {
              console.log(`✅ ALARM ${data.alarmId} DISMISSED from notification tap at ${new Date().toLocaleTimeString()}`);
            }
          },
          { 
            text: 'Snooze (5 min)', 
            onPress: () => {
              console.log(`😴 ALARM ${data.alarmId} SNOOZED from notification tap at ${new Date().toLocaleTimeString()}`);
              handleSnooze(data.alarmId as string);
            }
          }
        ]
      );
      
      console.log(`📱 ALARM ALERT DISPLAYED from notification tap: ${data.alarmId}`);
    } else {
      console.log('👆 User tapped END TIME notification - showing info only');
      Alert.alert(
        'Alarm Information',
        `End time notification for: ${data.alarmLabel || 'Alarm'}`,
        [{ text: 'OK' }]
      );
    }
  } else {
    console.log('⚠️ User tapped notification but no valid alarm data found');
  }
  
  console.log('👆 ===============================================');
};  const handleSnooze = async (alarmId: string) => {
    try {
      const now = new Date();
      const snoozeTime = new Date();
      snoozeTime.setMinutes(snoozeTime.getMinutes() + 5);
      
      console.log(`😴 ===============================================`);
      console.log(`😴 SNOOZING ALARM ${alarmId}`);
      console.log(`😴 ===============================================`);
      console.log(`😴 Snooze requested at: ${now.toLocaleString()}`);
      console.log(`😴 Will ring again at: ${snoozeTime.toLocaleString()}`);
      console.log(`😴 Snooze duration: 5 minutes`);
      
      // Schedule a snooze notification 5 minutes from now
      const snoozeNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Snooze Alarm',
          body: 'Your snoozed alarm is ringing again!',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: {
            alarmId,
            isSnooze: true,
            alarmLabel: 'Snoozed Alarm',
            originalSnoozeTime: now.toISOString(),
            snoozeEndTime: snoozeTime.toISOString(),
          },
        },
        trigger: {
          type: 'date' as any,
          date: snoozeTime,
        },
      });
      
      console.log(`✅ SNOOZE SCHEDULED SUCCESSFULLY!`);
      console.log(`   Snooze notification ID: ${snoozeNotificationId}`);
      console.log(`   Will trigger at: ${snoozeTime.toLocaleString()}`);
      
      Alert.alert(
        'Alarm Snoozed',
        `Alarm will ring again at ${snoozeTime.toLocaleTimeString()}\n\nSnoozed for 5 minutes`,
        [{ 
          text: 'OK',
          onPress: () => {
            console.log(`😴 User acknowledged snooze for alarm ${alarmId}`);
          }
        }]
      );
      
      console.log(`😴 ===============================================`);
      
    } catch (error) {
      console.error('❌ Error snoozing alarm:', error);
      Alert.alert('Snooze Error', 'Failed to snooze alarm. Please try again.');
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log(`📱 App state change: ${appState.current} -> ${nextAppState}`);
    
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('📱 App has come to the foreground - refreshing alarm system');
      
      // Re-setup notification listeners (they may have been lost)
      setupNotificationListeners();
      
      // Refresh alarm scheduling when app becomes active
      refreshAlarmScheduling();
    }

    appState.current = nextAppState;
  };

  const refreshAlarmScheduling = async () => {
    try {
      console.log('🔄 Refreshing alarm scheduling after app state change...');
      
      // Force refresh to ensure everything is properly scheduled
      await AlarmScheduler.forceRefreshScheduling();
      
      // Get diagnostic info
      await AlarmScheduler.getDiagnosticInfo();
      
      console.log('✅ Alarm scheduling refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing alarm scheduling:', error);
      Alert.alert(
        'Scheduling Error',
        'There was a problem refreshing alarm schedules. Some alarms may not work properly.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#6366f1',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'AltRise' }}
          />
          <Stack.Screen 
            name="AddAlarm" 
            component={AddAlarmScreen} 
            options={{ title: 'Add Alarm' }}
          />
          <Stack.Screen 
            name="EditAlarm" 
            component={EditAlarmScreen} 
            options={{ title: 'Edit Alarm' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
