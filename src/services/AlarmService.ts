// AlarmService - Handles alarm creation, scheduling, and management
// This will be implemented in future iterations

export interface Alarm {
  id: string;
  time: string;
  label: string;
  isActive: boolean;
  repeatDays: string[];
  sound: string;
}

export class AlarmService {
  // Future implementation will include:
  // - scheduleAlarm()
  // - cancelAlarm()
  // - getAlarms()
  // - updateAlarm()
  // - deleteAlarm()

  static async getAlarms(): Promise<Alarm[]> {
    // Placeholder - will implement AsyncStorage integration
    return [];
  }

  static async createAlarm(alarm: Omit<Alarm, 'id'>): Promise<Alarm> {
    // Placeholder - will implement alarm creation logic
    const newAlarm: Alarm = {
      id: Date.now().toString(),
      ...alarm,
    };
    return newAlarm;
  }
}

export default AlarmService;
