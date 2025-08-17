# 🚨 NOTIFICATION TROUBLESHOOTING GUIDE

## The Issue
- **30s test alarm** is not triggering notifications
- **Real alarms** are not working at scheduled times
- App appears to be scheduling but notifications never appear

## 🔍 DIAGNOSTIC STEPS

### Step 1: Check if you're in Development Build vs Expo Go

**CRITICAL**: Scheduled notifications **DO NOT WORK** in Expo Go!

**Check this first:**
1. Open the app
2. Check the console logs when app starts
3. Look for these messages:
   - ✅ `"Running in development build (good for scheduled notifications)"` = GOOD
   - ❌ `"Could not get push token - might be running in Expo Go"` = PROBLEM

### Step 2: Test Immediate Notifications

Use the new test buttons in the app:

1. **📱 Test Now** - Tests immediate notifications
   - If this works: Notification system is OK
   - If this fails: Permission or basic setup issue

2. **⏰ Test 5s** - Tests scheduled notifications  
   - If this works: Scheduling works
   - If this fails: Expo Go limitation or scheduling issue

3. **📊 Status** - Shows diagnostic info
   - Check permissions
   - Check scheduled notification count
   - Review system status

### Step 3: Console Debugging

Open React Native debugger and run:

```javascript
// Test immediate notification
import { testImmediateNotification } from './src/utils/notificationTest';
testImmediateNotification();

// Test scheduled notification (5 seconds)
import { testScheduledNotification } from './src/utils/notificationTest';
testScheduledNotification();

// Check status
import { checkNotificationStatus } from './src/utils/notificationTest';
checkNotificationStatus();
```

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: Running in Expo Go
**Symptoms:** Console shows "Could not get push token"
**Solution:** Create a development build:
```bash
npx create-expo-app --template
eas build --platform android --profile development
```

### Issue 2: Permission Issues
**Symptoms:** 
- Immediate notifications fail
- Permission status not "granted"

**Solution:**
1. Check device notification settings
2. Ensure app has notification permissions
3. Grant "Display over other apps" permission (Android)

### Issue 3: Android Specific
**Symptoms:** iOS works but Android doesn't
**Solution:**
- Check notification channel setup
- Verify "alarms" channel exists
- Check Do Not Disturb settings

### Issue 4: Background App Issues
**Symptoms:** Notifications work when app is open, not when closed
**Solution:**
- Test with app completely closed
- Check battery optimization settings
- Ensure background app refresh is enabled

## 🔧 ENHANCED DEBUGGING

The AlarmScheduler now includes enhanced logging. When you schedule an alarm, you should see:

```
🔧 Initializing AlarmScheduler...
📱 Running in development build (good for scheduled notifications)
📋 Current notification permission: granted
📱 Android notification channel created
🔔 Scheduling all alarms...
📅 Found X enabled alarms to schedule
🔔 Scheduling alarm: Test Alarm at XX:XX
📅 Found X upcoming occurrences for alarm ID
⏰ Scheduling notification for [DateTime]
📱 Scheduling notification:
   Title: ⏰ Test Alarm
   Body: Wake up! Your alarm is ringing
   Trigger: [DateTime]
   In X seconds
📋 Notification request: [JSON]
✅ Notification scheduled successfully!
   ID: [UUID]
   Will trigger: [DateTime]
✅ Verified: Notification [UUID] found in scheduled list
```

## 🎯 TESTING STRATEGY

1. **Test immediate first** - Use "📱 Test Now" button
2. **Test 5-second delay** - Use "⏰ Test 5s" button  
3. **Create 30-second alarm** - Use "🧪 Test 30s Alarm"
4. **Close the app completely** - Test background notifications
5. **Check console logs** - Look for error messages

## ⚡ QUICK FIXES TO TRY

### Fix 1: Restart the App
```bash
# Kill and restart the development server
Ctrl+C
npm run start
```

### Fix 2: Clear Notifications
```javascript
// In debugger console
import * as Notifications from 'expo-notifications';
Notifications.cancelAllScheduledNotificationsAsync();
```

### Fix 3: Check Development Build
If using Expo Go, you MUST create a development build:
```bash
eas build --platform android --profile development
```

### Fix 4: Grant All Permissions
- Notifications: ✅ Allow
- Display over other apps: ✅ Allow  
- Background app refresh: ✅ Allow
- Battery optimization: ✅ Don't optimize

## 📋 EXPECTED BEHAVIOR

**When Working Correctly:**
1. App starts → Logs show "development build" 
2. Test Now → Immediate notification appears
3. Test 5s → Notification appears after 5 seconds
4. Test 30s → Creates alarm, notification appears after 30 seconds
5. Real alarms → Trigger at scheduled times

**Console Should Show:**
- ✅ Notification permissions granted
- ✅ AlarmScheduler initialized successfully
- ✅ Notification scheduled successfully
- ✅ Verified: Notification found in scheduled list

## 🚨 CRITICAL CHECK

**The #1 issue is likely Expo Go limitations.**

If you see this in console:
```
⚠️ Could not get push token - might be running in Expo Go
🚨 IMPORTANT: Scheduled notifications DO NOT work in Expo Go!
```

Then you MUST create a development build. Expo Go cannot schedule notifications!
