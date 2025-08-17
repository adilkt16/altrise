import * as Notifications from 'expo-notifications';
import { StorageService } from './StorageService';
import { Alarm, WeekDay } from '../types';

export interface ScheduledAlarm {
  alarmId: string;
  notificationId: string;
  scheduledFor: Date;
  isEndTimeNotification?: boolean;
}

export class AlarmScheduler {
  private static scheduledAlarms: Map<string, ScheduledAlarm[]> = new Map();

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

      for (const alarm of enabledAlarms) {
        await this.scheduleAlarm(alarm);
      }

      console.log('✅ All alarms scheduled successfully');
    } catch (error) {
      console.error('❌ Error scheduling alarms:', error);
      throw error;
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

      const scheduledNotifications: ScheduledAlarm[] = [];

      // Calculate next occurrences for the next 7 days (weekly repeat cycle)
      const nextOccurrences = this.calculateNextOccurrences(alarm, 7);

      for (const occurrence of nextOccurrences) {
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
      this.scheduledAlarms.set(alarm.id, scheduledNotifications);

      console.log(`✅ Scheduled ${scheduledNotifications.length} notifications for alarm ${alarm.id}`);
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

      const scheduledNotifications = this.scheduledAlarms.get(alarmId);
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
      this.scheduledAlarms.delete(alarmId);

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
      this.scheduledAlarms.clear();

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

      // Skip if this time has already passed today
      if (i === 0 && date <= now) {
        continue;
      }

      // Check if this day should have the alarm based on repeat settings
      if (this.shouldAlarmTriggerOnDay(alarm, date)) {
        occurrences.push(date);
      }
    }

    return occurrences;
  }

  /**
   * Check if alarm should trigger on a specific day based on repeat settings
   */
  private static shouldAlarmTriggerOnDay(alarm: Alarm, date: Date): boolean {
    // If no repeat days are specified, treat as a one-time alarm for today
    if (!alarm.repeatDays || alarm.repeatDays.length === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const alarmDate = new Date(date);
      alarmDate.setHours(0, 0, 0, 0);
      
      return alarmDate.getTime() === today.getTime();
    }

    // Check if current day is in the repeat days
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return alarm.repeatDays.includes(dayOfWeek as WeekDay);
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

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: alarm.soundFile === 'default_alarm.mp3' ? 'default' : undefined,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: {
            alarmId: alarm.id,
            isEndTime,
            puzzleType: alarm.puzzleType,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      console.log(`📱 Scheduled notification ${notificationId} for ${triggerDate.toLocaleString()}`);
      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Get all currently scheduled alarms info
   */
  static getScheduledAlarmsInfo(): Record<string, ScheduledAlarm[]> {
    const result: Record<string, ScheduledAlarm[]> = {};
    this.scheduledAlarms.forEach((notifications, alarmId) => {
      result[alarmId] = notifications;
    });
    return result;
  }

  /**
   * Get next alarm occurrence across all alarms
   */
  static getNextAlarmTime(): Date | null {
    let nextTime: Date | null = null;

    this.scheduledAlarms.forEach((notifications) => {
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
   * Initialize the alarm scheduler
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing AlarmScheduler...');
      
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Schedule all existing alarms
      await this.scheduleAllAlarms();

      console.log('✅ AlarmScheduler initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing AlarmScheduler:', error);
      throw error;
    }
  }
}
