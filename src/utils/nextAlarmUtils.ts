import { Alarm } from '../types';

export interface NextAlarmInfo {
  alarm: Alarm | null;
  timeUntil: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  } | null;
  isToday: boolean;
}

/**
 * Calculate the next alarm that will trigger
 */
export const getNextAlarm = (alarms: Alarm[]): NextAlarmInfo => {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  let nextAlarm: Alarm | null = null;
  let shortestTime = Infinity;
  let isToday = false;

  // Filter enabled alarms
  const enabledAlarms = alarms.filter(alarm => alarm.isEnabled);

  for (const alarm of enabledAlarms) {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const alarmTimeInSeconds = hours * 3600 + minutes * 60;

    // Check if alarm has repeat days
    if (alarm.repeatDays && alarm.repeatDays.length > 0) {
      // Check each repeat day
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDay = (currentDay + dayOffset) % 7;
        
        if (alarm.repeatDays.includes(targetDay)) {
          let timeUntilAlarm: number;
          
          if (dayOffset === 0) {
            // Today - check if alarm time hasn't passed
            if (alarmTimeInSeconds > currentTime) {
              timeUntilAlarm = alarmTimeInSeconds - currentTime;
              if (timeUntilAlarm < shortestTime) {
                shortestTime = timeUntilAlarm;
                nextAlarm = alarm;
                isToday = true;
              }
            }
          } else {
            // Future days
            timeUntilAlarm = (dayOffset * 24 * 3600) + alarmTimeInSeconds - currentTime;
            if (timeUntilAlarm < shortestTime) {
              shortestTime = timeUntilAlarm;
              nextAlarm = alarm;
              isToday = false;
            }
          }
        }
      }
    } else {
      // One-time alarm (no repeat days)
      if (alarmTimeInSeconds > currentTime) {
        // Alarm is today and hasn't passed yet
        const timeUntilAlarm = alarmTimeInSeconds - currentTime;
        if (timeUntilAlarm < shortestTime) {
          shortestTime = timeUntilAlarm;
          nextAlarm = alarm;
          isToday = true;
        }
      } else {
        // Alarm has passed today, so it's for tomorrow
        const timeUntilAlarm = (24 * 3600) + alarmTimeInSeconds - currentTime;
        if (timeUntilAlarm < shortestTime) {
          shortestTime = timeUntilAlarm;
          nextAlarm = alarm;
          isToday = false;
        }
      }
    }
  }

  if (!nextAlarm || shortestTime === Infinity) {
    return {
      alarm: null,
      timeUntil: null,
      isToday: false
    };
  }

  const hours = Math.floor(shortestTime / 3600);
  const minutes = Math.floor((shortestTime % 3600) / 60);
  const seconds = Math.floor(shortestTime % 60);

  return {
    alarm: nextAlarm,
    timeUntil: {
      hours,
      minutes,
      seconds,
      totalSeconds: shortestTime
    },
    isToday
  };
};

/**
 * Format time until next alarm in a human readable way
 */
export const formatTimeUntil = (timeUntil: { hours: number; minutes: number; seconds: number } | null): string => {
  if (!timeUntil) return '';
  
  const { hours, minutes, seconds } = timeUntil;
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ${minutes}m`;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get day name from day number
 */
export const getDayName = (dayNumber: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || '';
};

/**
 * Get short day name from day number
 */
export const getShortDayName = (dayNumber: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayNumber] || '';
};
