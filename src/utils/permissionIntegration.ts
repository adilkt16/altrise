// Example integration of permission system in the main app
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { PermissionService } from '../services/PermissionService';
import { 
  hasCriticalPermissions, 
  syncPermissionsToSettings,
  shouldRecheckPermissions,
  logPermissionStatus 
} from '../utils/permissionUtils';

/**
 * Hook to handle permission checking and app lifecycle
 */
export const usePermissionManager = () => {
  const [hasPermissions, setHasPermissions] = React.useState<boolean | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = React.useState(false);

  const checkPermissions = React.useCallback(async () => {
    try {
      setIsCheckingPermissions(true);
      
      // Check if we should recheck permissions
      const shouldRecheck = await shouldRecheckPermissions();
      if (!shouldRecheck && hasPermissions !== null) {
        return; // Skip if we checked recently
      }

      console.log('Checking app permissions...');
      const hasCritical = await hasCriticalPermissions();
      setHasPermissions(hasCritical);
      
      // Sync current status to settings
      await syncPermissionsToSettings();
      
      // Log for debugging
      await logPermissionStatus();
      
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermissions(false);
    } finally {
      setIsCheckingPermissions(false);
    }
  }, [hasPermissions]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  // Handle app state changes (when app comes to foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App came to foreground, recheck permissions
        console.log('App became active, rechecking permissions...');
        checkPermissions();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [checkPermissions]);

  const requestMissingPermissions = React.useCallback(async () => {
    try {
      setIsCheckingPermissions(true);
      console.log('Requesting missing permissions...');
      
      await PermissionService.requestAllMissingPermissions();
      
      // Recheck after requesting
      await checkPermissions();
      
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setIsCheckingPermissions(false);
    }
  }, [checkPermissions]);

  return {
    hasPermissions,
    isCheckingPermissions,
    checkPermissions,
    requestMissingPermissions,
  };
};

/**
 * Example of using permission manager in the main App component
 */
export const createAppWithPermissions = () => {
  // This would return a React component that wraps your app
  // and handles permission checking
  
  const permissionWrapper = {
    checkPermissionsOnStart: async () => {
      const { hasPermissions, isCheckingPermissions, requestMissingPermissions } = usePermissionManager();
      return { hasPermissions, isCheckingPermissions, requestMissingPermissions };
    }
  };

  return permissionWrapper;
};

/**
 * Example permission check before creating an alarm
 */
export const createAlarmWithPermissionCheck = async (alarmData: any) => {
  try {
    // Check if we have critical permissions before creating alarm
    const hasCritical = await hasCriticalPermissions();
    
    if (!hasCritical) {
      console.warn('Cannot create alarm: Missing critical permissions');
      
      // Request missing permissions
      const result = await PermissionService.requestAllMissingPermissions();
      
      // Check again after requesting
      const stillMissing = !(await hasCriticalPermissions());
      if (stillMissing) {
        throw new Error('Critical permissions required to create alarms');
      }
    }

    // Proceed with alarm creation
    console.log('Creating alarm with proper permissions...');
    // ... actual alarm creation logic here
    
  } catch (error) {
    console.error('Failed to create alarm:', error);
    throw error;
  }
};

/**
 * Get permission status for display in settings or UI
 */
export const getPermissionStatusForDisplay = async () => {
  try {
    const permissionStatus = await PermissionService.checkAllPermissions();
    
    return {
      notifications: permissionStatus.notifications.granted ? 'Granted' : 'Not Granted',
      displayOverApps: permissionStatus.displayOverOtherApps.granted ? 'Granted' : 'Not Granted',
      exactAlarms: permissionStatus.exactAlarm.granted ? 'Granted' : 'Not Granted',
      criticalPermissions: permissionStatus.criticalGranted ? 'All Good' : 'Missing',
      allPermissions: permissionStatus.allGranted ? 'All Good' : 'Missing',
    };
  } catch (error) {
    console.error('Error loading permission status for display:', error);
    return {
      notifications: 'Error',
      displayOverApps: 'Error',
      exactAlarms: 'Error',
      criticalPermissions: 'Error',
      allPermissions: 'Error',
    };
  }
};

export default {
  usePermissionManager,
  createAppWithPermissions,
  createAlarmWithPermissionCheck,
  getPermissionStatusForDisplay,
};
