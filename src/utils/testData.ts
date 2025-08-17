// Test data utilities for development and testing
import { StorageService } from '../services/StorageService';
import { CreateAlarmData, WeekDay, PuzzleType } from '../types';

export const createSampleAlarms = async (): Promise<void> => {
  const sampleAlarms: CreateAlarmData[] = [
    {
      time: '07:00',
      isEnabled: true,
      repeatDays: [WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY, WeekDay.THURSDAY, WeekDay.FRIDAY],
      puzzleType: PuzzleType.MATH,
      soundFile: 'default_alarm.mp3',
      vibrationEnabled: true,
      label: 'Work Alarm',
    },
    {
      time: '09:00',
      endTime: '09:30',
      isEnabled: false,
      repeatDays: [WeekDay.SATURDAY, WeekDay.SUNDAY],
      puzzleType: PuzzleType.NONE,
      soundFile: 'gentle_wake.mp3',
      vibrationEnabled: false,
      label: 'Weekend Sleep-in',
    },
    {
      time: '22:30',
      isEnabled: true,
      repeatDays: [WeekDay.SUNDAY, WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY, WeekDay.THURSDAY],
      puzzleType: PuzzleType.SEQUENCE,
      soundFile: 'bedtime_chime.mp3',
      vibrationEnabled: true,
      label: 'Bedtime Reminder',
    },
    {
      time: '12:00',
      isEnabled: true,
      repeatDays: [],
      puzzleType: PuzzleType.NONE,
      soundFile: 'notification.mp3',
      vibrationEnabled: false,
      label: 'Lunch Break',
    },
  ];

  try {
    // Check if alarms already exist to avoid duplicates
    const existingAlarms = await StorageService.getAllAlarms();
    if (existingAlarms.length === 0) {
      for (const alarmData of sampleAlarms) {
        await StorageService.createAlarm(alarmData);
      }
      console.log('Sample alarms created successfully');
    } else {
      console.log('Alarms already exist, skipping sample data creation');
    }
  } catch (error) {
    console.error('Error creating sample alarms:', error);
  }
};

export const clearAllAlarms = async (): Promise<void> => {
  try {
    const alarms = await StorageService.getAllAlarms();
    for (const alarm of alarms) {
      await StorageService.deleteAlarm(alarm.id);
    }
    console.log('All alarms cleared');
  } catch (error) {
    console.error('Error clearing alarms:', error);
  }
};
