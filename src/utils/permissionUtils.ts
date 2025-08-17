// Utility functions for permission handling in the AltRise app
import { PermissionService, PermissionType, PermissionState, AllPermissionsStatus } from '../services/PermissionService';
import { StorageService } from '../services/StorageService';

/**
 * Check if the app has all critical permissions needed to function
 */
export const hasCriticalPermissions = async (): Promise<boolean> => {
  try {
    const status = await PermissionService.checkAllPermissions();
    return status.criticalGranted;
  } catch (error) {
    console.error('Error checking critical permissions:', error);
    return false;
  }
};

/**
 * Check if the app has all permissions
 */
export const hasAllPermissions = async (): Promise<boolean> => {
  try {
    const status = await PermissionService.checkAllPermissions();
    return status.allGranted;
  } catch (error) {
    console.error('Error checking all permissions:', error);
    return false;
  }
};

/**
 * Get permissions that are missing
 */
export const getMissingPermissions = async (): Promise<PermissionType[]> => {
  try {
    const status = await PermissionService.checkAllPermissions();
    const missing: PermissionType[] = [];

    if (!status.notifications.granted) {
      missing.push(PermissionType.NOTIFICATIONS);
    }
    if (!status.displayOverOtherApps.granted) {
      missing.push(PermissionType.DISPLAY_OVER_OTHER_APPS);
    }
    if (!status.exactAlarm.granted) {
      missing.push(PermissionType.EXACT_ALARM);
    }
    if (!status.wakeLock.granted) {
      missing.push(PermissionType.WAKE_LOCK);
    }

    return missing;
  } catch (error) {
    console.error('Error getting missing permissions:', error);
    return [];
  }
};

/**
 * Get permissions that are permanently denied (never ask again)
 */
export const getPermanentlyDeniedPermissions = async (): Promise<PermissionType[]> => {
  try {
    const status = await PermissionService.checkAllPermissions();
    const denied: PermissionType[] = [];

    if (status.notifications.state === PermissionState.NEVER_ASK_AGAIN) {
      denied.push(PermissionType.NOTIFICATIONS);
    }
    if (status.displayOverOtherApps.state === PermissionState.NEVER_ASK_AGAIN) {
      denied.push(PermissionType.DISPLAY_OVER_OTHER_APPS);
    }
    if (status.exactAlarm.state === PermissionState.NEVER_ASK_AGAIN) {
      denied.push(PermissionType.EXACT_ALARM);
    }
    if (status.wakeLock.state === PermissionState.NEVER_ASK_AGAIN) {
      denied.push(PermissionType.WAKE_LOCK);
    }

    return denied;
  } catch (error) {
    console.error('Error getting permanently denied permissions:', error);
    return [];
  }
};

/**
 * Update user settings with current permission status
 */
export const syncPermissionsToSettings = async (): Promise<void> => {
  try {
    const status = await PermissionService.checkAllPermissions();
    
    await StorageService.updateUserSettings({
      permissionsGranted: {
        notifications: status.notifications.granted,
        exactAlarm: status.exactAlarm.granted,
        wakelock: status.wakeLock.granted,
        displayOverOtherApps: status.displayOverOtherApps.granted,
      },
      permissionsLastChecked: new Date().toISOString(),
    });

    console.log('Permissions synced to user settings');
  } catch (error) {
    console.error('Error syncing permissions to settings:', error);
  }
};

/**
 * Check if permissions should be re-checked (e.g., after app return from background)
 */
export const shouldRecheckPermissions = async (): Promise<boolean> => {
  try {
    const settings = await StorageService.getUserSettings();
    const lastChecked = new Date(settings.permissionsLastChecked);
    const now = new Date();
    
    // Recheck if it's been more than 1 hour since last check
    const hoursSinceLastCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastCheck > 1;
  } catch (error) {
    console.error('Error checking if permissions should be rechecked:', error);
    return true; // Default to rechecking on error
  }
};

/**
 * Get a user-friendly description of permission requirements
 */
export const getPermissionDescription = (permissionType: PermissionType): string => {
  switch (permissionType) {
    case PermissionType.NOTIFICATIONS:
      return 'Notifications are required to display alarms and wake you up.';
    case PermissionType.DISPLAY_OVER_OTHER_APPS:
      return 'Display over other apps allows the alarm to show on top of other applications.';
    case PermissionType.EXACT_ALARM:
      return 'Exact alarms ensure your alarm goes off at the precise time, even when the device is sleeping.';
    case PermissionType.WAKE_LOCK:
      return 'Wake lock keeps the device active when the alarm is triggered.';
    default:
      return 'This permission is required for the alarm to function properly.';
  }
};

/**
 * Get permission priority (for ordering in UI)
 */
export const getPermissionPriority = (permissionType: PermissionType): number => {
  switch (permissionType) {
    case PermissionType.NOTIFICATIONS:
      return 1; // Highest priority
    case PermissionType.DISPLAY_OVER_OTHER_APPS:
      return 2;
    case PermissionType.EXACT_ALARM:
      return 3;
    case PermissionType.WAKE_LOCK:
      return 4; // Lowest priority (usually auto-granted)
    default:
      return 5;
  }
};

/**
 * Sort permissions by priority
 */
export const sortPermissionsByPriority = (permissions: PermissionType[]): PermissionType[] => {
  return permissions.sort((a, b) => getPermissionPriority(a) - getPermissionPriority(b));
};

/**
 * Check if app can schedule alarms reliably
 */
export const canScheduleReliableAlarms = async (): Promise<boolean> => {
  try {
    const status = await PermissionService.checkAllPermissions();
    
    // For reliable alarms, we need notifications and preferably exact alarms
    return status.notifications.granted && status.exactAlarm.granted;
  } catch (error) {
    console.error('Error checking alarm scheduling capability:', error);
    return false;
  }
};

/**
 * Check if app can display alarms over other apps
 */
export const canDisplayAlarmsOverApps = async (): Promise<boolean> => {
  try {
    const status = await PermissionService.checkAllPermissions();
    
    return status.notifications.granted && status.displayOverOtherApps.granted;
  } catch (error) {
    console.error('Error checking display over apps capability:', error);
    return false;
  }
};

/**
 * Get a summary of current permission status for debugging
 */
export const getPermissionSummary = async (): Promise<string> => {
  try {
    const status = await PermissionService.checkAllPermissions();
    
    const summary = [
      `Notifications: ${status.notifications.state} (${status.notifications.granted ? 'Granted' : 'Not Granted'})`,
      `Display Over Apps: ${status.displayOverOtherApps.state} (${status.displayOverOtherApps.granted ? 'Granted' : 'Not Granted'})`,
      `Exact Alarms: ${status.exactAlarm.state} (${status.exactAlarm.granted ? 'Granted' : 'Not Granted'})`,
      `Wake Lock: ${status.wakeLock.state} (${status.wakeLock.granted ? 'Granted' : 'Not Granted'})`,
      `Critical Permissions: ${status.criticalGranted ? 'All Granted' : 'Missing'}`,
      `All Permissions: ${status.allGranted ? 'All Granted' : 'Missing'}`,
    ].join('\n');

    return summary;
  } catch (error) {
    console.error('Error getting permission summary:', error);
    return 'Error: Unable to get permission summary';
  }
};

/**
 * Log current permission status for debugging
 */
export const logPermissionStatus = async (): Promise<void> => {
  try {
    const summary = await getPermissionSummary();
    console.log('[Permission Status]:\n' + summary);
  } catch (error) {
    console.error('Error logging permission status:', error);
  }
};
