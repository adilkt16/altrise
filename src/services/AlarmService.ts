// AlarmService - Handles alarm creation, scheduling, and management
// This service integrates with StorageService for data persistence and AlarmScheduler for system scheduling

import { Alarm, CreateAlarmData, PuzzleType, WeekDay } from '../types';
import StorageService from './StorageService';
import { AlarmScheduler } from './AlarmScheduler';

export class AlarmService {
  /**
   * Get all alarms
   */
  static async getAlarms(): Promise<Alarm[]> {
    return await StorageService.getAllAlarms();
  }

  /**
   * Create a new alarm with automatic scheduling
   */
  static async createAlarm(alarmData: CreateAlarmData): Promise<Alarm> {
    console.log('➕ Creating new alarm:', alarmData.label || 'Unnamed');
    
    const alarm = await StorageService.createAlarm(alarmData);
    
    // Schedule the alarm if it's enabled
    if (alarm.isEnabled) {
      console.log(`📅 Scheduling new alarm ${alarm.id}...`);
      await AlarmScheduler.scheduleAlarm(alarm);
      
      // Validate the scheduling worked
      await AlarmScheduler.validateScheduledNotifications();
    } else {
      console.log(`⏸️ Alarm ${alarm.id} created but disabled, not scheduling`);
    }
    
    console.log(`✅ Alarm ${alarm.id} created successfully`);
    return alarm;
  }

  /**
   * Update an existing alarm with rescheduling
   */
  static async updateAlarm(id: string, updates: Partial<Alarm>): Promise<Alarm | null> {
    console.log(`📝 Updating alarm ${id}:`, updates);
    
    // Cancel existing scheduling first
    await AlarmScheduler.cancelAlarm(id);
    
    const updatedAlarm = await StorageService.updateAlarm(id, updates);
    
    if (updatedAlarm) {
      // Reschedule the alarm with new settings
      if (updatedAlarm.isEnabled) {
        console.log(`📅 Rescheduling updated alarm ${id}...`);
        await AlarmScheduler.scheduleAlarm(updatedAlarm);
        
        // Validate the rescheduling worked
        await AlarmScheduler.validateScheduledNotifications();
      } else {
        console.log(`⏸️ Updated alarm ${id} is disabled, not scheduling`);
      }
      
      console.log(`✅ Alarm ${id} updated successfully`);
    } else {
      console.warn(`⚠️ Failed to update alarm ${id} - alarm not found`);
    }
    
    return updatedAlarm;
  }

  /**
   * Delete an alarm with cancellation
   */
  static async deleteAlarm(id: string): Promise<boolean> {
    console.log(`🗑️ Deleting alarm ${id}...`);
    
    // Cancel the scheduled alarm first
    await AlarmScheduler.cancelAlarm(id);
    
    // Then delete from storage
    const success = await StorageService.deleteAlarm(id);
    
    if (success) {
      console.log(`✅ Alarm ${id} deleted successfully`);
      
      // Clean up any orphaned notifications
      await AlarmScheduler.cleanupOrphanedNotifications();
    } else {
      console.warn(`⚠️ Failed to delete alarm ${id}`);
    }
    
    return success;
  }

  /**
   * Toggle alarm on/off with scheduling
   */
  static async toggleAlarm(id: string): Promise<Alarm | null> {
    console.log(`🔄 Toggling alarm ${id}...`);
    
    const updatedAlarm = await StorageService.toggleAlarm(id);
    
    if (updatedAlarm) {
      // Reschedule based on new enabled state
      await AlarmScheduler.rescheduleAlarm(updatedAlarm);
      
      // Validate the scheduling worked
      await AlarmScheduler.validateScheduledNotifications();
      
      console.log(`✅ Alarm ${id} toggled to ${updatedAlarm.isEnabled ? 'enabled' : 'disabled'}`);
    } else {
      console.warn(`⚠️ Failed to toggle alarm ${id} - alarm not found`);
    }
    
    return updatedAlarm;
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
   * Create a quick alarm with default settings and automatic scheduling
   */
  static async createQuickAlarm(time: string, label?: string): Promise<Alarm> {
    const settings = await StorageService.getUserSettings();
    
    // Calculate endTime as 1 hour after start time
    const [hours, minutes] = time.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
    const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    
    const alarmData: CreateAlarmData = {
      time,
      endTime,
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
   * Get next alarm that will trigger (using AlarmScheduler)
   */
  static async getNextAlarm(): Promise<Alarm | null> {
    const nextTime = AlarmScheduler.getNextAlarmTime();
    
    if (!nextTime) {
      return null;
    }

    // Get the alarm that matches this next time
    const enabledAlarms = await this.getEnabledAlarms();
    const nextTimeString = `${nextTime.getHours().toString().padStart(2, '0')}:${nextTime.getMinutes().toString().padStart(2, '0')}`;
    
    // Find alarm with matching time
    return enabledAlarms.find(alarm => alarm.time === nextTimeString) || null;
  }

  /**
   * Refresh all alarm scheduling
   */
  static async refreshScheduling(): Promise<void> {
    await AlarmScheduler.scheduleAllAlarms();
  }

  /**
   * Get scheduling info for debugging
   */
  static getSchedulingInfo(): Record<string, any> {
    return AlarmScheduler.getScheduledAlarmsInfo();
  }

  // Additional scheduling methods:
  // - snoozeAlarm() - Handle snooze functionality (reschedule for 5-10 minutes later)
  // - completeAlarm() - Mark alarm as completed with puzzle solution
  // - triggerAlarm() - Handle alarm triggering logic (will be called from App.tsx)
}

export default AlarmService;
