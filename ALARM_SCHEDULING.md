# AltRise Alarm Scheduling System

## Overview
The AltRise alarm scheduling system provides reliable alarm scheduling and triggering using Expo notifications. The system automatically handles repeat logic, end times, and app state changes.

## Core Components

### 1. AlarmScheduler (`src/services/AlarmScheduler.ts`)
The main scheduling engine that handles:
- ✅ **Scheduling notifications** for enabled alarms
- ✅ **Repeat logic** based on `repeatDays` array
- ✅ **End time notifications** for alarms with duration
- ✅ **Automatic rescheduling** for weekly cycles
- ✅ **System notification integration** with proper triggers

### 2. AlarmService (`src/services/AlarmService.ts`)
Enhanced service that now includes:
- ✅ **Automatic scheduling** when alarms are created/updated
- ✅ **Automatic cancellation** when alarms are deleted
- ✅ **Rescheduling** when alarms are toggled or modified
- ✅ **Next alarm calculation** using scheduler data

### 3. App.tsx Integration
The main app now includes:
- ✅ **Notification listeners** for foreground and background
- ✅ **App state handling** for scheduling refresh
- ✅ **Alarm trigger detection** with puzzle type info
- ✅ **Automatic initialization** on app startup

## How It Works

### Alarm Creation Flow
1. User creates/edits alarm via UI
2. `AlarmService.createAlarm()` saves to storage
3. `AlarmScheduler.scheduleAlarm()` creates system notifications
4. Notifications scheduled for next 7 days (rolling window)

### Alarm Triggering Flow
1. System notification fires at scheduled time
2. App receives notification via listeners
3. `handleNotificationReceived()` processes alarm data
4. Shows alarm UI with puzzle type from notification data

### Repeat Logic
- **No repeat days**: One-time alarm for today only
- **With repeat days**: Alarm triggers on specified days (0=Sunday, 6=Saturday)
- **Auto-rescheduling**: New notifications created as old ones trigger

### End Time Handling
- If alarm has `endTime`, creates second notification
- End notification marked with `isEndTime: true`
- Automatically calculates next day if end time is before start time

## Usage Examples

### Basic Alarm Creation
```typescript
import { AlarmService } from './src/services/AlarmService';
import { WeekDay, PuzzleType } from './src/types';

// Create a one-time alarm
const alarm = await AlarmService.createAlarm({
  time: '07:30',
  isEnabled: true,
  repeatDays: [], // One-time
  puzzleType: PuzzleType.MATH,
  soundFile: 'default_alarm.mp3',
  vibrationEnabled: true,
  label: 'Morning Alarm',
});
```

### Daily Alarm
```typescript
// Create a daily alarm
const dailyAlarm = await AlarmService.createAlarm({
  time: '06:00',
  isEnabled: true,
  repeatDays: [
    WeekDay.MONDAY,
    WeekDay.TUESDAY,
    WeekDay.WEDNESDAY,
    WeekDay.THURSDAY,
    WeekDay.FRIDAY,
  ], // Weekdays only
  puzzleType: PuzzleType.PATTERN,
  soundFile: 'default_alarm.mp3',
  vibrationEnabled: true,
  label: 'Weekday Alarm',
});
```

### Alarm with End Time
```typescript
// Alarm that auto-ends after duration
const timedAlarm = await AlarmService.createAlarm({
  time: '08:00',
  endTime: '08:30', // Ends after 30 minutes
  isEnabled: true,
  repeatDays: [WeekDay.SUNDAY], // Sunday only
  puzzleType: PuzzleType.NONE,
  soundFile: 'default_alarm.mp3',
  vibrationEnabled: true,
  label: 'Sunday Timer',
});
```

## Testing the System

Use the provided test utility:
```typescript
import { testAlarmScheduling, cleanupTestAlarms } from './src/utils/alarmSchedulingTest';

// Create test alarms (2 min and 5 min from now)
const testIds = await testAlarmScheduling();

// Wait for notifications, then cleanup
setTimeout(async () => {
  await cleanupTestAlarms(testIds);
}, 10 * 60 * 1000); // 10 minutes
```

## Debugging

### Check Scheduled Alarms
```typescript
import { AlarmService } from './src/services/AlarmService';

// Get scheduling info
const info = AlarmService.getSchedulingInfo();
console.log('Scheduled alarms:', info);

// Get next alarm
const next = await AlarmService.getNextAlarm();
console.log('Next alarm:', next);
```

### Manual Refresh
```typescript
// Force refresh all scheduling
await AlarmService.refreshScheduling();
```

## App State Handling

The system automatically handles:
- **App backgrounded**: Notifications continue via system
- **App killed**: Notifications continue via system
- **App reopened**: Scheduling refreshed automatically
- **System reboot**: Notifications persist in Expo managed workflow

## Technical Notes

### Notification Data Structure
Each scheduled notification includes:
```typescript
{
  alarmId: string,           // Links to stored alarm
  isEndTime: boolean,        // True for end-time notifications
  puzzleType: PuzzleType,    // For alarm UI
}
```

### Scheduling Window
- Notifications scheduled for **next 7 days**
- **Rolling window**: As notifications trigger, new ones are scheduled
- **Daily refresh**: When app becomes active

### Permission Requirements
- **Notifications**: Required for basic alarms
- **Exact Alarms**: Android 12+ for precise timing
- **Display Over Apps**: For alarm UI when phone is locked

## Next Steps

This system provides the foundation for:
1. **Puzzle Modals**: Use `puzzleType` from notification data
2. **Sound Playing**: Extend notification with custom sounds
3. **Snooze Logic**: Reschedule notifications with delay
4. **Statistics**: Track alarm completion rates
5. **Advanced UI**: Full-screen alarm interfaces

The core scheduling is now complete and reliable! 🎉
