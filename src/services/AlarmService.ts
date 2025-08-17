// AlarmService - Handles alarm creation, scheduling, and management
// This service integrates with StorageService for data persistence

import { Alarm, CreateAlarmData, PuzzleType, WeekDay } from '../types';
import StorageService from './StorageService';

export class AlarmService {
  /**
   * Get all alarms
   */
  static async getAlarms(): Promise<Alarm[]> {
    return await StorageService.getAllAlarms();
  }

  /**
   * Create a new alarm
   */
  static async createAlarm(alarmData: CreateAlarmData): Promise<Alarm> {
    return await StorageService.createAlarm(alarmData);
  }

  /**
   * Update an existing alarm
   */
  static async updateAlarm(id: string, updates: Partial<Alarm>): Promise<Alarm | null> {
    return await StorageService.updateAlarm(id, updates);
  }

  /**
   * Delete an alarm
   */
  static async deleteAlarm(id: string): Promise<boolean> {
    return await StorageService.deleteAlarm(id);
  }

  /**
   * Toggle alarm on/off
   */
  static async toggleAlarm(id: string): Promise<Alarm | null> {
    return await StorageService.toggleAlarm(id);
  }

  /**
   * Get enabled alarms only
   */
  static async getEnabledAlarms(): Promise<Alarm[]> {
    return await StorageService.getEnabledAlarms();
  }

  /**
   * Get alarm by ID
   */
  static async getAlarmById(id: string): Promise<Alarm | null> {
    return await StorageService.getAlarmById(id);
  }

  /**
   * Create a quick alarm with default settings
   */
  static async createQuickAlarm(time: string, label?: string): Promise<Alarm> {
    const settings = await StorageService.getUserSettings();
    
    const alarmData: CreateAlarmData = {
      time,
      isEnabled: true,
      repeatDays: [], // One-time alarm
      puzzleType: settings.defaultPuzzleType,
      soundFile: settings.defaultSound,
      vibrationEnabled: settings.defaultVibration,
      label: label || 'Quick Alarm',
    };

    return await this.createAlarm(alarmData);
  }

  /**
   * Check if an alarm should trigger on a given day
   */
  static shouldTriggerOnDay(alarm: Alarm, dayOfWeek: WeekDay): boolean {
    // If no repeat days set, it's a one-time alarm
    if (alarm.repeatDays.length === 0) {
      return true; // Will be handled by scheduling logic
    }
    
    return alarm.repeatDays.includes(dayOfWeek);
  }

  /**
   * Get next alarm that will trigger
   */
  static async getNextAlarm(): Promise<Alarm | null> {
    const enabledAlarms = await this.getEnabledAlarms();
    
    if (enabledAlarms.length === 0) {
      return null;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay() as WeekDay;

    let nextAlarm: Alarm | null = null;
    let minTimeToNext = Infinity;

    for (const alarm of enabledAlarms) {
      const [hours, minutes] = alarm.time.split(':').map(Number);
      const alarmTime = hours * 60 + minutes;

      // Calculate time until this alarm
      let timeToNext: number;
      
      if (alarm.repeatDays.length === 0) {
        // One-time alarm
        if (alarmTime > currentTime) {
          timeToNext = alarmTime - currentTime;
        } else {
          timeToNext = (24 * 60) + alarmTime - currentTime; // Tomorrow
        }
      } else {
        // Repeating alarm
        let foundNext = false;
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const checkDay = (currentDay + dayOffset) % 7 as WeekDay;
          
          if (alarm.repeatDays.includes(checkDay)) {
            if (dayOffset === 0 && alarmTime > currentTime) {
              // Today, and alarm hasn't passed yet
              timeToNext = alarmTime - currentTime;
              foundNext = true;
              break;
            } else if (dayOffset > 0) {
              // Future day
              timeToNext = (dayOffset * 24 * 60) + alarmTime - currentTime;
              foundNext = true;
              break;
            }
          }
        }
        
        if (!foundNext) {
          continue; // Skip this alarm
        }
      }

      if (timeToNext! < minTimeToNext) {
        minTimeToNext = timeToNext!;
        nextAlarm = alarm;
      }
    }

    return nextAlarm;
  }

  // Future implementation will include:
  // - scheduleAlarm() - Integration with system alarm/notification scheduling
  // - cancelAlarm() - Cancel system scheduled alarms
  // - triggerAlarm() - Handle alarm triggering logic
  // - snoozeAlarm() - Handle snooze functionality
  // - completeAlarm() - Mark alarm as completed with puzzle solution
}

export default AlarmService;
