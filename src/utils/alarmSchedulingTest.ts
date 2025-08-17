// Test script to verify alarm scheduling functionality
// Run this in the React Native app to test the AlarmScheduler

import * as Notifications from 'expo-notifications';
import { AlarmScheduler } from '../services/AlarmScheduler';
import { AlarmService } from '../services/AlarmService';
import { WeekDay, PuzzleType } from '../types';

export const testAlarmScheduling = async () => {
  try {
    console.log('🧪 Starting Alarm Scheduling Test...');

    // Step 1: Check notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    console.log('📋 Notification permission status:', status);
    
    if (status !== 'granted') {
      console.log('❌ Notification permissions not granted!');
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      console.log('📋 New permission status:', newStatus);
      
      if (newStatus !== 'granted') {
        throw new Error('Notification permissions required for testing');
      }
    }

    // Step 2: Test immediate notification (30 seconds from now)
    console.log('📅 Testing immediate notification...');
    const immediateTime = new Date(Date.now() + 30 * 1000); // 30 seconds
    
    const immediateNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Notification',
        body: 'This is a test notification (30 seconds)',
        data: { test: true },
      },
      trigger: {
        type: 'date' as any,
        date: immediateTime,
      },
    });
    
    console.log(`✅ Immediate notification scheduled: ${immediateNotificationId}`);

    // Step 3: Create a test alarm for 2 minutes from now
    const now = new Date();
    const testTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    const timeString = `${testTime.getHours().toString().padStart(2, '0')}:${testTime.getMinutes().toString().padStart(2, '0')}`;

    console.log(`📅 Creating test alarm for ${timeString} (2 minutes from now)`);

    const testAlarm = await AlarmService.createAlarm({
      time: timeString,
      isEnabled: true,
      repeatDays: [], // One-time alarm
      puzzleType: PuzzleType.NONE,
      soundFile: 'default_alarm.mp3',
      vibrationEnabled: true,
      label: 'Test Alarm - 2 min',
    });

    console.log(`✅ Test alarm created: ${testAlarm.id}`);

    // Step 4: Check all scheduled notifications
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 Total scheduled notifications: ${allScheduled.length}`);
    
    for (const notification of allScheduled) {
      const trigger = notification.trigger as any;
      console.log(`- ${notification.content.title}: ${new Date(trigger.value || trigger.date).toLocaleString()}`);
    }

    // Step 5: Check scheduling info
    console.log('📊 Current scheduling info:');
    const schedulingInfo = AlarmService.getSchedulingInfo();
    console.log(JSON.stringify(schedulingInfo, null, 2));

    // Step 6: Get next alarm
    const nextAlarm = await AlarmService.getNextAlarm();
    if (nextAlarm) {
      console.log(`⏰ Next alarm: ${nextAlarm.label} at ${nextAlarm.time}`);
    } else {
      console.log('⚠️ No next alarm found');
    }

    console.log('✅ Alarm scheduling test completed successfully!');
    console.log('🔔 Watch for notifications in 30 seconds and 2 minutes...');

    // Return test alarm IDs for cleanup
    return [testAlarm.id, immediateNotificationId];

  } catch (error) {
    console.error('❌ Alarm scheduling test failed:', error);
    throw error;
  }
};

export const debugNotifications = async () => {
  try {
    console.log('🔍 Debugging notifications...');
    
    // Check permissions
    const { status } = await Notifications.getPermissionsAsync();
    console.log('📋 Notification permissions:', status);
    
    // Get all scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`� Scheduled notifications count: ${scheduled.length}`);
    
    for (const notification of scheduled) {
      const trigger = notification.trigger as any;
      const triggerDate = new Date(trigger.value || trigger.date || trigger.timestamp);
      console.log(`📅 ${notification.content.title}: ${triggerDate.toLocaleString()}`);
      console.log(`   Body: ${notification.content.body}`);
      console.log(`   Data:`, notification.content.data);
      console.log(`   Trigger:`, trigger);
    }
    
    // Check permissions details
    const permissionDetails = await Notifications.getPermissionsAsync();
    console.log('🔧 Permission details:', {
      status: permissionDetails.status,
      android: permissionDetails.android,
      ios: permissionDetails.ios,
    });
    
    return scheduled;
  } catch (error) {
    console.error('❌ Error debugging notifications:', error);
    return [];
  }
};

export const testImmediateNotification = async () => {
  try {
    console.log('⚡ Testing immediate notification...');
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚡ Immediate Test',
        body: 'This should appear in 5 seconds',
        data: { immediate: true },
      },
      trigger: {
        type: 'date' as any,
        date: new Date(Date.now() + 5000), // 5 seconds
      },
    });
    
    console.log(`✅ Immediate notification scheduled: ${id}`);
    return id;
  } catch (error) {
    console.error('❌ Error scheduling immediate notification:', error);
    return null;
  }
};

export const cleanupTestAlarms = async (alarmIds: string[]) => {
  try {
    console.log('🧹 Cleaning up test alarms...');
    
    for (const id of alarmIds) {
      if (id.startsWith('Notification-')) {
        // It's a notification ID
        await Notifications.cancelScheduledNotificationAsync(id);
        console.log(`🗑️ Canceled test notification: ${id}`);
      } else {
        // It's an alarm ID
        await AlarmService.deleteAlarm(id);
        console.log(`🗑️ Deleted test alarm: ${id}`);
      }
    }
    
    console.log('✅ Test alarm cleanup completed');
  } catch (error) {
    console.error('❌ Error cleaning up test alarms:', error);
  }
};
