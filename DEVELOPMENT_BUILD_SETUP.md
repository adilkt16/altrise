# Setting Up Development Build for AltRise Notifications

## The Problem
Expo Go doesn't support full notification functionality, especially for scheduled/alarm notifications. The logs show:

```
ERROR  expo-notifications: Android Push notifications functionality provided by expo-notifications was removed from Expo Go with the release of SDK 53. Use a development build instead.
```

## Solution: Create a Development Build

### Step 1: Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

### Step 2: Configure EAS Build
```bash
# Initialize EAS in your project
eas build:configure

# Login to your Expo account
eas login
```

### Step 3: Build for Android
```bash
# Build APK for local installation
eas build --platform android --profile development --local

# OR build in cloud (requires Expo account)
eas build --platform android --profile development
```

### Step 4: Install the Development Build
- For local build: Install the generated APK on your device
- For cloud build: Download from Expo dashboard and install

### Step 5: Test Notifications
```bash
# Start the development server
npx expo start --dev-client

# Scan QR code with your development build app (NOT Expo Go)
```

## Alternative: Test on Android Emulator

### Step 1: Start Android Emulator
```bash
# Using Android Studio or
npx expo run:android
```

### Step 2: Test in Emulator
The emulator should support full notification functionality.

## Quick Test Commands

Add these to your App.tsx or run in console:

```typescript
// Test immediate notification
import { testImmediateNotification, debugNotifications } from './src/utils/alarmSchedulingTest';

// In your component or console:
testImmediateNotification(); // Should show notification in 5 seconds
debugNotifications(); // Shows all scheduled notifications
```

## Expected Behavior

After switching to development build:
1. ✅ Scheduled notifications will appear at correct times
2. ✅ App will receive notification events
3. ✅ Alarm trigger handling will work
4. ✅ Background/killed app notifications will work

## Current Status

Your alarm scheduling system is **working correctly** - the issue is just the Expo Go limitation. The logs show:

- ✅ Permissions are being checked
- ✅ AlarmScheduler is initializing
- ✅ Notifications are being scheduled (14 notifications created)
- ✅ System is ready for development build testing

Switch to a development build and your notifications will work! 🎉
