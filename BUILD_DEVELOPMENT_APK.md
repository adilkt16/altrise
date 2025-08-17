# Building AltRise Development APK - Step by Step Guide

## Current Status ✅
- ✅ EAS CLI installed and configured
- ✅ Project linked to EAS (ID: b98a99e5-dbc1-4606-a652-d6fb7880c940)  
- ✅ Development build configuration ready
- ✅ expo-dev-client installed
- ✅ Android permissions configured for alarms and notifications

## Option 1: Cloud Build (Recommended - No Android SDK needed)

### Step 1: Build in the Cloud
```bash
cd /home/user/Desktop/projects/altrise
eas build --platform android --profile development
```

### Step 2: Wait and Download
- The build will be queued in the cloud
- You'll get a link to download the APK when ready (usually 5-10 minutes)
- Install the APK on your Android device

### Step 3: Test the App
```bash
# Start the development server
npx expo start --dev-client

# Scan QR code with your development build app (NOT Expo Go)
```

## Option 2: Local Build (Requires Android SDK Setup)

### Step 1: Install Android Studio
1. Download Android Studio from https://developer.android.com/studio
2. Install and set up Android SDK
3. Add to your shell profile:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Step 2: Create Android Emulator
```bash
# Start Android Studio
# Go to AVD Manager
# Create a new Virtual Device with API level 30+
```

### Step 3: Build Locally
```bash
cd /home/user/Desktop/projects/altrise
npx expo run:android
```

## Option 3: Use Physical Android Device

### Step 1: Enable Developer Options
1. Go to Settings > About Phone
2. Tap "Build Number" 7 times
3. Go back to Settings > Developer Options
4. Enable "USB Debugging"

### Step 2: Connect Device
```bash
# Connect via USB and allow debugging
adb devices  # Should show your device

# Build and install
npx expo run:android
```

## What You'll Get

Once you have the development build running:

### ✅ Full Notification Support
- Scheduled alarms will trigger at correct times
- Background notifications work
- App receives notification events properly

### ✅ Testing Commands
```typescript
// Test immediate notification (5 seconds)
import { testImmediateNotification } from './src/utils/alarmSchedulingTest';
testImmediateNotification();

// Create test alarm for 2 minutes from now
import { testAlarmScheduling } from './src/utils/alarmSchedulingTest';
testAlarmScheduling();

// Debug all scheduled notifications
import { debugNotifications } from './src/utils/alarmSchedulingTest';
debugNotifications();
```

### ✅ Expected Results
- Notifications appear at scheduled times
- App handles foreground/background/killed states
- Alarm data passed through notification payload
- Ready for puzzle modal integration

## Quick Start (Cloud Build)

Run this single command to start the cloud build:

```bash
cd /home/user/Desktop/projects/altrise && eas build --platform android --profile development
```

Then wait for the download link and install on your Android device!

## Next Steps After Installation

1. **Install APK** on Android device
2. **Start dev server**: `npx expo start --dev-client`
3. **Scan QR code** with development build app
4. **Test notifications**: Use the testing utilities
5. **Verify alarms**: Create alarms and watch them trigger

Your alarm scheduling system is ready - it just needs the proper development environment! 🎉
