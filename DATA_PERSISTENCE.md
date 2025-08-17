# AltRise Data Persistence Layer

## Overview
This document outlines the data persistence architecture for the AltRise alarm clock app.

## Core Data Models

### 🚨 Alarm Interface
```typescript
interface Alarm {
  id: string;                 // Unique identifier
  time: string;              // Format: "HH:MM" (24-hour)
  endTime?: string;          // Optional end time for duration-based alarms
  isEnabled: boolean;        // Whether alarm is active
  repeatDays: WeekDay[];     // Days of week for recurring alarms
  puzzleType: PuzzleType;    // Type of puzzle to solve
  soundFile: string;         // Audio file identifier
  vibrationEnabled: boolean; // Vibration setting
  label?: string;           // Optional custom label
  createdAt: string;        // ISO date string
  updatedAt: string;        // ISO date string
}
```

### ⚙️ UserSettings Interface
```typescript
interface UserSettings {
  defaultPuzzleType: PuzzleType;
  defaultSound: string;
  onboardingCompleted: boolean;
  permissionsGranted: {
    notifications: boolean;
    exactAlarm: boolean;
    wakelock: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
  defaultVibration: boolean;
  snoozeInterval: number;    // Minutes
  maxSnoozeCount: number;
}
```

### 📊 AlarmStats Interface
```typescript
interface AlarmStats {
  totalAlarms: number;
  alarmsTriggered: number;
  alarmsCompleted: number;
  alarmsSnoozed: number;
  averageSolveTime: number;  // Seconds
  puzzleStats: {
    [key in PuzzleType]: {
      attempted: number;
      completed: number;
      averageTime: number;
    };
  };
  lastUpdated: string;
}
```

## Storage Service API

### 🔧 Alarm CRUD Operations
- `createAlarm(alarmData: CreateAlarmData): Promise<Alarm>`
- `getAllAlarms(): Promise<Alarm[]>`
- `getAlarmById(id: string): Promise<Alarm | null>`
- `updateAlarm(id: string, updateData: UpdateAlarmData): Promise<Alarm | null>`
- `deleteAlarm(id: string): Promise<boolean>`
- `getEnabledAlarms(): Promise<Alarm[]>`
- `toggleAlarm(id: string): Promise<Alarm | null>`

### ⚙️ Settings Operations
- `getUserSettings(): Promise<UserSettings>`
- `updateUserSettings(settingsUpdate: Partial<UserSettings>): Promise<UserSettings>`
- `resetUserSettings(): Promise<UserSettings>`

### 📊 Statistics Operations
- `getAlarmStats(): Promise<AlarmStats>`
- `updateAlarmStats(statsUpdate: Partial<AlarmStats>): Promise<AlarmStats>`
- `recordAlarmEvent(event: AlarmEvent): Promise<void>`

### 📱 Event Management
- `getAlarmEvents(): Promise<AlarmEvent[]>`
- `clearOldEvents(): Promise<void>` (removes events older than 30 days)

### 🔧 Utility Operations
- `clearAllData(): Promise<void>`
- `exportData(): Promise<string>` (JSON backup)

## Enums and Types

### WeekDay Enum
```typescript
enum WeekDay {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}
```

### PuzzleType Enum
```typescript
enum PuzzleType {
  NONE = 'none',
  MATH = 'math',
  MEMORY = 'memory',
  PATTERN = 'pattern',
  SEQUENCE = 'sequence',
  QR_CODE = 'qr_code',
  SHAKE = 'shake',
}
```

## Storage Keys
- `@altrise:alarms` - All alarm data
- `@altrise:user_settings` - User preferences and settings
- `@altrise:alarm_stats` - Usage statistics and analytics
- `@altrise:alarm_events` - Historical alarm trigger events

## Data Validation

### Time Format Validation
- Validates HH:MM format (24-hour)
- Ensures end time is after start time
- Checks for valid time ranges

### Alarm Data Validation
- Required fields validation
- Enum value validation
- Repeat days validation
- Sound file validation

## Usage Examples

### Creating an Alarm
```typescript
import { StorageService, PuzzleType, WeekDay } from './src';

const newAlarm = await StorageService.createAlarm({
  time: "07:30",
  isEnabled: true,
  repeatDays: [WeekDay.MONDAY, WeekDay.WEDNESDAY, WeekDay.FRIDAY],
  puzzleType: PuzzleType.MATH,
  soundFile: "gentle_wake.mp3",
  vibrationEnabled: true,
  label: "Morning Workout"
});
```

### Getting User Settings
```typescript
const settings = await StorageService.getUserSettings();
console.log('Default puzzle type:', settings.defaultPuzzleType);
```

### Recording Alarm Statistics
```typescript
await StorageService.recordAlarmEvent({
  alarmId: "alarm_123",
  triggeredAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  snoozedCount: 1,
  solveTime: 45, // seconds
  puzzleCompleted: true
});
```

## Migration and Compatibility

- Legacy storage utilities are marked as deprecated
- New code should use `StorageService` methods
- Automatic data migration handled by default value merging
- Backward compatibility maintained for existing storage keys

## Performance Considerations

- All operations are async and non-blocking
- Statistics calculation optimized with incremental updates
- Old events auto-cleanup (30-day retention)
- Efficient JSON serialization/deserialization
- Error handling with graceful fallbacks
