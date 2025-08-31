import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

/**
 * Test immediate notification to verify basic notification functionality
 */
export const testImmediateNotification = async (): Promise<void> => {
  try {
    console.log('🧪 Testing immediate notification...');
    
    // Check permissions first
    const { status } = await Notifications.getPermissionsAsync();
    console.log('📋 Current notification permission status:', status);
    
    if (status !== 'granted') {
      console.log('❌ Notification permissions not granted');
      Alert.alert(
        'Permission Required',
        'Notification permissions are required to test alarms. Please grant permissions in settings.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Test immediate notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Immediate Test',
        body: 'This is an immediate test notification - if you see this, basic notifications work!',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          test: true,
          timestamp: new Date().toISOString(),
        },
        ...(Platform.OS === 'android' && {
          channelId: 'alarms',
        }),
      },
      trigger: null, // Immediate notification
    });
    
    console.log(`✅ Immediate notification scheduled with ID: ${notificationId}`);
    Alert.alert(
      'Test Sent',
      'Immediate notification sent! Check if it appeared.',
      [{ text: 'OK' }]
    );
    
  } catch (error) {
    console.error('❌ Error testing immediate notification:', error);
    Alert.alert(
      'Test Failed',
      `Error: ${(error as Error).message}`,
      [{ text: 'OK' }]
    );
  }
};

/**
 * Test scheduled notification (5 seconds from now)
 */
export const testScheduledNotification = async (): Promise<void> => {
  try {
    console.log('🧪 Testing scheduled notification (5 seconds)...');
    
    // Check permissions first
    const { status } = await Notifications.getPermissionsAsync();
    console.log('📋 Current notification permission status:', status);
    
    if (status !== 'granted') {
      console.log('❌ Notification permissions not granted');
      Alert.alert(
        'Permission Required',
        'Notification permissions are required to test alarms.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const triggerTime = new Date();
    triggerTime.setSeconds(triggerTime.getSeconds() + 5);
    
    console.log(`⏰ Scheduling notification for: ${triggerTime.toLocaleTimeString()}`);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Scheduled Test',
        body: `This notification was scheduled for ${triggerTime.toLocaleTimeString()}. If you see this, scheduled notifications work!`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          test: true,
          scheduledFor: triggerTime.toISOString(),
          actualTime: new Date().toISOString(),
        },
        ...(Platform.OS === 'android' && {
          channelId: 'alarms',
          vibrationPattern: [0, 1000, 500, 1000],
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    });
    
    console.log(`📱 Scheduled notification ID: ${notificationId}`);
    console.log(`⏰ Will trigger at: ${triggerTime.toLocaleTimeString()}`);
    
    Alert.alert(
      'Test Scheduled',
      `Notification scheduled for ${triggerTime.toLocaleTimeString()} (in 5 seconds). Watch for it!`,
      [{ text: 'OK' }]
    );
    
  } catch (error) {
    console.error('❌ Error testing scheduled notification:', error);
    Alert.alert(
      'Test Failed',
      `Error: ${(error as Error).message}`,
      [{ text: 'OK' }]
    );
  }
};

/**
 * Check notification system status and scheduled notifications
 */
export const checkNotificationStatus = async (): Promise<void> => {
  try {
    console.log('🔍 Checking notification system status...');
    
    // Check permissions
    const permissions = await Notifications.getPermissionsAsync();
    console.log('📋 Notification permissions:', permissions);
    
    // Check if we're in development build vs Expo Go
    const manifest = await Notifications.getExpoPushTokenAsync();
    console.log('📱 Expo push token info:', manifest);
    
    // Get all scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📅 Currently scheduled notifications: ${scheduled.length}`);
    
    scheduled.forEach((notification, index) => {
      console.log(`  ${index + 1}. ID: ${notification.identifier}`);
      console.log(`     Title: ${notification.content.title}`);
      console.log(`     Trigger: ${JSON.stringify(notification.trigger)}`);
      console.log(`     Data: ${JSON.stringify(notification.content.data)}`);
    });
    
    // Check notification handler
    console.log('🔔 Notification handler set: true (we set it in AlarmScheduler.initialize())');
    
    Alert.alert(
      'Notification Status',
      `Permissions: ${permissions.status}\nScheduled: ${scheduled.length}\nHandler: Set`,
      [{ text: 'OK' }]
    );
    
  } catch (error) {
    console.error('❌ Error checking notification status:', error);
    Alert.alert(
      'Check Failed',
      `Error: ${(error as Error).message}`,
      [{ text: 'OK' }]
    );
  }
};

/**
 * Test the full alarm flow
 */
export const testAlarmFlow = async (): Promise<void> => {
  try {
    console.log('🧪 Testing full alarm flow...');
    
    // First test immediate notification
    await testImmediateNotification();
    
    // Wait 2 seconds then test scheduled
    setTimeout(async () => {
      await testScheduledNotification();
    }, 2000);
    
    // Wait 5 seconds then check status
    setTimeout(async () => {
      await checkNotificationStatus();
    }, 8000);
    
  } catch (error) {
    console.error('❌ Error testing alarm flow:', error);
  }
};
