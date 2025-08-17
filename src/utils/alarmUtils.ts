// Validation and helper functions for alarm data

import { Alarm, CreateAlarmData, WeekDay, PuzzleType } from '../types';

/**
 * Validate time format (HH:MM in 24-hour format)
 */
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Validate alarm data before creation
 */
export const validateAlarmData = (data: CreateAlarmData): string[] => {
  const errors: string[] = [];

  if (!isValidTimeFormat(data.time)) {
    errors.push('Invalid time format. Use HH:MM (24-hour format)');
  }

  if (data.endTime && !isValidTimeFormat(data.endTime)) {
    errors.push('Invalid end time format. Use HH:MM (24-hour format)');
  }

  if (data.endTime) {
    const [startHour, startMin] = data.time.split(':').map(Number);
    const [endHour, endMin] = data.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      errors.push('End time must be after start time');
    }
  }

  if (!Object.values(PuzzleType).includes(data.puzzleType)) {
    errors.push('Invalid puzzle type');
  }

  if (!data.soundFile || data.soundFile.trim() === '') {
    errors.push('Sound file is required');
  }

  // Validate repeat days
  const validDays = Object.values(WeekDay).filter(v => typeof v === 'number') as WeekDay[];
  const invalidDays = data.repeatDays.filter(day => !validDays.includes(day));
  if (invalidDays.length > 0) {
    errors.push('Invalid repeat days specified');
  }

  return errors;
};

/**
 * Convert 12-hour time format to 24-hour format
 */
export const convertTo24Hour = (time12h: string): string => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (hours === 12) {
    hours = 0;
  }

  if (modifier === 'PM') {
    hours += 12;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Convert 24-hour time format to 12-hour format
 */
export const convertTo12Hour = (time24h: string): string => {
  const [hours, minutes] = time24h.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Get time difference in minutes
 */
export const getTimeDifferenceInMinutes = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes - startMinutes;
};

/**
 * Check if current time is within alarm range
 */
export const isTimeInRange = (currentTime: string, startTime: string, endTime?: string): boolean => {
  if (!endTime) return currentTime === startTime;
  
  const [currentHour, currentMin] = currentTime.split(':').map(Number);
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const current = currentHour * 60 + currentMin;
  const start = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;
  
  return current >= start && current <= end;
};

/**
 * Format repeat days for display
 */
export const formatRepeatDays = (repeatDays: WeekDay[]): string => {
  if (repeatDays.length === 0) return 'Once';
  if (repeatDays.length === 7) return 'Every day';
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sortedDays = [...repeatDays].sort();
  
  // Check for weekdays (Mon-Fri)
  if (sortedDays.length === 5 && 
      sortedDays.every(day => day >= WeekDay.MONDAY && day <= WeekDay.FRIDAY)) {
    return 'Weekdays';
  }
  
  // Check for weekends (Sat-Sun)
  if (sortedDays.length === 2 && 
      sortedDays.includes(WeekDay.SATURDAY) && 
      sortedDays.includes(WeekDay.SUNDAY)) {
    return 'Weekends';
  }
  
  return sortedDays.map(day => dayNames[day]).join(', ');
};

/**
 * Get next occurrence of alarm
 */
export const getNextOccurrence = (alarm: Alarm): Date | null => {
  const now = new Date();
  const [hours, minutes] = alarm.time.split(':').map(Number);
  
  if (alarm.repeatDays.length === 0) {
    // One-time alarm
    const alarmDate = new Date();
    alarmDate.setHours(hours, minutes, 0, 0);
    
    if (alarmDate <= now) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }
    
    return alarmDate;
  }
  
  // Repeating alarm
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + dayOffset);
    checkDate.setHours(hours, minutes, 0, 0);
    
    const dayOfWeek = checkDate.getDay() as WeekDay;
    
    if (alarm.repeatDays.includes(dayOfWeek) && checkDate > now) {
      return checkDate;
    }
  }
  
  return null;
};

/**
 * Check if alarm is overdue (for one-time alarms)
 */
export const isAlarmOverdue = (alarm: Alarm): boolean => {
  if (alarm.repeatDays.length > 0) return false; // Repeating alarms can't be overdue
  
  const now = new Date();
  const [hours, minutes] = alarm.time.split(':').map(Number);
  const alarmTime = new Date();
  alarmTime.setHours(hours, minutes, 0, 0);
  
  return alarmTime < now;
};
