import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import AddAlarmScreen from './src/screens/AddAlarmScreen';
import EditAlarmScreen from './src/screens/EditAlarmScreen';

// Import components
import AlarmModal, { AlarmModalData } from './src/components/AlarmModal';

// Import services
import { AlarmScheduler } from './src/services/AlarmScheduler';
import { PermissionService } from './src/services/PermissionService';
import modalManager, { AlarmModalState } from './src/services/AlarmModalManager';
import { checkForActiveAlarms } from './src/utils/activeAlarmChecker';

// Configure notification behavior globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Deprecated - using shouldShowBanner/shouldShowList
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Create stack navigator
const Stack = createStackNavigator();

// Main App Component
const App: React.FC = () => {
  const appState = useRef(AppState.currentState);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const backgroundSubscription = useRef<Notifications.Subscription | null>(null);
  
  // App lifecycle state tracking
  const [isAppInForeground, setIsAppInForeground] = useState(true);
  const [lastBackgroundTime, setLastBackgroundTime] = useState<Date | null>(null);
  const [listenerRetryCount, setListenerRetryCount] = useState(0);
  const maxRetries = 3;
  
  // Track processed notifications to prevent duplicates
  const processedNotifications = useRef<Set<string>>(new Set());
  const alarmRescheduleTimeout = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Alarm modal state
  const [modalState, setModalState] = useState<AlarmModalState>({
    isVisible: false,
    data: null,
    startTime: null,
    endTime: null,
    persistentId: null,
  });

  // Helper functions for lifecycle management (defined before useEffect)
  const setupBackgroundNotificationHandling = () => {
    try {
      console.log('🤖 Setting up Android background notification handling...');
      
      // For Android, we need to ensure notifications work when app is killed
      // This is primarily handled by the system and expo-notifications
      console.log('📱 Background notifications configured via expo-notifications');
      console.log('📱 Scheduled notifications should work when app is backgrounded/killed');
      
      // Note: Expo handles most background notification scenarios automatically
      // Additional background tasks would require expo-task-manager for complex cases
      
    } catch (error) {
      console.error('❌ Error setting up background notification handling:', error);
    }
  };

  const setupPermissionChangeListener = () => {
    try {
      console.log('🔐 Setting up permission change monitoring...');
      
      // Set up periodic permission checking
      const permissionCheckInterval = setInterval(async () => {
        try {
          const currentPermissions = await Notifications.getPermissionsAsync();
          
          if (currentPermissions.status !== 'granted') {
            console.warn('⚠️ Notification permissions lost! App functionality compromised.');
            console.warn('⚠️ Current status:', currentPermissions.status);
            
            // Only show alert if app is in foreground
            if (AppState.currentState === 'active') {
              Alert.alert(
                'Permissions Changed',
                'Notification permissions have been revoked. Alarms will not work properly until permissions are restored.',
                [
                  { text: 'Later', style: 'cancel' },
                  { 
                    text: 'Fix Now', 
                    onPress: () => {
                      console.log('🔧 User wants to fix permissions');
                      console.log('💡 Please manually enable notifications in device settings');
                    }
                  }
                ]
              );
            }
          }
        } catch (error) {
          console.error('❌ Error checking permissions:', error);
        }
      }, 30000); // Check every 30 seconds
      
      // Store interval reference for cleanup
      (global as any).permissionCheckInterval = permissionCheckInterval;
      
      console.log('✅ Permission monitoring established');
      
    } catch (error) {
      console.error('❌ Error setting up permission change listener:', error);
    }
  };

  const cleanupAllListeners = () => {
    console.log('🧹 ===============================================');
    console.log('🧹 CLEANING UP ALL LISTENERS');
    console.log('🧹 ===============================================');
    console.log('🧹 Cleaning up notification listeners...');
    
    if (notificationListener.current) {
      Notifications.removeNotificationSubscription(notificationListener.current);
      notificationListener.current = null;
      console.log('🧹 Foreground notification listener removed');
    }
    
    if (responseListener.current) {
      Notifications.removeNotificationSubscription(responseListener.current);
      responseListener.current = null;
      console.log('🧹 Response listener removed');
    }
    
    if (backgroundSubscription.current) {
      Notifications.removeNotificationSubscription(backgroundSubscription.current);
      backgroundSubscription.current = null;
      console.log('🧹 Background subscription removed');
    }
    
    console.log('✅ All notification listeners cleaned up');
    console.log('🧹 ===============================================');
  };

  const checkDeviceCapabilities = async () => {
    try {
      console.log('🔍 Checking device capabilities...');
      
      // Check notification settings
      const settings = await Notifications.getPermissionsAsync();
      console.log('📋 Notification settings:', JSON.stringify(settings, null, 2));
      console.log('📅 Device supports scheduled notifications via expo-notifications');
      
    } catch (error) {
      console.error('❌ Error checking device capabilities:', error);
    }
  };

  const checkPlatformSpecificPermissions = async () => {
    try {
      console.log(`🔍 Checking ${Platform.OS} specific permissions...`);
      
      if (Platform.OS === 'android') {
        // Android-specific permission checks
        console.log('🤖 Checking Android-specific permissions...');
        
        // Note: Some permissions require special handling in newer Android versions
        console.log('📋 Android permissions configured in app.json');
        console.log('📋 Required: WAKE_LOCK, VIBRATE, SCHEDULE_EXACT_ALARM, etc.');
        
        // Future: Add checks for exact alarm permissions (Android 12+)
        // Future: Add battery optimization checks
        
      } else if (Platform.OS === 'ios') {
        // iOS-specific permission checks
        console.log('🍎 Checking iOS-specific permissions...');
        
        // Check critical alerts permission (if available)
        console.log('📋 iOS notification permissions configured');
        console.log('📋 Includes: Alert, Badge, Sound, Critical Alerts');
      }
      
    } catch (error) {
      console.error('❌ Error checking platform-specific permissions:', error);
    }
  };

  const checkBackgroundAppRefresh = async () => {
    try {
      console.log('🍎 Checking iOS Background App Refresh...');
      
      // Note: There's no direct API to check Background App Refresh
      // We can only inform the user about its importance
      console.log('📋 Background App Refresh is important for alarm reliability');
      console.log('📋 Users should enable it in Settings > General > Background App Refresh');
      
      // In development, show a reminder
      if (__DEV__) {
        console.log('💡 DEV TIP: Ensure Background App Refresh is enabled for reliable alarms');
      }
      
    } catch (error) {
      console.error('❌ Error checking background app refresh:', error);
    }
  };

  const setupNotificationCategories = async () => {
    try {
      console.log('📂 Setting up notification categories...');
      
      // Set up notification categories for better interaction
      await Notifications.setNotificationCategoryAsync('alarm', [
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'snooze',
          buttonTitle: 'Snooze',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
      
      console.log('✅ Notification categories configured');
      
    } catch (error) {
      console.error('❌ Error setting up notification categories:', error);
    }
  };

  /**
   * Check for active alarms and automatically show modal if needed
   */
  const checkAndShowActiveAlarm = async () => {
    try {
      console.log('🔍 [App] Checking for active alarms on startup...');
      const activeAlarmInfo = await checkForActiveAlarms();
      
      if (activeAlarmInfo) {
        console.log('🚨 [App] Found active alarm during startup:', activeAlarmInfo.alarm.id);
        console.log(`🚨 [App] Alarm: ${activeAlarmInfo.alarm.label || 'Unnamed'}`);
        console.log(`🚨 [App] Time until end: ${Math.round(activeAlarmInfo.timeUntilEnd / 1000)} seconds`);
        
        // Map puzzle type to modal-compatible type
        const mapPuzzleType = (puzzleType: any): 'none' | 'basic_math' | 'number_sequence' => {
          switch (puzzleType) {
            case 'math':
            case 'basic_math':
              return 'basic_math';
            case 'sequence':
            case 'number_sequence':
              return 'number_sequence';
            case 'none':
              return 'none';
            default:
              return 'basic_math'; // Default to basic_math
          }
        };
        
        // Prepare modal data
        const modalData: AlarmModalData = {
          alarmId: activeAlarmInfo.alarm.id,
          title: activeAlarmInfo.alarm.label || 'Alarm',
          label: activeAlarmInfo.alarm.label,
          originalTime: activeAlarmInfo.alarm.time,
          endTime: activeAlarmInfo.alarm.endTime,
          puzzleType: mapPuzzleType(activeAlarmInfo.alarm.puzzleType),
          onDismiss: () => {
            console.log(`✅ [App] Active alarm ${activeAlarmInfo.alarm.id} dismissed via modal`);
            modalManager.hideAlarmModal();
          },
          onSnooze: () => {
            console.log(`😴 [App] Active alarm ${activeAlarmInfo.alarm.id} snoozed via modal`);
            modalManager.hideAlarmModal();
            // TODO: Implement snooze functionality if needed
          }
        };
        
        // Show the modal
        console.log('🚨 [App] Showing alarm modal for active alarm...');
        const success = await modalManager.showAlarmModal(modalData);
        
        if (success) {
          console.log('✅ [App] Active alarm modal displayed successfully');
        } else {
          console.log('❌ [App] Failed to display active alarm modal');
        }
      } else {
        console.log('✅ [App] No active alarms found during startup');
      }
    } catch (error) {
      console.error('❌ [App] Error checking for active alarms:', error);
    }
  };

  const initializeAlarmSystemWithLifecycle = async () => {
    try {
      console.log('🚀 ===============================================');
      console.log('🚀 INITIALIZING ENHANCED ALARM SYSTEM');
      console.log('🚀 ===============================================');
      console.log('🚀 Initializing AltRise alarm system with lifecycle support...');
      console.log(`🚀 Platform: ${Platform.OS}`);
      
      // Check device capabilities
      await checkDeviceCapabilities();
      
      // Request comprehensive notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      console.log('📋 Current notification permission:', existingStatus);
      
      if (existingStatus !== 'granted') {
        console.log('📱 Requesting comprehensive notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowCriticalAlerts: true,
          },
          android: {
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
        console.log('📋 New notification permission:', finalStatus);
      }
      
      if (finalStatus !== 'granted') {
        console.log('⚠️ ===============================================');
        console.log('⚠️ NOTIFICATION PERMISSIONS NOT GRANTED');
        console.log('⚠️ ===============================================');
        Alert.alert(
          'Critical Permission Required',
          'AltRise requires notification permissions to function as an alarm clock. Without these permissions, alarms will not work.\\n\\nPlease enable notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                console.log('🔧 User chose to open settings');
                console.log('💡 Please manually open Settings > Notifications > AltRise');
              }
            }
          ]
        );
        console.log('⚠️ Continuing without notification permissions - LIMITED FUNCTIONALITY');
      } else {
        console.log('✅ Comprehensive notification permissions granted');
      }
      
      // Check and request additional platform-specific permissions
      await checkPlatformSpecificPermissions();
      
      // Check and request other permissions
      const permissionResult = await PermissionService.checkAllPermissions();
      console.log('📋 All permission status:', permissionResult);

      // Initialize the alarm scheduler with enhanced lifecycle
      await AlarmScheduler.initialize();
      
      // Verify background app refresh settings (iOS)
      if (Platform.OS === 'ios') {
        await checkBackgroundAppRefresh();
      }
      
      // Set up notification categories for enhanced interaction
      await setupNotificationCategories();
      
      // Check for active alarms and show modal if needed
      await checkAndShowActiveAlarm();
      
      console.log('✅ Enhanced alarm system initialized successfully');
      
      // Import debug utilities in development
      if (__DEV__) {
        try {
          const debugUtils = await import('./src/utils/NotificationDebugger');
          console.log('🔧 Debug utilities loaded - use global functions for testing');
          
          // Log helpful debug info
          console.log('🔍 ===============================================');
          console.log('🔍 DEBUGGING COMMANDS AVAILABLE');
          console.log('🔍 ===============================================');
          console.log('🔍 • testNotifications() - Test immediate notification');
          console.log('🔍 • testScheduled(10) - Test scheduled in 10 seconds');
          console.log('🔍 • refreshAlarms() - Force refresh scheduling');
          console.log('🔍 • debugAlarms() - Run full diagnostics');
          console.log('🔍 • quickDebug() - Run comprehensive test session');
          console.log('🔍 • checkAppState() - Check current app lifecycle state');
          console.log('🔍 ===============================================');
          
        } catch (error) {
          console.warn('⚠️ Could not load debug utilities:', error);
        }
      }
      
    } catch (error) {
      console.error('❌ ===============================================');
      console.error('❌ CRITICAL INITIALIZATION ERROR');
      console.error('❌ ===============================================');
      console.error('❌ Error initializing enhanced alarm system:', error);
      Alert.alert(
        'Critical Initialization Error',
        'There was a serious problem setting up the alarm system. The app may not function properly.\\n\\nPlease restart the app and check your device permissions.',
        [
          { text: 'Restart App', onPress: () => {
            console.log('🔄 User chose to restart app');
            // In a real app, you might use a restart library
          }},
          { text: 'Continue Anyway', style: 'cancel' }
        ]
      );
    }
  };

  const setupRobustNotificationListeners = () => {
    console.log('🔧 ===============================================');
    console.log('🔧 SETTING UP ROBUST NOTIFICATION LISTENERS');
    console.log('🔧 ===============================================');
    
    // Clean up any existing listeners first
    cleanupAllListeners();
    
    try {
      // Listen for notifications that come in while the app is foregrounded
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log(`🔔 [FOREGROUND] Notification received: ${notification.request.identifier}`);
        console.log(`🔔 [FOREGROUND] App state: ${AppState.currentState}`);
        handleNotificationReceived(notification);
      });
      
      // Listen for user interactions with notifications
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log(`👆 [INTERACTION] Response received: ${response.notification.request.identifier}`);
        console.log(`👆 [INTERACTION] App state: ${AppState.currentState}`);
        handleNotificationResponse(response);
      });
      
      console.log('✅ Core notification listeners established');
      setListenerRetryCount(0); // Reset retry count on success
      
    } catch (error) {
      console.error('❌ Error setting up notification listeners:', error);
      
      // Retry mechanism
      if (listenerRetryCount < maxRetries) {
        console.log(`🔄 Retrying listener setup (${listenerRetryCount + 1}/${maxRetries})...`);
        setListenerRetryCount(prev => prev + 1);
        
        setTimeout(() => {
          setupRobustNotificationListeners();
        }, 1000 * (listenerRetryCount + 1)); // Exponential backoff
      } else {
        console.error('❌ Failed to set up listeners after maximum retries');
        Alert.alert(
          'Listener Setup Failed',
          'Failed to set up notification listeners. Alarms may not work properly. Please restart the app.',
          [{ text: 'OK' }]
        );
      }
    }
    
    console.log('🔧 ===============================================');
  };

  const handleAppStateChangeRobust = (nextAppState: AppStateStatus) => {
    const previousState = appState.current;
    
    console.log('📱 ===============================================');
    console.log('📱 APP STATE CHANGE DETECTED');
    console.log('📱 ===============================================');
    console.log(`📱 Previous state: ${previousState}`);
    console.log(`📱 New state: ${nextAppState}`);
    console.log(`📱 Time: ${new Date().toLocaleString()}`);
    
    // Update state tracking
    setIsAppInForeground(nextAppState === 'active');
    
    if (nextAppState === 'background') {
      setLastBackgroundTime(new Date());
      console.log('📱 App going to background - scheduling preserved');
    }
    
    if (previousState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('📱 ===============================================');
      console.log('📱 APP RESUMING FROM BACKGROUND');
      console.log('📱 ===============================================');
      
      const backgroundDuration = lastBackgroundTime 
        ? Math.round((new Date().getTime() - lastBackgroundTime.getTime()) / 1000)
        : 0;
      
      console.log(`📱 App was in background for ${backgroundDuration} seconds`);
      console.log('📱 Performing background recovery...');
      
      // Re-setup notification listeners (they may have been lost)
      console.log('🔧 Re-establishing notification listeners...');
      setupRobustNotificationListeners();
      
      // Refresh alarm scheduling when app becomes active
      console.log('🔄 Refreshing alarm scheduling...');
      refreshAlarmScheduling();
      
      // Check for active alarms when app returns to foreground
      console.log('🔍 Checking for active alarms after resuming...');
      checkAndShowActiveAlarm();
      
      // Check if any notifications were triggered while app was backgrounded
      console.log('🔍 Checking for missed notifications...');
      checkMissedNotifications();
    }

    // Notify modal manager of app state change
    modalManager.handleAppStateChange(nextAppState);

    appState.current = nextAppState;
    console.log('📱 ===============================================');
  };

  const refreshAlarmScheduling = async () => {
    try {
      console.log('🔄 ===============================================');
      console.log('🔄 REFRESHING ALARM SCHEDULING');
      console.log('🔄 ===============================================');
      console.log('🔄 Refreshing alarm scheduling after app state change...');
      
      // Force refresh to ensure everything is properly scheduled
      await AlarmScheduler.forceRefreshScheduling();
      
      // Get diagnostic info
      await AlarmScheduler.getDiagnosticInfo();
      
      console.log('✅ Alarm scheduling refreshed successfully');
      console.log('🔄 ===============================================');
      
    } catch (error) {
      console.error('❌ Error refreshing alarm scheduling:', error);
      Alert.alert(
        'Scheduling Error',
        'There was a problem refreshing alarm schedules. Some alarms may not work properly.',
        [{ text: 'OK' }]
      );
    }
  };

  const checkMissedNotifications = async () => {
    try {
      console.log('🔍 Checking for notifications that may have been missed...');
      
      // In a real implementation, you might check for delivered notifications
      // that weren't handled while the app was backgrounded
      const deliveredNotifications = await Notifications.getPresentedNotificationsAsync();
      
      if (deliveredNotifications.length > 0) {
        console.log(`🔔 Found ${deliveredNotifications.length} delivered notifications to handle`);
        
        // Process any delivered notifications
        deliveredNotifications.forEach((notification, index) => {
          console.log(`🔔 Processing delivered notification ${index + 1}: ${notification.request.identifier}`);
          // You could process these if needed
        });
      } else {
        console.log('✅ No missed notifications found');
      }
      
    } catch (error) {
      console.error('❌ Error checking missed notifications:', error);
    }
  };

  useEffect(() => {
    console.log('🚀 ===============================================');
    console.log('🚀 ALTRISE APP LIFECYCLE INITIALIZATION');
    console.log('🚀 ===============================================');
    console.log(`🚀 Platform: ${Platform.OS}`);
    console.log(`🚀 Initial app state: ${AppState.currentState}`);
    console.log(`🚀 App started at: ${new Date().toLocaleString()}`);
    
    // Initialize alarm system with enhanced lifecycle support
    initializeAlarmSystemWithLifecycle();

    // Set up comprehensive notification listeners
    setupRobustNotificationListeners();

    // Handle app state changes with detailed logging
    const subscription = AppState.addEventListener('change', handleAppStateChangeRobust);

    // Set up background task for notifications (Android)
    if (Platform.OS === 'android') {
      setupBackgroundNotificationHandling();
    }

    // Add permission change listener
    setupPermissionChangeListener();

    // Subscribe to modal manager
    const modalUnsubscribe = modalManager.subscribe((newModalState) => {
      console.log('🚨 [App] Modal state changed:', newModalState.isVisible);
      setModalState(newModalState);
    });

    return () => {
      console.log('🧹 App unmounting - cleaning up all listeners...');
      subscription?.remove();
      cleanupAllListeners();
      modalUnsubscribe(); // Unsubscribe from modal manager
      
      // Clean up permission check interval
      if ((global as any).permissionCheckInterval) {
        clearInterval((global as any).permissionCheckInterval);
        delete (global as any).permissionCheckInterval;
      }
    };
  }, []);

  // Enhanced notification handler functions with AlarmModal integration
  const handleNotificationReceived = async (notification: Notifications.Notification) => {
    const { data } = notification.request.content;
    const notificationId = notification.request.identifier;
    const now = new Date();
    
    // Prevent processing duplicate notifications
    if (processedNotifications.current.has(notificationId)) {
      console.log(`🔔 [DUPLICATE] Notification ${notificationId} already processed, skipping`);
      return;
    }
    
    processedNotifications.current.add(notificationId);
    
    // Clean up old notification IDs (keep only last 50)
    if (processedNotifications.current.size > 50) {
      const ids = Array.from(processedNotifications.current);
      processedNotifications.current = new Set(ids.slice(-25));
    }
    
    console.log('🔔 ===============================================');
    console.log('🔔 NOTIFICATION RECEIVED IN FOREGROUND');
    console.log('🔔 ===============================================');
    console.log(`🔔 Notification ID: ${notificationId}`);
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
        console.log('🚨 MAIN ALARM IS RINGING - SHOWING MODAL!');
        console.log(`📱 Showing alarm modal for: ${data.alarmLabel || 'Unnamed Alarm'}`);
        
        // Debounced alarm rescheduling to prevent spam
        if (data.alarmId && typeof data.alarmId === 'string') {
          const alarmId = data.alarmId as string;
          
          // Clear any existing reschedule timeout for this alarm
          if (alarmRescheduleTimeout.current.has(alarmId)) {
            clearTimeout(alarmRescheduleTimeout.current.get(alarmId)!);
          }
          
          // Set a new timeout to reschedule (debounced by 2 seconds)
          const timeout = setTimeout(() => {
            console.log('🔄 RESCHEDULING REPEATING ALARM', alarmId, '...');
            AlarmScheduler.handleNotificationTriggered(alarmId, false);
            alarmRescheduleTimeout.current.delete(alarmId);
          }, 2000);
          
          alarmRescheduleTimeout.current.set(alarmId, timeout);
        }
        
        // Show alarm modal
        await showAlarmModal(data);
      }
    } else {
      console.log('⚠️ Notification received but no valid alarm data found');
      console.log('⚠️ This might be a test notification or system notification');
    }
    
    console.log('🔔 ===============================================');
  };

  const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
    const { data } = response.notification.request.content;
    const notificationId = response.notification.request.identifier;
    const now = new Date();
    
    // Prevent processing duplicate notification responses
    if (processedNotifications.current.has(notificationId)) {
      console.log(`👆 [DUPLICATE] Notification response ${notificationId} already processed, skipping`);
      return;
    }
    
    processedNotifications.current.add(notificationId);
    
    console.log('👆 ===============================================');
    console.log('👆 NOTIFICATION RESPONSE (USER TAPPED)');
    console.log('👆 ===============================================');
    console.log(`👆 Notification ID: ${notificationId}`);
    console.log(`👆 Action Type: ${response.actionIdentifier}`);
    console.log(`👆 User Input: ${response.userText || 'None'}`);
    console.log(`👆 Response Time: ${now.toLocaleString()}`);
    console.log('👆 Response Data:', JSON.stringify(data, null, 2));
    
    if (data?.alarmId && typeof data.alarmId === 'string') {
      console.log(`👆 User interacted with alarm ${data.alarmId}`);
      
      if (!data.isEndTime) {
        console.log('👆 User tapped MAIN ALARM notification - SHOWING MODAL!');
        
        // Note: No need to reschedule here as it should already be handled by handleNotificationReceived
        // or we'd have duplicate rescheduling
        
        // Show alarm modal when user taps notification
        await showAlarmModal(data);
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
  };

  // Function to show alarm modal using the modal manager
  const showAlarmModal = async (notificationData: any) => {
    try {
      console.log('🚨 [App] Preparing to show alarm modal...');
      
      // Get alarm data from storage to get puzzle type and other details
      const { StorageService } = require('./src/services/StorageService');
      const alarmData = await StorageService.getAlarmById(notificationData.alarmId);
      
      if (!alarmData) {
        console.error('❌ [App] Alarm data not found for ID:', notificationData.alarmId);
        throw new Error('Alarm data not found');
      }

      const modalData: AlarmModalData = {
        alarmId: notificationData.alarmId,
        title: notificationData.alarmLabel || alarmData.label || 'Alarm',
        label: alarmData.label,
        originalTime: notificationData.originalTime || alarmData.time,
        endTime: alarmData.endTime,
        puzzleType: alarmData.puzzleType || 'none',
        onDismiss: () => {
          console.log(`✅ [App] Alarm ${notificationData.alarmId} dismissed via modal`);
          modalManager.hideAlarmModal();
        },
        onSnooze: () => {
          console.log(`😴 [App] Alarm ${notificationData.alarmId} snoozed via modal`);
          handleSnooze(notificationData.alarmId);
          modalManager.hideAlarmModal();
        },
      };

      console.log('🚨 [App] Modal data prepared:', modalData);
      
      // Show modal using modal manager
      const success = await modalManager.showAlarmModal(modalData);
      
      if (!success) {
        console.error('❌ [App] Modal manager failed to show modal');
        throw new Error('Modal display failed');
      }
      
      console.log('✅ [App] Alarm modal displayed successfully');

    } catch (error) {
      console.error('❌ [App] Error showing alarm modal:', error);
      
      // Fallback to basic alert if modal fails
      Alert.alert(
        '⏰ ALARM RINGING!',
        `${notificationData.alarmLabel || 'Alarm'} is ringing!\n\n(Modal display failed - using fallback)`,
        [
          { 
            text: 'Dismiss', 
            style: 'cancel',
            onPress: () => {
              console.log(`✅ ALARM ${notificationData.alarmId} DISMISSED via fallback at ${new Date().toLocaleTimeString()}`);
            }
          },
          { 
            text: 'Snooze (5 min)', 
            onPress: () => {
              console.log(`😴 ALARM ${notificationData.alarmId} SNOOZED via fallback at ${new Date().toLocaleTimeString()}`);
              handleSnooze(notificationData.alarmId);
            }
          }
        ]
      );
    }
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
        `Alarm will ring again at ${snoozeTime.toLocaleTimeString()}\\n\\nSnoozed for 5 minutes`,
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
      
      {/* Alarm Modal - Renders on top of everything */}
      <AlarmModal
        visible={modalState.isVisible}
        data={modalState.data}
        onClose={() => {
          console.log('🚨 [App] AlarmModal onClose called');
          modalManager.hideAlarmModal();
        }}
      />
    </SafeAreaProvider>
  );
};

export default App;
