import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alarm,
  UserSettings,
  AlarmStats,
  AlarmEvent,
  CreateAlarmData,
  UpdateAlarmData,
  PuzzleType,
} from '../types';

// Storage keys
const STORAGE_KEYS = {
  ALARMS: '@altrise:alarms',
  USER_SETTINGS: '@altrise:user_settings',
  ALARM_STATS: '@altrise:alarm_stats',
  ALARM_EVENTS: '@altrise:alarm_events',
} as const;

// Default values
const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultPuzzleType: PuzzleType.NONE,
  defaultSound: 'default_alarm.mp3',
  onboardingCompleted: false,
  permissionsGranted: {
    notifications: false,
    exactAlarm: false,
    wakelock: false,
  },
  theme: 'auto',
  defaultVibration: true,
  snoozeInterval: 5,
  maxSnoozeCount: 3,
};

const DEFAULT_ALARM_STATS: AlarmStats = {
  totalAlarms: 0,
  alarmsTriggered: 0,
  alarmsCompleted: 0,
  alarmsSnoozed: 0,
  averageSolveTime: 0,
  puzzleStats: {
    [PuzzleType.NONE]: { attempted: 0, completed: 0, averageTime: 0 },
    [PuzzleType.MATH]: { attempted: 0, completed: 0, averageTime: 0 },
    [PuzzleType.MEMORY]: { attempted: 0, completed: 0, averageTime: 0 },
    [PuzzleType.PATTERN]: { attempted: 0, completed: 0, averageTime: 0 },
    [PuzzleType.SEQUENCE]: { attempted: 0, completed: 0, averageTime: 0 },
    [PuzzleType.QR_CODE]: { attempted: 0, completed: 0, averageTime: 0 },
    [PuzzleType.SHAKE]: { attempted: 0, completed: 0, averageTime: 0 },
  },
  lastUpdated: new Date().toISOString(),
};

export class StorageService {
  // ==================== ALARM CRUD OPERATIONS ====================

  /**
   * Create a new alarm
   */
  static async createAlarm(alarmData: CreateAlarmData): Promise<Alarm> {
    try {
      const alarms = await this.getAllAlarms();
      const newAlarm: Alarm = {
        id: this.generateId(),
        ...alarmData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      alarms.push(newAlarm);
      await this.storeData(STORAGE_KEYS.ALARMS, alarms);

      // Update stats
      await this.updateAlarmStats({ totalAlarms: alarms.length });

      return newAlarm;
    } catch (error) {
      console.error('Error creating alarm:', error);
      throw new Error('Failed to create alarm');
    }
  }

  /**
   * Get all alarms
   */
  static async getAllAlarms(): Promise<Alarm[]> {
    try {
      const alarms = await this.getData(STORAGE_KEYS.ALARMS);
      return alarms || [];
    } catch (error) {
      console.error('Error getting alarms:', error);
      return [];
    }
  }

  /**
   * Get alarm by ID
   */
  static async getAlarmById(id: string): Promise<Alarm | null> {
    try {
      const alarms = await this.getAllAlarms();
      return alarms.find(alarm => alarm.id === id) || null;
    } catch (error) {
      console.error('Error getting alarm by ID:', error);
      return null;
    }
  }

  /**
   * Update an existing alarm
   */
  static async updateAlarm(id: string, updateData: UpdateAlarmData): Promise<Alarm | null> {
    try {
      const alarms = await this.getAllAlarms();
      const alarmIndex = alarms.findIndex(alarm => alarm.id === id);

      if (alarmIndex === -1) {
        throw new Error('Alarm not found');
      }

      const updatedAlarm: Alarm = {
        ...alarms[alarmIndex],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      alarms[alarmIndex] = updatedAlarm;
      await this.storeData(STORAGE_KEYS.ALARMS, alarms);

      return updatedAlarm;
    } catch (error) {
      console.error('Error updating alarm:', error);
      return null;
    }
  }

  /**
   * Delete an alarm
   */
  static async deleteAlarm(id: string): Promise<boolean> {
    try {
      const alarms = await this.getAllAlarms();
      const filteredAlarms = alarms.filter(alarm => alarm.id !== id);

      if (filteredAlarms.length === alarms.length) {
        // No alarm was deleted
        return false;
      }

      await this.storeData(STORAGE_KEYS.ALARMS, filteredAlarms);

      // Update stats
      await this.updateAlarmStats({ totalAlarms: filteredAlarms.length });

      return true;
    } catch (error) {
      console.error('Error deleting alarm:', error);
      return false;
    }
  }

  /**
   * Get enabled alarms only
   */
  static async getEnabledAlarms(): Promise<Alarm[]> {
    try {
      const alarms = await this.getAllAlarms();
      return alarms.filter(alarm => alarm.isEnabled);
    } catch (error) {
      console.error('Error getting enabled alarms:', error);
      return [];
    }
  }

  /**
   * Toggle alarm enabled state
   */
  static async toggleAlarm(id: string): Promise<Alarm | null> {
    try {
      const alarm = await this.getAlarmById(id);
      if (!alarm) return null;

      return await this.updateAlarm(id, { isEnabled: !alarm.isEnabled });
    } catch (error) {
      console.error('Error toggling alarm:', error);
      return null;
    }
  }

  // ==================== USER SETTINGS OPERATIONS ====================

  /**
   * Get user settings
   */
  static async getUserSettings(): Promise<UserSettings> {
    try {
      const settings = await this.getData(STORAGE_KEYS.USER_SETTINGS);
      return { ...DEFAULT_USER_SETTINGS, ...settings };
    } catch (error) {
      console.error('Error getting user settings:', error);
      return DEFAULT_USER_SETTINGS;
    }
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(settingsUpdate: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const currentSettings = await this.getUserSettings();
      const updatedSettings = { ...currentSettings, ...settingsUpdate };
      await this.storeData(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw new Error('Failed to update user settings');
    }
  }

  /**
   * Reset user settings to defaults
   */
  static async resetUserSettings(): Promise<UserSettings> {
    try {
      await this.storeData(STORAGE_KEYS.USER_SETTINGS, DEFAULT_USER_SETTINGS);
      return DEFAULT_USER_SETTINGS;
    } catch (error) {
      console.error('Error resetting user settings:', error);
      throw new Error('Failed to reset user settings');
    }
  }

  // ==================== ALARM STATS OPERATIONS ====================

  /**
   * Get alarm statistics
   */
  static async getAlarmStats(): Promise<AlarmStats> {
    try {
      const stats = await this.getData(STORAGE_KEYS.ALARM_STATS);
      return { ...DEFAULT_ALARM_STATS, ...stats };
    } catch (error) {
      console.error('Error getting alarm stats:', error);
      return DEFAULT_ALARM_STATS;
    }
  }

  /**
   * Update alarm statistics
   */
  static async updateAlarmStats(statsUpdate: Partial<AlarmStats>): Promise<AlarmStats> {
    try {
      const currentStats = await this.getAlarmStats();
      const updatedStats = {
        ...currentStats,
        ...statsUpdate,
        lastUpdated: new Date().toISOString(),
      };
      await this.storeData(STORAGE_KEYS.ALARM_STATS, updatedStats);
      return updatedStats;
    } catch (error) {
      console.error('Error updating alarm stats:', error);
      throw new Error('Failed to update alarm stats');
    }
  }

  /**
   * Record an alarm event for statistics
   */
  static async recordAlarmEvent(event: AlarmEvent): Promise<void> {
    try {
      // Store the event
      const events = await this.getAlarmEvents();
      events.push(event);
      await this.storeData(STORAGE_KEYS.ALARM_EVENTS, events);

      // Update stats
      const stats = await this.getAlarmStats();
      const updatedStats: Partial<AlarmStats> = {
        alarmsTriggered: stats.alarmsTriggered + 1,
        alarmsCompleted: event.puzzleCompleted ? stats.alarmsCompleted + 1 : stats.alarmsCompleted,
        alarmsSnoozed: stats.alarmsSnoozed + event.snoozedCount,
      };

      // Update puzzle-specific stats if applicable
      const alarm = await this.getAlarmById(event.alarmId);
      if (alarm && event.puzzleCompleted && event.solveTime) {
        const puzzleType = alarm.puzzleType;
        const puzzleStats = stats.puzzleStats[puzzleType];
        updatedStats.puzzleStats = {
          ...stats.puzzleStats,
          [puzzleType]: {
            attempted: puzzleStats.attempted + 1,
            completed: puzzleStats.completed + 1,
            averageTime: this.calculateNewAverage(
              puzzleStats.averageTime,
              puzzleStats.completed,
              event.solveTime
            ),
          },
        };
      }

      await this.updateAlarmStats(updatedStats);
    } catch (error) {
      console.error('Error recording alarm event:', error);
      throw new Error('Failed to record alarm event');
    }
  }

  // ==================== ALARM EVENTS OPERATIONS ====================

  /**
   * Get all alarm events
   */
  static async getAlarmEvents(): Promise<AlarmEvent[]> {
    try {
      const events = await this.getData(STORAGE_KEYS.ALARM_EVENTS);
      return events || [];
    } catch (error) {
      console.error('Error getting alarm events:', error);
      return [];
    }
  }

  /**
   * Clear old alarm events (keep only last 30 days)
   */
  static async clearOldEvents(): Promise<void> {
    try {
      const events = await this.getAlarmEvents();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentEvents = events.filter(
        event => new Date(event.triggeredAt) >= thirtyDaysAgo
      );

      await this.storeData(STORAGE_KEYS.ALARM_EVENTS, recentEvents);
    } catch (error) {
      console.error('Error clearing old events:', error);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Clear all app data
   */
  static async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ALARMS),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_SETTINGS),
        AsyncStorage.removeItem(STORAGE_KEYS.ALARM_STATS),
        AsyncStorage.removeItem(STORAGE_KEYS.ALARM_EVENTS),
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw new Error('Failed to clear app data');
    }
  }

  /**
   * Export all data for backup
   */
  static async exportData(): Promise<string> {
    try {
      const [alarms, settings, stats, events] = await Promise.all([
        this.getAllAlarms(),
        this.getUserSettings(),
        this.getAlarmStats(),
        this.getAlarmEvents(),
      ]);

      return JSON.stringify({
        alarms,
        settings,
        stats,
        events,
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private static async storeData(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error storing data:', error);
      throw error;
    }
  }

  private static async getData(key: string): Promise<any> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error getting data:', error);
      throw error;
    }
  }

  private static generateId(): string {
    return `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static calculateNewAverage(
    currentAverage: number,
    count: number,
    newValue: number
  ): number {
    return (currentAverage * count + newValue) / (count + 1);
  }
}

export default StorageService;
