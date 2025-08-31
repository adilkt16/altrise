// Utility functions for time formatting and calculations

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatTimeForDisplay = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const parseTimeString = (timeString: string): Date => {
  const [time, period] = timeString.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  const date = new Date();
  let hour24 = hours;
  
  if (period === 'PM' && hours !== 12) {
    hour24 += 12;
  } else if (period === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  date.setHours(hour24, minutes, 0, 0);
  return date;
};

export const getDayName = (dayIndex: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
};

export const getShortDayName = (dayIndex: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex];
};

export const formatTime24Hour = (timeString: string): string => {
  // Convert HH:MM format to display format
  return timeString;
};

export const formatTime12Hour = (timeString: string): string => {
  // Convert 24-hour format (HH:MM) to 12-hour format
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const formatTimeForCard = (timeString: string, use24Hour: boolean = false): string => {
  return use24Hour ? formatTime24Hour(timeString) : formatTime12Hour(timeString);
};

export const getRepeatDaysText = (repeatDays: number[]): string => {
  if (repeatDays.length === 0) return 'Never';
  if (repeatDays.length === 7) return 'Every day';
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return repeatDays.map(day => dayNames[day]).join(', ');
};
