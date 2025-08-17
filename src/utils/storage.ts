// Legacy storage utility functions - kept for compatibility
// New code should use StorageService instead

import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  ALARMS: '@altrise:alarms',
  SETTINGS: '@altrise:user_settings',
  ALARM_STATS: '@altrise:alarm_stats',
  ALARM_EVENTS: '@altrise:alarm_events',
  USER_PREFERENCES: '@altrise:user_preferences', // Legacy key
} as const;

/**
 * @deprecated Use StorageService.storeData instead
 */
export const storeData = async (key: string, value: any): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error('Error storing data:', error);
    throw error;
  }
};

/**
 * @deprecated Use StorageService.getData instead
 */
export const getData = async (key: string): Promise<any> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error getting data:', error);
    throw error;
  }
};

/**
 * @deprecated Use StorageService methods instead
 */
export const removeData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing data:', error);
    throw error;
  }
};

/**
 * @deprecated Use StorageService.clearAllData instead
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw error;
  }
};
