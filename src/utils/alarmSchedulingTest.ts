// Test script to verify alarm scheduling functionality
// Run this in the React Native app to test the AlarmScheduler

import { AlarmScheduler } from '../services/AlarmScheduler';
import { AlarmService } from '../services/AlarmService';
import { WeekDay, PuzzleType } from '../types';

export const testAlarmScheduling = async () => {
  try {
    console.log('🧪 Starting Alarm Scheduling Test...');

    // Test 1: Create a test alarm for 2 minutes from now
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

    // Test 2: Create a daily alarm for 5 minutes from now
    const dailyTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    const dailyTimeString = `${dailyTime.getHours().toString().padStart(2, '0')}:${dailyTime.getMinutes().toString().padStart(2, '0')}`;

    console.log(`📅 Creating daily alarm for ${dailyTimeString} (5 minutes from now)`);

    const dailyAlarm = await AlarmService.createAlarm({
      time: dailyTimeString,
      isEnabled: true,
      repeatDays: [
        WeekDay.SUNDAY,
        WeekDay.MONDAY,
        WeekDay.TUESDAY,
        WeekDay.WEDNESDAY,
        WeekDay.THURSDAY,
        WeekDay.FRIDAY,
        WeekDay.SATURDAY,
      ], // Every day
      puzzleType: PuzzleType.MATH,
      soundFile: 'default_alarm.mp3',
      vibrationEnabled: true,
      label: 'Daily Test Alarm - 5 min',
    });

    console.log(`✅ Daily alarm created: ${dailyAlarm.id}`);

    // Test 3: Check scheduling info
    console.log('📊 Current scheduling info:');
    const schedulingInfo = AlarmService.getSchedulingInfo();
    console.log(JSON.stringify(schedulingInfo, null, 2));

    // Test 4: Get next alarm
    const nextAlarm = await AlarmService.getNextAlarm();
    if (nextAlarm) {
      console.log(`⏰ Next alarm: ${nextAlarm.label} at ${nextAlarm.time}`);
    } else {
      console.log('⚠️ No next alarm found');
    }

    console.log('✅ Alarm scheduling test completed successfully!');
    console.log('🔔 Watch for notifications in 2 and 5 minutes...');

    // Return test alarm IDs for cleanup
    return [testAlarm.id, dailyAlarm.id];

  } catch (error) {
    console.error('❌ Alarm scheduling test failed:', error);
    throw error;
  }
};

export const cleanupTestAlarms = async (alarmIds: string[]) => {
  try {
    console.log('🧹 Cleaning up test alarms...');
    
    for (const id of alarmIds) {
      await AlarmService.deleteAlarm(id);
      console.log(`🗑️ Deleted test alarm: ${id}`);
    }
    
    console.log('✅ Test alarm cleanup completed');
  } catch (error) {
    console.error('❌ Error cleaning up test alarms:', error);
  }
};
