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

export default function App() {
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
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

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
      
      // Log helpful debug info
      console.log('🔍 Debug: You can test notifications with:');
      console.log('import { testImmediateNotification } from "./src/utils/alarmSchedulingTest"; testImmediateNotification();');
      
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
    // Listen for notifications that come in while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received:', notification);
      handleNotificationReceived(notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification response received:', response);
      handleNotificationResponse(response);
    });
  };

  const handleNotificationReceived = (notification: Notifications.Notification) => {
    const { data } = notification.request.content;
    
    if (data?.alarmId && typeof data.alarmId === 'string') {
      console.log(`⏰ Alarm ${data.alarmId} triggered`);
      
      if (data.isEndTime) {
        console.log('🔚 Alarm end time reached');
        // Handle alarm end time logic here
        // For now, just show a simple alert
        Alert.alert(
          'Alarm Ended',
          'Your alarm period has ended.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('🚨 Alarm is ringing!');
        // Handle main alarm trigger
        // This is where you would show the alarm screen with puzzle
        handleAlarmTrigger(data.alarmId, data);
      }
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const { data } = response.notification.request.content;
    
    if (data?.alarmId && typeof data.alarmId === 'string') {
      console.log(`👆 User interacted with alarm ${data.alarmId}`);
      
      if (!data.isEndTime) {
        // User tapped on the alarm notification
        handleAlarmTrigger(data.alarmId, data);
      }
    }
  };

  const handleAlarmTrigger = (alarmId: string, data: Record<string, any>) => {
    console.log(`🚨 Handling alarm trigger for ${alarmId}`);
    
    // For now, show a simple alert
    // Later this will open the puzzle modal or alarm screen
    Alert.alert(
      '⏰ Alarm!',
      `Your alarm is ringing! Puzzle type: ${data.puzzleType || 'None'}`,
      [
        { 
          text: 'Snooze', 
          onPress: () => handleSnooze(alarmId) 
        },
        { 
          text: 'Turn Off', 
          onPress: () => handleTurnOff(alarmId) 
        }
      ]
    );
  };

  const handleSnooze = (alarmId: string) => {
    console.log(`😴 Snoozing alarm ${alarmId}`);
    // TODO: Implement snooze logic
    // This would reschedule the alarm for 5-10 minutes later
  };

  const handleTurnOff = (alarmId: string) => {
    console.log(`🔕 Turning off alarm ${alarmId}`);
    // TODO: Implement turn off logic
    // This would mark the alarm as completed and update stats
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('📱 App has come to the foreground');
      // Refresh alarm scheduling when app becomes active
      refreshAlarmScheduling();
    }

    appState.current = nextAppState;
  };

  const refreshAlarmScheduling = async () => {
    try {
      console.log('🔄 Refreshing alarm scheduling...');
      await AlarmScheduler.scheduleAllAlarms();
      console.log('✅ Alarm scheduling refreshed');
    } catch (error) {
      console.error('❌ Error refreshing alarm scheduling:', error);
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
}
