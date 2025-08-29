// Data models and TypeScript interfaces for AltRise alarm app

export interface Alarm {
  id: string;
  time: string; // Format: "HH:MM" (24-hour format)
  endTime: string; // Required end time for alarms with duration
  isEnabled: boolean;
  repeatDays: WeekDay[]; // Array of days when alarm repeats
  puzzleType: PuzzleType;
  soundFile: string; // Path or identifier for alarm sound
  vibrationEnabled: boolean;
  label?: string; // Optional custom label for the alarm
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface UserSettings {
  defaultPuzzleType: PuzzleType;
  defaultSound: string;
  onboardingCompleted: boolean;
  permissionsGranted: {
    notifications: boolean;
    exactAlarm: boolean;
    wakelock: boolean;
    displayOverOtherApps: boolean;
  };
  permissionsLastChecked: string; // ISO date string
  theme: 'light' | 'dark' | 'auto';
  defaultVibration: boolean;
  snoozeInterval: number; // Minutes
  maxSnoozeCount: number;
}

export interface AlarmStats {
  totalAlarms: number;
  alarmsTriggered: number;
  alarmsCompleted: number; // Successfully turned off
  alarmsSnoozed: number;
  averageSolveTime: number; // In seconds
  puzzleStats: {
    [key in PuzzleType]: {
      attempted: number;
      completed: number;
      averageTime: number;
    };
  };
  lastUpdated: string; // ISO date string
}

export enum WeekDay {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export enum PuzzleType {
  NONE = 'none',
  BASIC_MATH = 'basic_math',
  NUMBER_SEQUENCE = 'number_sequence',
  MATH = 'math', // Legacy support
  MEMORY = 'memory',
  PATTERN = 'pattern',
  SEQUENCE = 'sequence', // Legacy support
  QR_CODE = 'qr_code',
  SHAKE = 'shake',
}

export interface AlarmEvent {
  alarmId: string;
  triggeredAt: string; // ISO date string
  completedAt?: string; // ISO date string
  snoozedCount: number;
  solveTime?: number; // In seconds
  puzzleCompleted: boolean;
}

// Helper type for alarm creation (without generated fields)
export type CreateAlarmData = Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'>;

// Helper type for alarm updates (partial data)
export type UpdateAlarmData = Partial<Omit<Alarm, 'id' | 'createdAt'>> & {
  updatedAt?: string;
};
