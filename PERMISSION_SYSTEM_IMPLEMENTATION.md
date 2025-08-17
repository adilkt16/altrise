# Permission System Implementation

## Overview
I've implemented a comprehensive permission handling system for the AltRise alarm app, specifically designed for Android permissions including notification permissions and "Display Over Other Apps" (DOOA) permission requirements.

## Core Components

### 1. PermissionService (`src/services/PermissionService.ts`)
**Complete permission management service with:**
- ✅ Notification permission checking and requesting using expo-notifications
- ✅ Display Over Other Apps (DOOA) permission handling for Android
- ✅ Exact alarm permission handling for Android 12+
- ✅ Wake lock permission checking (usually auto-granted)
- ✅ Deep linking to Android system settings
- ✅ Comprehensive error handling and logging
- ✅ Permission state management (granted, denied, never_ask_again, undetermined)

### 2. Permission Utilities (`src/utils/permissionUtils.ts`)
**Helper functions for easy permission management:**
- ✅ Check critical permissions (notifications + DOOA)
- ✅ Check all permissions status
- ✅ Get missing permissions list
- ✅ Get permanently denied permissions
- ✅ Sync permission status to user settings
- ✅ Permission priority and sorting
- ✅ Debugging and logging utilities

### 3. Test Component (`src/components/PermissionTestComponent.tsx`)
**Development testing interface:**
- ✅ Visual permission status display
- ✅ Individual permission request buttons
- ✅ Settings deep-link buttons
- ✅ Utility function testing
- ✅ Real-time status updates

## Permission Types Handled

### 🔔 **Notifications** (Critical)
- **Platform**: Android & iOS
- **Implementation**: expo-notifications API
- **States**: Fully trackable (granted, denied, never_ask_again, undetermined)
- **Deep Links**: App-specific notification settings

### 📱 **Display Over Other Apps** (Critical)
- **Platform**: Android only
- **Implementation**: Intent launcher to Android settings
- **States**: Requires manual verification (Expo limitation)
- **Deep Links**: App-specific DOOA settings with fallback

### ⏰ **Exact Alarms** (Important)
- **Platform**: Android 12+ only
- **Implementation**: Intent launcher to Android settings
- **States**: Requires manual verification (Expo limitation)
- **Deep Links**: App-specific exact alarm settings

### 🔒 **Wake Lock** (Auto-granted)
- **Platform**: Android & iOS
- **Implementation**: Usually automatically granted
- **States**: Assumed granted (no user interaction required)

## Key Features

### 🎯 **Permission State Management**
```typescript
enum PermissionState {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNDETERMINED = 'undetermined',
  NEVER_ASK_AGAIN = 'never_ask_again',
  UNKNOWN = 'unknown',
}
```

### 🎯 **Comprehensive Status Checking**
```typescript
interface AllPermissionsStatus {
  notifications: PermissionStatus;
  displayOverOtherApps: PermissionStatus;
  exactAlarm: PermissionStatus;
  wakeLock: PermissionStatus;
  allGranted: boolean;
  criticalGranted: boolean; // notifications + DOOA
}
```

### 🎯 **Deep Linking to Android Settings**
- **App-specific settings**: Direct links to app permission pages
- **Fallback mechanisms**: General settings if app-specific fails
- **Error handling**: Graceful degradation with user guidance

### 🎯 **Logging and Debugging**
- **Comprehensive logging**: All permission operations logged
- **Error tracking**: Detailed error information
- **Debug utilities**: Permission summary and status functions

## Android-Specific Features

### 📋 **Permission Manifests**
The following permissions need to be added to `app.json` or `app.config.js`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.VIBRATE",
        "android.permission.WAKE_LOCK",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.USE_EXACT_ALARM"
      ]
    }
  }
}
```

### 📋 **Android 13+ Compatibility**
- **Notification permissions**: Handled automatically by expo-notifications
- **DOOA permission**: Requires user interaction in settings
- **Exact alarms**: Essential for reliable alarm timing

### 📋 **Deep Link Intents**
```typescript
// Display Over Other Apps
'android.settings.action.MANAGE_OVERLAY_PERMISSION'

// Exact Alarms
'android.settings.REQUEST_SCHEDULE_EXACT_ALARM'

// App Notifications
'android.settings.APP_NOTIFICATION_SETTINGS'
```

## Usage Examples

### Basic Permission Checking
```typescript
import { PermissionService } from '../services/PermissionService';

// Check all permissions
const status = await PermissionService.checkAllPermissions();
console.log('Critical permissions:', status.criticalGranted);

// Check individual permission
const notificationStatus = await PermissionService.checkNotificationPermissions();
console.log('Notifications granted:', notificationStatus.granted);
```

### Request Permissions
```typescript
// Request all missing permissions
const result = await PermissionService.requestAllMissingPermissions();

// Request specific permission
const notificationResult = await PermissionService.requestNotificationPermissions();
```

### Utility Functions
```typescript
import { hasCriticalPermissions, getMissingPermissions } from '../utils/permissionUtils';

// Quick checks
const canWork = await hasCriticalPermissions();
const missing = await getMissingPermissions();

// Sync to settings
await syncPermissionsToSettings();
```

### Deep Linking
```typescript
// Open specific settings
await PermissionService.openNotificationSettings();
await PermissionService.openDisplayOverOtherAppsSettings();
await PermissionService.openExactAlarmSettings();

// Show guided alerts
PermissionService.showSettingsAlert(PermissionType.NOTIFICATIONS);
```

## Error Handling

### 🛡️ **Comprehensive Error Handling**
- **Network errors**: Graceful handling of permission API failures
- **Platform differences**: iOS/Android compatibility
- **Unknown states**: Fallback to safe defaults
- **Intent failures**: Multiple fallback mechanisms for deep links

### 🛡️ **User-Friendly Messages**
- **Permission descriptions**: Clear explanations of why permissions are needed
- **State messages**: User-friendly permission status descriptions
- **Guided actions**: Step-by-step instructions for manual permission granting

## Integration Points

### 🔗 **StorageService Integration**
- **Permission tracking**: Status stored in user settings
- **Last checked timestamp**: Prevents excessive permission checks
- **Settings sync**: Automatic sync between permission status and stored settings

### 🔗 **UserSettings Schema**
```typescript
interface UserSettings {
  permissionsGranted: {
    notifications: boolean;
    exactAlarm: boolean;
    wakelock: boolean;
    displayOverOtherApps: boolean;
  };
  permissionsLastChecked: string; // ISO date string
  // ... other settings
}
```

## Limitations & Considerations

### ⚠️ **Expo Managed Workflow Limitations**
- **DOOA Permission**: Cannot be directly checked, requires manual verification
- **Exact Alarm Permission**: Cannot be directly checked in managed workflow
- **Package Name**: Requires configuration in app.json for deep links

### ⚠️ **Platform Differences**
- **Android**: Full permission system support
- **iOS**: Limited to notifications and general app settings
- **Version Differences**: Android 12+ has additional exact alarm requirements

### ⚠️ **User Experience Considerations**
- **Permission timing**: Request permissions at appropriate moments
- **Permission education**: Explain why permissions are needed
- **Graceful degradation**: App should work with minimal permissions

## Dependencies Added
```json
{
  "expo-notifications": "^0.31.4",  // Already included
  "expo-linking": "^6.3.1",         // Added for deep linking
  "expo-intent-launcher": "^12.0.1" // Added for Android intents
}
```

## Next Steps

The permission system is complete and ready for:

1. **Onboarding Integration**: Use in permission request flows
2. **App Lifecycle**: Check permissions on app resume/foreground
3. **Alarm Scheduling**: Verify permissions before setting alarms
4. **Settings UI**: Display permission status to users
5. **Troubleshooting**: Help users diagnose permission issues

## Testing

Use the `PermissionTestComponent` to test all permission functionality:

```typescript
import PermissionTestComponent from '../components/PermissionTestComponent';

// Add to your app for testing
<PermissionTestComponent />
```

The permission system provides a robust foundation for handling all Android permission requirements and ensures the alarm app will work reliably across different Android versions and devices.
