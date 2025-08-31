import * as Notifications from 'expo-notifications';
import { AlarmScheduler } from '../services/AlarmScheduler';
import { StorageService } from '../services/StorageService';
import { Alarm, CreateAlarmData, PuzzleType } from '../types';

/**
 * Test function to create and schedule a simple alarm for immediate testing
 */
export const testImmediateAlarm = async (): Promise<void> => {
  try {
    console.log('🧪 Testing immediate alarm scheduling...');
    
    // Create a test alarm that rings in 10 seconds
    const testTime = new Date();
    testTime.setSeconds(testTime.getSeconds() + 10);
    
    const testAlarm: CreateAlarmData = {
      time: `${testTime.getHours().toString().padStart(2, '0')}:${testTime.getMinutes().toString().padStart(2, '0')}`,
      label: 'Test Alarm (10 seconds)',
      isEnabled: true,
      soundFile: 'default_alarm.mp3',
      vibrationEnabled: true,
      puzzleType: PuzzleType.NONE,
      repeatDays: [], // One-time alarm
    };
    
    console.log(`🔔 Creating test alarm for ${testAlarm.time} (${testTime.toLocaleTimeString()})`);
    
    // Save the alarm to storage
    const createdAlarm = await StorageService.createAlarm(testAlarm);
    
    // Schedule the alarm
    await AlarmScheduler.scheduleAlarm(createdAlarm);
    
    console.log('✅ Test alarm scheduled successfully!');
    console.log(`⏰ Alarm will ring at ${testTime.toLocaleTimeString()}`);
    
    // Log scheduled alarms info
    const scheduledInfo = AlarmScheduler.getScheduledAlarmsInfo();
    console.log('📋 Currently scheduled alarms:', scheduledInfo);
    
    return;
  } catch (error) {
    console.error('❌ Error testing alarm scheduling:', error);
    throw error;
  }
};

/**
 * Test function to immediately trigger a notification (for testing notification handling)
 */
export const testImmediateNotification = async (): Promise<void> => {
  try {
    console.log('🧪 Testing immediate notification...');
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Notification',
        body: 'This is a test notification to verify the alarm system is working!',
        sound: 'default',
        data: {
          alarmId: 'test-notification',
          isEndTime: false,
          alarmLabel: 'Test Notification',
          triggerTime: new Date().toISOString(),
        },
      },
      trigger: null, // Immediate notification
    });
    
    console.log(`📱 Test notification scheduled with ID: ${notificationId}`);
    console.log('✅ Test notification should appear immediately');
    
    return;
  } catch (error) {
    console.error('❌ Error testing immediate notification:', error);
    throw error;
  }
};

/**
 * Get information about all currently scheduled notifications
 */
export const getSchedulingInfo = async (): Promise<void> => {
  try {
    console.log('📊 Getting scheduling information...');
    
    // Get Expo scheduled notifications
    const expoNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📱 Expo has ${expoNotifications.length} scheduled notifications`);
    
    expoNotifications.forEach((notification, index) => {
      console.log(`  ${index + 1}. ID: ${notification.identifier}`);
      console.log(`     Trigger: ${JSON.stringify(notification.trigger)}`);
      console.log(`     Content: ${notification.content.title} - ${notification.content.body}`);
    });
    
    // Get our scheduler's info
    const schedulerInfo = AlarmScheduler.getScheduledAlarmsInfo();
    console.log('🎯 AlarmScheduler info:', schedulerInfo);
    
    // Get next alarm time
    const nextAlarm = AlarmScheduler.getNextAlarmTime();
    if (nextAlarm) {
      console.log(`⏰ Next alarm will ring at: ${nextAlarm.toLocaleString()}`);
    } else {
      console.log('⏰ No alarms currently scheduled');
    }
    
    // Get all alarms from storage
    const allAlarms = await StorageService.getAllAlarms();
    const enabledAlarms = allAlarms.filter(alarm => alarm.isEnabled);
    console.log(`💾 Storage has ${allAlarms.length} total alarms (${enabledAlarms.length} enabled)`);
    
    return;
  } catch (error) {
    console.error('❌ Error getting scheduling info:', error);
    throw error;
  }
};

/**
 * Clean up all test alarms
 */
export const cleanupTestAlarms = async (): Promise<void> => {
  try {
    console.log('🧹 Cleaning up test alarms...');
    
    const allAlarms = await StorageService.getAllAlarms();
    const testAlarms = allAlarms.filter(alarm => alarm.id.startsWith('test-'));
    
    for (const testAlarm of testAlarms) {
      await StorageService.deleteAlarm(testAlarm.id);
      await AlarmScheduler.cancelAlarm(testAlarm.id);
      console.log(`🗑️ Deleted test alarm: ${testAlarm.label}`);
    }
    
    console.log(`✅ Cleaned up ${testAlarms.length} test alarms`);
    
    return;
  } catch (error) {
    console.error('❌ Error cleaning up test alarms:', error);
    throw error;
  }
};
