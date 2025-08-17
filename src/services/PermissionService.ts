import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform, Alert } from 'react-native';

// Permission states enum
export enum PermissionState {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNDETERMINED = 'undetermined',
  NEVER_ASK_AGAIN = 'never_ask_again',
  UNKNOWN = 'unknown',
}

// Permission types for the alarm app
export enum PermissionType {
  NOTIFICATIONS = 'notifications',
  DISPLAY_OVER_OTHER_APPS = 'display_over_other_apps',
  EXACT_ALARM = 'exact_alarm',
  WAKE_LOCK = 'wake_lock',
}

// Permission status interface
export interface PermissionStatus {
  state: PermissionState;
  canAskAgain: boolean;
  granted: boolean;
  message?: string;
}

// All permissions status
export interface AllPermissionsStatus {
  notifications: PermissionStatus;
  displayOverOtherApps: PermissionStatus;
  exactAlarm: PermissionStatus;
  wakeLock: PermissionStatus;
  allGranted: boolean;
  criticalGranted: boolean; // notifications + DOOA
}

export class PermissionService {
  private static readonly LOG_PREFIX = '[PermissionService]';

  // ==================== LOGGING UTILITIES ====================

  private static log(message: string, data?: any): void {
    console.log(`${this.LOG_PREFIX} ${message}`, data || '');
  }

  private static logError(message: string, error?: any): void {
    console.error(`${this.LOG_PREFIX} ERROR: ${message}`, error || '');
  }

  private static logWarning(message: string, data?: any): void {
    console.warn(`${this.LOG_PREFIX} WARNING: ${message}`, data || '');
  }

  // ==================== NOTIFICATION PERMISSIONS ====================

  /**
   * Check current notification permission status
   */
  static async checkNotificationPermissions(): Promise<PermissionStatus> {
    try {
      this.log('Checking notification permissions...');
      
      const settings = await Notifications.getPermissionsAsync();
      this.log('Notification permission settings:', settings);

      let state: PermissionState;
      let canAskAgain = true;

      switch (settings.status) {
        case 'granted':
          state = PermissionState.GRANTED;
          canAskAgain = false;
          break;
        case 'denied':
          // On Android, if user denied and can't ask again
          if (Platform.OS === 'android' && !settings.canAskAgain) {
            state = PermissionState.NEVER_ASK_AGAIN;
            canAskAgain = false;
          } else {
            state = PermissionState.DENIED;
            canAskAgain = settings.canAskAgain !== false;
          }
          break;
        case 'undetermined':
          state = PermissionState.UNDETERMINED;
          canAskAgain = true;
          break;
        default:
          state = PermissionState.UNKNOWN;
          canAskAgain = false;
      }

      const result: PermissionStatus = {
        state,
        canAskAgain,
        granted: state === PermissionState.GRANTED,
        message: this.getPermissionMessage(PermissionType.NOTIFICATIONS, state),
      };

      this.log('Notification permission status:', result);
      return result;
    } catch (error) {
      this.logError('Failed to check notification permissions', error);
      return {
        state: PermissionState.UNKNOWN,
        canAskAgain: false,
        granted: false,
        message: 'Unable to check notification permissions',
      };
    }
  }

  /**
   * Request notification permissions
   */
  static async requestNotificationPermissions(): Promise<PermissionStatus> {
    try {
      this.log('Requesting notification permissions...');
      
      const currentStatus = await this.checkNotificationPermissions();
      
      if (currentStatus.granted) {
        this.log('Notification permissions already granted');
        return currentStatus;
      }

      if (!currentStatus.canAskAgain) {
        this.log('Cannot ask for notification permissions again');
        return currentStatus;
      }

      const settings = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      this.log('Notification permission request result:', settings);

      let state: PermissionState;
      let canAskAgain = true;

      switch (settings.status) {
        case 'granted':
          state = PermissionState.GRANTED;
          canAskAgain = false;
          break;
        case 'denied':
          if (Platform.OS === 'android' && !settings.canAskAgain) {
            state = PermissionState.NEVER_ASK_AGAIN;
            canAskAgain = false;
          } else {
            state = PermissionState.DENIED;
            canAskAgain = settings.canAskAgain !== false;
          }
          break;
        default:
          state = PermissionState.DENIED;
          canAskAgain = settings.canAskAgain !== false;
      }

      const result: PermissionStatus = {
        state,
        canAskAgain,
        granted: state === PermissionState.GRANTED,
        message: this.getPermissionMessage(PermissionType.NOTIFICATIONS, state),
      };

      this.log('Final notification permission status:', result);
      return result;
    } catch (error) {
      this.logError('Failed to request notification permissions', error);
      return {
        state: PermissionState.UNKNOWN,
        canAskAgain: false,
        granted: false,
        message: 'Failed to request notification permissions',
      };
    }
  }

  // ==================== DISPLAY OVER OTHER APPS (DOOA) ====================

  /**
   * Check if Display Over Other Apps permission is granted
   * Note: This is Android-specific and cannot be directly checked in Expo
   */
  static async checkDisplayOverOtherAppsPermission(): Promise<PermissionStatus> {
    try {
      this.log('Checking Display Over Other Apps permission...');
      
      if (Platform.OS !== 'android') {
        this.log('DOOA permission not applicable on iOS');
        return {
          state: PermissionState.GRANTED,
          canAskAgain: false,
          granted: true,
          message: 'Not required on iOS',
        };
      }

      // In Expo managed workflow, we cannot directly check this permission
      // We'll assume it needs to be checked and provide guidance
      this.logWarning('DOOA permission cannot be directly checked in Expo managed workflow');
      
      return {
        state: PermissionState.UNDETERMINED,
        canAskAgain: true,
        granted: false,
        message: 'Display over other apps permission needs to be checked manually',
      };
    } catch (error) {
      this.logError('Failed to check DOOA permission', error);
      return {
        state: PermissionState.UNKNOWN,
        canAskAgain: false,
        granted: false,
        message: 'Unable to check display over other apps permission',
      };
    }
  }

  /**
   * Request Display Over Other Apps permission by opening Android settings
   */
  static async requestDisplayOverOtherAppsPermission(): Promise<PermissionStatus> {
    try {
      this.log('Requesting Display Over Other Apps permission...');
      
      if (Platform.OS !== 'android') {
        this.log('DOOA permission not applicable on iOS');
        return {
          state: PermissionState.GRANTED,
          canAskAgain: false,
          granted: true,
          message: 'Not required on iOS',
        };
      }

      await this.openDisplayOverOtherAppsSettings();
      
      // Since we can't directly check the result, return undetermined
      return {
        state: PermissionState.UNDETERMINED,
        canAskAgain: true,
        granted: false,
        message: 'Please enable "Display over other apps" in settings and return to the app',
      };
    } catch (error) {
      this.logError('Failed to request DOOA permission', error);
      return {
        state: PermissionState.UNKNOWN,
        canAskAgain: false,
        granted: false,
        message: 'Failed to open display over other apps settings',
      };
    }
  }

  // ==================== EXACT ALARM PERMISSION (Android 12+) ====================

  /**
   * Check exact alarm permission (Android 12+)
   */
  static async checkExactAlarmPermission(): Promise<PermissionStatus> {
    try {
      this.log('Checking exact alarm permission...');
      
      if (Platform.OS !== 'android') {
        this.log('Exact alarm permission not applicable on iOS');
        return {
          state: PermissionState.GRANTED,
          canAskAgain: false,
          granted: true,
          message: 'Not required on iOS',
        };
      }

      // In Expo managed workflow, we cannot directly check this permission
      // This would require native Android API calls
      this.logWarning('Exact alarm permission cannot be directly checked in Expo managed workflow');
      
      return {
        state: PermissionState.UNDETERMINED,
        canAskAgain: true,
        granted: false,
        message: 'Exact alarm permission needs to be checked manually',
      };
    } catch (error) {
      this.logError('Failed to check exact alarm permission', error);
      return {
        state: PermissionState.UNKNOWN,
        canAskAgain: false,
        granted: false,
        message: 'Unable to check exact alarm permission',
      };
    }
  }

  /**
   * Request exact alarm permission by opening Android settings
   */
  static async requestExactAlarmPermission(): Promise<PermissionStatus> {
    try {
      this.log('Requesting exact alarm permission...');
      
      if (Platform.OS !== 'android') {
        this.log('Exact alarm permission not applicable on iOS');
        return {
          state: PermissionState.GRANTED,
          canAskAgain: false,
          granted: true,
          message: 'Not required on iOS',
        };
      }

      await this.openExactAlarmSettings();
      
      return {
        state: PermissionState.UNDETERMINED,
        canAskAgain: true,
        granted: false,
        message: 'Please enable "Alarms & reminders" in settings and return to the app',
      };
    } catch (error) {
      this.logError('Failed to request exact alarm permission', error);
      return {
        state: PermissionState.UNKNOWN,
        canAskAgain: false,
        granted: false,
        message: 'Failed to open exact alarm settings',
      };
    }
  }

  // ==================== WAKE LOCK PERMISSION ====================

  /**
   * Check wake lock permission
   * This is usually automatically granted but included for completeness
   */
  static async checkWakeLockPermission(): Promise<PermissionStatus> {
    try {
      this.log('Checking wake lock permission...');
      
      // Wake lock permission is usually automatically granted
      // and doesn't require user interaction in most cases
      return {
        state: PermissionState.GRANTED,
        canAskAgain: false,
        granted: true,
        message: 'Wake lock permission is automatically granted',
      };
    } catch (error) {
      this.logError('Failed to check wake lock permission', error);
      return {
        state: PermissionState.UNKNOWN,
        canAskAgain: false,
        granted: false,
        message: 'Unable to check wake lock permission',
      };
    }
  }

  // ==================== DEEP LINKING TO ANDROID SETTINGS ====================

  /**
   * Open Display Over Other Apps settings for the app
   */
  static async openDisplayOverOtherAppsSettings(): Promise<void> {
    try {
      this.log('Opening Display Over Other Apps settings...');
      
      if (Platform.OS !== 'android') {
        this.logWarning('Cannot open Android settings on non-Android platform');
        return;
      }

      // Try to open app-specific DOOA settings
      await IntentLauncher.startActivityAsync('android.settings.action.MANAGE_OVERLAY_PERMISSION', {
        data: 'package:' + await this.getPackageName(),
      });
      
      this.log('Opened Display Over Other Apps settings');
    } catch (error) {
      this.logError('Failed to open DOOA settings, trying fallback', error);
      
      try {
        // Fallback to general overlay settings
        await IntentLauncher.startActivityAsync('android.settings.action.MANAGE_OVERLAY_PERMISSION');
        this.log('Opened general Display Over Other Apps settings');
      } catch (fallbackError) {
        this.logError('Failed to open DOOA settings even with fallback', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Open exact alarm settings for the app (Android 12+)
   */
  static async openExactAlarmSettings(): Promise<void> {
    try {
      this.log('Opening exact alarm settings...');
      
      if (Platform.OS !== 'android') {
        this.logWarning('Cannot open Android settings on non-Android platform');
        return;
      }

      // Try to open app-specific exact alarm settings
      await IntentLauncher.startActivityAsync('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', {
        data: 'package:' + await this.getPackageName(),
      });
      
      this.log('Opened exact alarm settings');
    } catch (error) {
      this.logError('Failed to open exact alarm settings, trying fallback', error);
      
      try {
        // Fallback to general alarms & reminders settings
        await IntentLauncher.startActivityAsync('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
        this.log('Opened general exact alarm settings');
      } catch (fallbackError) {
        this.logError('Failed to open exact alarm settings even with fallback', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Open app-specific notification settings
   */
  static async openNotificationSettings(): Promise<void> {
    try {
      this.log('Opening notification settings...');
      
      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync('android.settings.APP_NOTIFICATION_SETTINGS', {
          extra: {
            'android.provider.extra.APP_PACKAGE': await this.getPackageName(),
          },
        });
      } else {
        // iOS - open app settings
        await Linking.openSettings();
      }
      
      this.log('Opened notification settings');
    } catch (error) {
      this.logError('Failed to open notification settings', error);
      throw error;
    }
  }

  /**
   * Open general app settings
   */
  static async openAppSettings(): Promise<void> {
    try {
      this.log('Opening app settings...');
      
      await Linking.openSettings();
      
      this.log('Opened app settings');
    } catch (error) {
      this.logError('Failed to open app settings', error);
      throw error;
    }
  }

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Get the app's package name (Android) or bundle ID (iOS)
   */
  private static async getPackageName(): Promise<string> {
    try {
      // In Expo managed workflow, we need to construct this from app.json
      // For now, return a placeholder that would be replaced in production
      return 'com.altrise.app'; // This should match your app.json identifier
    } catch (error) {
      this.logError('Failed to get package name', error);
      return 'com.altrise.app';
    }
  }

  /**
   * Get user-friendly message for permission state
   */
  private static getPermissionMessage(type: PermissionType, state: PermissionState): string {
    const permissionNames = {
      [PermissionType.NOTIFICATIONS]: 'notifications',
      [PermissionType.DISPLAY_OVER_OTHER_APPS]: 'display over other apps',
      [PermissionType.EXACT_ALARM]: 'exact alarms',
      [PermissionType.WAKE_LOCK]: 'wake lock',
    };

    const name = permissionNames[type];

    switch (state) {
      case PermissionState.GRANTED:
        return `${name} permission is granted`;
      case PermissionState.DENIED:
        return `${name} permission was denied`;
      case PermissionState.NEVER_ASK_AGAIN:
        return `${name} permission was permanently denied. Please enable it in settings.`;
      case PermissionState.UNDETERMINED:
        return `${name} permission has not been requested yet`;
      default:
        return `${name} permission status is unknown`;
    }
  }

  /**
   * Check all permissions at once
   */
  static async checkAllPermissions(): Promise<AllPermissionsStatus> {
    try {
      this.log('Checking all permissions...');
      
      const [notifications, displayOverOtherApps, exactAlarm, wakeLock] = await Promise.all([
        this.checkNotificationPermissions(),
        this.checkDisplayOverOtherAppsPermission(),
        this.checkExactAlarmPermission(),
        this.checkWakeLockPermission(),
      ]);

      const allGranted = notifications.granted && 
                        displayOverOtherApps.granted && 
                        exactAlarm.granted && 
                        wakeLock.granted;

      const criticalGranted = notifications.granted && displayOverOtherApps.granted;

      const result: AllPermissionsStatus = {
        notifications,
        displayOverOtherApps,
        exactAlarm,
        wakeLock,
        allGranted,
        criticalGranted,
      };

      this.log('All permissions status:', result);
      return result;
    } catch (error) {
      this.logError('Failed to check all permissions', error);
      throw error;
    }
  }

  /**
   * Request all missing permissions
   */
  static async requestAllMissingPermissions(): Promise<AllPermissionsStatus> {
    try {
      this.log('Requesting all missing permissions...');
      
      const currentStatus = await this.checkAllPermissions();
      
      // Request notifications first (most important)
      let notifications = currentStatus.notifications;
      if (!notifications.granted && notifications.canAskAgain) {
        notifications = await this.requestNotificationPermissions();
      }

      // Request DOOA if needed
      let displayOverOtherApps = currentStatus.displayOverOtherApps;
      if (!displayOverOtherApps.granted && displayOverOtherApps.canAskAgain) {
        displayOverOtherApps = await this.requestDisplayOverOtherAppsPermission();
      }

      // Request exact alarm if needed
      let exactAlarm = currentStatus.exactAlarm;
      if (!exactAlarm.granted && exactAlarm.canAskAgain) {
        exactAlarm = await this.requestExactAlarmPermission();
      }

      // Wake lock doesn't need requesting
      const wakeLock = currentStatus.wakeLock;

      const allGranted = notifications.granted && 
                        displayOverOtherApps.granted && 
                        exactAlarm.granted && 
                        wakeLock.granted;

      const criticalGranted = notifications.granted && displayOverOtherApps.granted;

      const result: AllPermissionsStatus = {
        notifications,
        displayOverOtherApps,
        exactAlarm,
        wakeLock,
        allGranted,
        criticalGranted,
      };

      this.log('Final permissions status after requests:', result);
      return result;
    } catch (error) {
      this.logError('Failed to request all missing permissions', error);
      throw error;
    }
  }

  /**
   * Show alert to guide user to settings for permanently denied permissions
   */
  static showSettingsAlert(permissionType: PermissionType): void {
    const permissionNames = {
      [PermissionType.NOTIFICATIONS]: 'Notifications',
      [PermissionType.DISPLAY_OVER_OTHER_APPS]: 'Display Over Other Apps',
      [PermissionType.EXACT_ALARM]: 'Exact Alarms',
      [PermissionType.WAKE_LOCK]: 'Wake Lock',
    };

    const name = permissionNames[permissionType];

    Alert.alert(
      'Permission Required',
      `${name} permission is required for the alarm to work properly. Please enable it in the app settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: async () => {
            try {
              switch (permissionType) {
                case PermissionType.NOTIFICATIONS:
                  await this.openNotificationSettings();
                  break;
                case PermissionType.DISPLAY_OVER_OTHER_APPS:
                  await this.openDisplayOverOtherAppsSettings();
                  break;
                case PermissionType.EXACT_ALARM:
                  await this.openExactAlarmSettings();
                  break;
                default:
                  await this.openAppSettings();
              }
            } catch (error) {
              this.logError('Failed to open settings', error);
            }
          }
        }
      ]
    );
  }
}
