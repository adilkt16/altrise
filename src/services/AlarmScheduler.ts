import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { StorageService } from './StorageService';
import { Alarm } from '../types';

export interface ScheduledNotification {
  alarmId: string;
  notificationId: string;
  scheduledFor: Date;
  isEndTimeNotification?: boolean;
}

export class AlarmScheduler {
  private static scheduledNotifications: Map<string, ScheduledNotification[]> = new Map();

  /**
   * Schedule all enabled alarms
   */
  static async scheduleAllAlarms(): Promise<void> {
    try {
      console.log('🔔 Scheduling all alarms...');
      
      // First, cancel all existing scheduled notifications
      await this.cancelAllScheduledAlarms();

      // Get all alarms from storage
      const alarms = await StorageService.getAllAlarms();
      const enabledAlarms = alarms.filter((alarm: Alarm) => alarm.isEnabled);

      console.log(`📅 Found ${enabledAlarms.length} enabled alarms to schedule`);

      // Track scheduling results
      let successCount = 0;
      let failureCount = 0;

      for (const alarm of enabledAlarms) {
        try {
          await this.scheduleAlarm(alarm);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to schedule alarm ${alarm.id}:`, error);
          failureCount++;
        }
      }

      console.log(`✅ All alarms scheduled successfully: ${successCount} success, ${failureCount} failures`);
      
      // Validate that notifications were actually scheduled
      await this.validateScheduledNotifications();
      
      // Log all scheduled notifications for debugging
      await this.logAllScheduledNotifications();
      
    } catch (error) {
      console.error('❌ Error scheduling alarms:', error);
      throw error;
    }
  }

  /**
   * Log all currently scheduled notifications for debugging
   */
  static async logAllScheduledNotifications(): Promise<void> {
    try {
      console.log('📋 ===============================================');
      console.log('📋 ALL SCHEDULED NOTIFICATIONS');
      console.log('📋 ===============================================');
      
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const now = new Date();
      
      console.log(`📋 Current time: ${now.toLocaleString()}`);
      console.log(`📋 Total scheduled notifications: ${allScheduled.length}`);
      
      if (allScheduled.length === 0) {
        console.log('📋 No notifications currently scheduled');
      } else {
        allScheduled.forEach((notification: any, index: number) => {
          const trigger = notification.trigger as any;
          const triggerDate = trigger?.date ? new Date(trigger.date) : null;
          const timeUntil = triggerDate ? Math.round((triggerDate.getTime() - now.getTime()) / 60000) : null;
          
          console.log(`📋 ${index + 1}. ${notification.identifier}`);
          console.log(`    Title: ${notification.content.title}`);
          console.log(`    Trigger: ${triggerDate ? triggerDate.toLocaleString() : 'Unknown'}`);
          console.log(`    Time until: ${timeUntil !== null ? timeUntil + ' minutes' : 'Unknown'}`);
          if (notification.content.data) {
            console.log(`    Alarm ID: ${notification.content.data.alarmId || 'Unknown'}`);
            console.log(`    Is End Time: ${notification.content.data.isEndTime || false}`);
          }
          console.log('');
        });
      }
      
      console.log('📋 ===============================================');
      
    } catch (error) {
      console.error('❌ Error logging scheduled notifications:', error);
    }
  }

  /**
   * Validate that scheduled notifications actually exist in the system
   */
  static async validateScheduledNotifications(): Promise<void> {
    try {
      console.log('🔍 Validating scheduled notifications...');
      
      const systemScheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 System has ${systemScheduled.length} scheduled notifications`);
      
      // Check each alarm's notifications
      let totalTracked = 0;
      let validNotifications = 0;
      
      this.scheduledNotifications.forEach((notifications, alarmId) => {
        totalTracked += notifications.length;
        
        notifications.forEach(notification => {
          const exists = systemScheduled.find(n => n.identifier === notification.notificationId);
          if (exists) {
            validNotifications++;
            console.log(`✅ Alarm ${alarmId}: notification ${notification.notificationId} confirmed in system`);
          } else {
            console.warn(`⚠️ Alarm ${alarmId}: notification ${notification.notificationId} NOT found in system!`);
          }
        });
      });
      
      console.log(`📊 Validation: ${validNotifications}/${totalTracked} tracked notifications exist in system`);
      
      if (validNotifications !== totalTracked) {
        console.warn('⚠️ Some tracked notifications are missing from system - this may cause reliability issues');
      }
      
    } catch (error) {
      console.error('❌ Error validating scheduled notifications:', error);
    }
  }

  /**
   * Schedule a single alarm with repeat logic
   */
  static async scheduleAlarm(alarm: Alarm): Promise<void> {
    try {
      console.log(`🔔 Scheduling alarm: ${alarm.label || 'Unnamed'} at ${alarm.time}`);

      if (!alarm.isEnabled) {
        console.log(`⏸️ Alarm ${alarm.id} is disabled, skipping`);
        return;
      }

      const scheduledNotifications: ScheduledNotification[] = [];

      // Calculate next occurrences for the next 7 days (weekly repeat cycle)
      const nextOccurrences = this.calculateNextOccurrences(alarm, 7);
      
      console.log(`📅 Found ${nextOccurrences.length} upcoming occurrences for alarm ${alarm.id}`);

      for (const occurrence of nextOccurrences) {
        console.log(`⏰ Scheduling notification for ${occurrence.toLocaleString()}`);
        
        // Schedule the main alarm notification
        const notificationId = await this.scheduleNotification(
          alarm,
          occurrence,
          false
        );

        if (notificationId) {
          scheduledNotifications.push({
            alarmId: alarm.id,
            notificationId,
            scheduledFor: occurrence,
            isEndTimeNotification: false,
          });

          // Schedule end time notification if alarm has an end time
          if (alarm.endTime) {
            const endOccurrence = this.calculateEndTime(occurrence, alarm.endTime);
            const endNotificationId = await this.scheduleNotification(
              alarm,
              endOccurrence,
              true
            );

            if (endNotificationId) {
              scheduledNotifications.push({
                alarmId: alarm.id,
                notificationId: endNotificationId,
                scheduledFor: endOccurrence,
                isEndTimeNotification: true,
              });
            }
          }
        }
      }

      // Store scheduled notifications for this alarm
      this.scheduledNotifications.set(alarm.id, scheduledNotifications);

      console.log(`✅ Scheduled ${scheduledNotifications.length} notifications for alarm ${alarm.id}`);
      
      // Log the next upcoming alarm time
      if (scheduledNotifications.length > 0) {
        const nextAlarm = scheduledNotifications[0];
        console.log(`🎯 Next alarm: ${nextAlarm.scheduledFor.toLocaleString()}`);
      }
    } catch (error) {
      console.error(`❌ Error scheduling alarm ${alarm.id}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a specific alarm's scheduled notifications
   */
  static async cancelAlarm(alarmId: string): Promise<void> {
    try {
      console.log(`🚫 Canceling alarm: ${alarmId}`);

      const scheduledNotifications = this.scheduledNotifications.get(alarmId);
      if (!scheduledNotifications) {
        console.log(`⚠️ No scheduled notifications found for alarm ${alarmId}`);
        return;
      }

      // Cancel all notifications for this alarm
      for (const scheduled of scheduledNotifications) {
        await Notifications.cancelScheduledNotificationAsync(scheduled.notificationId);
        console.log(`🚫 Canceled notification ${scheduled.notificationId}`);
      }

      // Remove from our tracking
      this.scheduledNotifications.delete(alarmId);

      console.log(`✅ Canceled all notifications for alarm ${alarmId}`);
    } catch (error) {
      console.error(`❌ Error canceling alarm ${alarmId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled alarms
   */
  static async cancelAllScheduledAlarms(): Promise<void> {
    try {
      console.log('🚫 Canceling all scheduled alarms...');

      // Cancel all expo notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Clear our tracking
      this.scheduledNotifications.clear();

      console.log('✅ All scheduled alarms canceled');
    } catch (error) {
      console.error('❌ Error canceling all alarms:', error);
      throw error;
    }
  }

  /**
   * Reschedule an alarm (cancel old, schedule new)
   */
  static async rescheduleAlarm(alarm: Alarm): Promise<void> {
    await this.cancelAlarm(alarm.id);
    if (alarm.isEnabled) {
      await this.scheduleAlarm(alarm);
    }
  }

  /**
   * Calculate next alarm occurrences based on repeat settings
   */
  private static calculateNextOccurrences(alarm: Alarm, daysAhead: number = 7): Date[] {
    const occurrences: Date[] = [];
    const now = new Date();
    const [hours, minutes] = alarm.time.split(':').map(Number);

    for (let i = 0; i < daysAhead; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      date.setHours(hours, minutes, 0, 0);

      // For today (i === 0), only skip if the time has already passed
      if (i === 0 && date <= now) {
        console.log(`⏰ Alarm time ${alarm.time} has already passed today, scheduling for tomorrow`);
        continue;
      }

      // Check if this day should have the alarm based on repeat settings
      if (this.shouldAlarmTriggerOnDay(alarm, date)) {
        occurrences.push(date);
        console.log(`✅ Alarm scheduled for ${date.toLocaleString()}`);
      }
    }

    return occurrences;
  }

  /**
   * Check if alarm should trigger on a specific day based on repeat settings
   */
  private static shouldAlarmTriggerOnDay(alarm: Alarm, date: Date): boolean {
    // If no repeat days are specified, treat as a one-time alarm
    if (!alarm.repeatDays || alarm.repeatDays.length === 0) {
      // For one-time alarms, only schedule for today if the time hasn't passed, or tomorrow
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const alarmDate = new Date(date);
      alarmDate.setHours(0, 0, 0, 0);
      
      // Allow scheduling for today or tomorrow only
      const daysDiff = Math.floor((alarmDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 1;
    }

    // Check if this day matches the repeat settings
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return alarm.repeatDays.includes(dayOfWeek);
  }

  /**
   * Calculate end time occurrence
   */
  private static calculateEndTime(startTime: Date, endTimeString: string): Date {
    const [hours, minutes] = endTimeString.split(':').map(Number);
    const endTime = new Date(startTime);
    endTime.setHours(hours, minutes, 0, 0);

    // If end time is before start time, it's the next day
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    return endTime;
  }

  /**
   * Schedule a notification using Expo notifications
   */
  private static async scheduleNotification(
    alarm: Alarm,
    triggerDate: Date,
    isEndTime: boolean = false
  ): Promise<string | null> {
    try {
      const now = new Date();
      if (triggerDate <= now) {
        console.log(`⏰ Trigger time ${triggerDate.toLocaleString()} is in the past, skipping`);
        return null;
      }

      const title = isEndTime 
        ? `Alarm Ended: ${alarm.label || 'Alarm'}`
        : `⏰ ${alarm.label || 'Alarm'}`;

      const body = isEndTime
        ? 'Your alarm period has ended'
        : 'Wake up! Your alarm is ringing';

      console.log(`📱 SCHEDULING NOTIFICATION:`);
      console.log(`   Alarm ID: ${alarm.id}`);
      console.log(`   Label: ${alarm.label || 'Unnamed'}`);
      console.log(`   Title: ${title}`);
      console.log(`   Body: ${body}`);
      console.log(`   Current Time: ${now.toLocaleString()}`);
      console.log(`   Trigger Time: ${triggerDate.toLocaleString()}`);
      console.log(`   Time Until Trigger: ${Math.round((triggerDate.getTime() - now.getTime()) / 1000)} seconds`);
      console.log(`   Is End Time: ${isEndTime}`);
      console.log(`   Repeat Days: ${alarm.repeatDays?.join(', ') || 'None (one-time)'}`);
      if (alarm.endTime) {
        console.log(`   End Time: ${alarm.endTime}`);
      }

      const notificationContent: Notifications.NotificationContentInput = {
        title,
        body,
        sound: alarm.soundFile === 'default_alarm.mp3' ? 'default' : undefined,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          alarmId: alarm.id,
          isEndTime,
          puzzleType: alarm.puzzleType,
          alarmLabel: alarm.label,
          triggerTime: triggerDate.toISOString(),
          originalTime: alarm.time,
          repeatDays: alarm.repeatDays,
          endTime: alarm.endTime,
          // Enhanced tracking data
          notificationCreatedAt: now.toISOString(),
          expectedTriggerTime: triggerDate.toISOString(),
          schedulingTimestamp: Date.now(),
        },
        ...(Platform.OS === 'android' && {
          channelId: 'alarms',
          sticky: !isEndTime,
          // Enhanced Android notification properties for alarm
          vibrationPattern: [0, 1000, 500, 1000],
          lightColor: '#FF231F7C',
          badge: 1,
        }),
      } as any;

      const notificationRequest = {
        content: notificationContent,
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.DATE as Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate 
        } as Notifications.DateTriggerInput,
      };

      console.log(`� Notification request:`, JSON.stringify(notificationRequest, null, 2));

      const notificationId = await Notifications.scheduleNotificationAsync(notificationRequest);

      console.log(`✅ NOTIFICATION SCHEDULED SUCCESSFULLY!`);
      console.log(`   Notification ID: ${notificationId}`);
      console.log(`   Will trigger at: ${triggerDate.toLocaleString()}`);
      console.log(`   Alarm will ${alarm.repeatDays?.length ? 'REPEAT on days: ' + alarm.repeatDays.join(', ') : 'be ONE-TIME'}`);
      console.log(`   Next check in: ${Math.round((triggerDate.getTime() - now.getTime()) / 60000)} minutes`);
      
      // Verify it was scheduled
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const justScheduled = allScheduled.find(n => n.identifier === notificationId);
      if (justScheduled) {
        console.log(`✅ Verified: Notification ${notificationId} found in scheduled list`);
      } else {
        console.log(`⚠️ Warning: Notification ${notificationId} not found in scheduled list`);
      }

      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Check if it's an Expo Go limitation
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('not supported') || errorMessage.includes('not available')) {
        console.log('🚨 This error suggests you are running in Expo Go');
        console.log('🏗️ Scheduled notifications require a development build');
        console.log('🔧 Run: npx create-expo-app --template');
      }
      
      return null;
    }
  }

  /**
   * Handle notification that has triggered - reschedule if needed
   */
  static async handleNotificationTriggered(alarmId: string, isEndTime: boolean = false): Promise<void> {
    try {
      console.log(`🔔 NOTIFICATION TRIGGERED for alarm ${alarmId}, isEndTime: ${isEndTime}`);
      
      if (isEndTime) {
        console.log(`🔚 End time notification triggered for alarm ${alarmId} - no rescheduling needed`);
        return;
      }
      
      // Get the alarm from storage
      const alarm = await StorageService.getAlarmById(alarmId);
      if (!alarm) {
        console.warn(`⚠️ Could not find alarm ${alarmId} in storage for rescheduling`);
        return;
      }
      
      if (!alarm.isEnabled) {
        console.log(`⏸️ Alarm ${alarmId} is disabled - not rescheduling`);
        return;
      }
      
      // Check if this is a repeating alarm
      if (alarm.repeatDays && alarm.repeatDays.length > 0) {
        console.log(`🔄 RESCHEDULING REPEATING ALARM ${alarmId}...`);
        console.log(`   Repeat days: ${alarm.repeatDays.join(', ')}`);
        
        // Remove the old scheduled notification from tracking
        const existingNotifications = this.scheduledNotifications.get(alarmId) || [];
        const updatedNotifications = existingNotifications.filter(n => !n.isEndTimeNotification);
        this.scheduledNotifications.set(alarmId, updatedNotifications);
        
        // Schedule the next occurrence
        await this.scheduleAlarm(alarm);
        
        console.log(`✅ Repeating alarm ${alarmId} rescheduled successfully`);
      } else {
        console.log(`🚫 One-time alarm ${alarmId} triggered - removing from schedule`);
        
        // Remove from tracking since it's a one-time alarm
        this.scheduledNotifications.delete(alarmId);
        
        // Optionally disable the alarm in storage
        await StorageService.updateAlarm(alarmId, { isEnabled: false });
        console.log(`⏸️ One-time alarm ${alarmId} disabled after triggering`);
      }
      
    } catch (error) {
      console.error(`❌ Error handling triggered notification for alarm ${alarmId}:`, error);
    }
  }

  /**
   * Get all currently scheduled alarms info
   */
  static getScheduledAlarmsInfo(): Record<string, ScheduledNotification[]> {
    const result: Record<string, ScheduledNotification[]> = {};
    this.scheduledNotifications.forEach((notifications, alarmId) => {
      result[alarmId] = notifications;
    });
    return result;
  }

  /**
   * Get next alarm occurrence across all alarms
   */
  static getNextAlarmTime(): Date | null {
    let nextTime: Date | null = null;

    this.scheduledNotifications.forEach((notifications) => {
      for (const notification of notifications) {
        if (!notification.isEndTimeNotification) {
          if (!nextTime || notification.scheduledFor < nextTime) {
            nextTime = notification.scheduledFor;
          }
        }
      }
    });

    return nextTime;
  }

  /**
   * DIAGNOSTIC UTILITIES - For debugging notification issues
   */

  /**
   * Get comprehensive diagnostic information
   */
  static async getDiagnosticInfo(): Promise<any> {
    try {
      const systemScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const permissions = await Notifications.getPermissionsAsync();
      const alarms = await StorageService.getAllAlarms();
      
      const diagnostics = {
        timestamp: new Date().toISOString(),
        permissions: permissions,
        systemScheduledCount: systemScheduled.length,
        systemScheduled: systemScheduled.map(n => ({
          id: n.identifier,
          title: n.content.title,
          trigger: n.trigger,
          data: n.content.data,
        })),
        trackedAlarmsCount: this.scheduledNotifications.size,
        trackedAlarms: Array.from(this.scheduledNotifications.entries()).map(([alarmId, notifications]) => ({
          alarmId,
          notificationCount: notifications.length,
          notifications: notifications.map(n => ({
            id: n.notificationId,
            scheduledFor: n.scheduledFor.toISOString(),
            isEndTime: n.isEndTimeNotification,
          })),
        })),
        storedAlarmsCount: alarms.length,
        storedAlarms: alarms.map(a => ({
          id: a.id,
          label: a.label,
          time: a.time,
          enabled: a.isEnabled,
          repeatDays: a.repeatDays,
        })),
      };
      
      console.log('🔍 DIAGNOSTIC INFO:');
      console.log(JSON.stringify(diagnostics, null, 2));
      
      return diagnostics;
    } catch (error) {
      console.error('❌ Error getting diagnostic info:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test immediate notification (for debugging)
   */
  static async testImmediateNotification(): Promise<string | null> {
    try {
      console.log('🧪 Testing immediate notification...');
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'If you see this, immediate notifications work!',
          sound: 'default',
          data: {
            test: true,
            timestamp: new Date().toISOString(),
          },
        },
        trigger: null, // Immediate
      });
      
      console.log(`✅ Test notification scheduled: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('❌ Error testing immediate notification:', error);
      return null;
    }
  }

  /**
   * Test scheduled notification (for debugging)
   */
  static async testScheduledNotification(delaySeconds: number = 10): Promise<string | null> {
    try {
      console.log(`🧪 Testing scheduled notification in ${delaySeconds} seconds...`);
      
      const triggerTime = new Date();
      triggerTime.setSeconds(triggerTime.getSeconds() + delaySeconds);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Scheduled Notification',
          body: `This notification was scheduled ${delaySeconds} seconds ago`,
          sound: 'default',
          data: {
            test: true,
            scheduledFor: triggerTime.toISOString(),
            timestamp: new Date().toISOString(),
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
        },
      });
      
      console.log(`✅ Test scheduled notification: ${notificationId} for ${triggerTime.toLocaleTimeString()}`);
      return notificationId;
    } catch (error) {
      console.error('❌ Error testing scheduled notification:', error);
      return null;
    }
  }

  /**
   * Clean up orphaned notifications (notifications in system but not tracked)
   */
  static async cleanupOrphanedNotifications(): Promise<void> {
    try {
      console.log('🧹 Cleaning up orphaned notifications...');
      
      const systemScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const trackedIds = new Set<string>();
      
      // Collect all tracked notification IDs
      this.scheduledNotifications.forEach(notifications => {
        notifications.forEach(n => trackedIds.add(n.notificationId));
      });
      
      // Find orphaned notifications
      const orphaned = systemScheduled.filter(n => !trackedIds.has(n.identifier));
      
      console.log(`🔍 Found ${orphaned.length} orphaned notifications`);
      
      // Cancel orphaned notifications
      for (const notification of orphaned) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`🧹 Cleaned up orphaned notification: ${notification.identifier}`);
      }
      
      console.log(`✅ Cleanup complete: removed ${orphaned.length} orphaned notifications`);
    } catch (error) {
      console.error('❌ Error cleaning up orphaned notifications:', error);
    }
  }

  /**
   * Force refresh all alarm scheduling (useful after app restart)
   */
  static async forceRefreshScheduling(): Promise<void> {
    try {
      console.log('🔄 Force refreshing all alarm scheduling...');
      
      // Clear in-memory tracking
      this.scheduledNotifications.clear();
      
      // Cancel all system notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Re-schedule everything
      await this.scheduleAllAlarms();
      
      console.log('✅ Force refresh complete');
    } catch (error) {
      console.error('❌ Error force refreshing scheduling:', error);
      throw error;
    }
  }

  /**
   * Initialize the alarm scheduler
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing AlarmScheduler...');
      
      // Check if we're in development build vs Expo Go
      try {
        const manifest = await Notifications.getExpoPushTokenAsync();
        console.log('📱 Running in development build (good for scheduled notifications)');
      } catch (error) {
        console.log('⚠️ Could not get push token - might be running in Expo Go');
        console.log('🚨 IMPORTANT: Scheduled notifications DO NOT work in Expo Go!');
        console.log('🏗️ You need a development build for alarms to work properly');
      }
      
      // Check notification permissions
      const { status } = await Notifications.getPermissionsAsync();
      console.log('📋 Current notification permission:', status);
      
      if (status !== 'granted') {
        console.log('⚠️ Notification permissions not granted - alarms may not work');
      }
      
      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alarms', {
          name: 'Alarms',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
        console.log('📱 Android notification channel created');
      }
      
      // Set notification handler for immediate display (using new API)
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          console.log('🔔 Notification handler called:', notification.request.identifier);
          console.log('📱 Notification content:', notification.request.content.title);
          console.log('📊 Notification data:', JSON.stringify(notification.request.content.data, null, 2));
          
          // Use new API instead of deprecated shouldShowAlert
          return {
            shouldShowBanner: true,  // Show notification banner
            shouldShowList: true,    // Show in notification list  
            shouldPlaySound: true,   // Play notification sound
            shouldSetBadge: false,   // Don't set app badge
          };
        },
      });

      // Schedule all existing alarms
      await this.scheduleAllAlarms();

      console.log('✅ AlarmScheduler initialized successfully');
      
      // Log debugging info
      console.log('');
      console.log('🔍 DEBUGGING HELP:');
      console.log('• Test immediate notification: testImmediateNotification()');
      console.log('• Test scheduled notification: testScheduledNotification()');
      console.log('• Check status: checkNotificationStatus()');
      console.log('• If no notifications appear, you might be in Expo Go (needs dev build)');
      console.log('');
      
    } catch (error) {
      console.error('❌ Error initializing AlarmScheduler:', error);
      throw error;
    }
  }
}
