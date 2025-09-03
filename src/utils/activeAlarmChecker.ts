// Utility to check for active alarms during app startup
import { AlarmService } from '../services/AlarmService';
import { Alarm } from '../types';

export interface ActiveAlarmInfo {
  alarm: Alarm;
  isActive: boolean;
  timeUntilEnd: number; // milliseconds
}

/**
 * Check if there are any alarms currently active (between start and end time)
 */
export const checkForActiveAlarms = async (): Promise<ActiveAlarmInfo | null> => {
  try {
    console.log('🔍 [ActiveAlarmChecker] Checking for active alarms...');
    
    // Add at the beginning
    const { AlarmForegroundService } = require('../services/AlarmForegroundService');
    
    // Check if there's already an active foreground alarm
    try {
      const activeServiceAlarm = await AlarmForegroundService.checkActiveAlarm();
      if (activeServiceAlarm) {
        console.log('🚨 Found active foreground alarm service');
        return {
          alarm: activeServiceAlarm,
          isActive: true,
          timeUntilEnd: activeServiceAlarm.endTime 
            ? new Date(activeServiceAlarm.endTime).getTime() - Date.now()
            : 60000, // Default 1 minute if no end time
        };
      }
    } catch (error) {
      console.log('⚠️ [ActiveAlarmChecker] Could not check foreground service:', error);
    }
    
    const alarms = await AlarmService.getAlarms();
    const currentTime = new Date();
    const currentDay = currentTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    console.log(`🔍 [ActiveAlarmChecker] Current time: ${currentTime.toLocaleString()}, Day: ${currentDay}`);
    console.log(`🔍 [ActiveAlarmChecker] Found ${alarms.length} total alarms`);
    
    for (const alarm of alarms) {
      if (!alarm.isEnabled) {
        console.log(`⏸️ [ActiveAlarmChecker] Alarm ${alarm.id} is disabled, skipping`);
        continue;
      }
      
      // Check if alarm should repeat on current day
      if (alarm.repeatDays && alarm.repeatDays.length > 0 && !alarm.repeatDays.includes(currentDay)) {
        console.log(`📅 [ActiveAlarmChecker] Alarm ${alarm.id} doesn't repeat on day ${currentDay}, skipping`);
        continue;
      }
      
      // Parse alarm times
      const [startHours, startMinutes] = alarm.time.split(':').map(Number);
      const [endHours, endMinutes] = alarm.endTime.split(':').map(Number);
      
      // Create start and end times for today
      const startTime = new Date();
      startTime.setHours(startHours, startMinutes, 0, 0);
      
      const endTime = new Date();
      endTime.setHours(endHours, endMinutes, 0, 0);
      
      // Handle end time on next day if it's earlier than start time
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }
      
      console.log(`⏰ [ActiveAlarmChecker] Alarm ${alarm.id} (${alarm.label || 'Unnamed'})`);
      console.log(`   Start: ${startTime.toLocaleString()}`);
      console.log(`   End: ${endTime.toLocaleString()}`);
      console.log(`   Current: ${currentTime.toLocaleString()}`);
      
      // Check if current time is within alarm period
      if (currentTime >= startTime && currentTime <= endTime) {
        const timeUntilEnd = endTime.getTime() - currentTime.getTime();
        console.log(`🚨 [ActiveAlarmChecker] FOUND ACTIVE ALARM: ${alarm.id}`);
        console.log(`   Time until end: ${Math.round(timeUntilEnd / 1000)} seconds`);
        
        return {
          alarm,
          isActive: true,
          timeUntilEnd
        };
      }
    }
    
    console.log('✅ [ActiveAlarmChecker] No active alarms found');
    return null;
    
  } catch (error) {
    console.error('❌ [ActiveAlarmChecker] Error checking for active alarms:', error);
    return null;
  }
};

/**
 * Check if a specific alarm is currently active
 */
export const isAlarmCurrentlyActive = async (alarmId: string): Promise<boolean> => {
  const activeAlarm = await checkForActiveAlarms();
  return activeAlarm?.alarm.id === alarmId;
};
