/**
 * Notification Debugging Utilities
 * Use these functions to test and diagnose notification issues in development
 */

import * as Notifications from 'expo-notifications';
import { AlarmScheduler } from '../services/AlarmScheduler';
import { Alert } from 'react-native';

/**
 * Log all currently scheduled notifications with detailed timing
 */
export const logAllScheduledNotifications = async (): Promise<void> => {
  try {
    console.log('📋 ===============================================');
    console.log('📋 ALL SCHEDULED NOTIFICATIONS');
    console.log('📋 ===============================================');
    
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const now = new Date();
    
    console.log(`📋 Current time: ${now.toLocaleString()}`);
    console.log(`📋 Total scheduled notifications: ${allScheduled.length}`);
    
    if (allScheduled.length === 0) {
      console.log('📋 No notifications currently scheduled');
    } else {
      allScheduled.forEach((notification: any, index: number) => {
        const trigger = notification.trigger as any;
        const triggerDate = trigger?.date ? new Date(trigger.date) : null;
        const timeUntil = triggerDate ? Math.round((triggerDate.getTime() - now.getTime()) / 60000) : null;
        
        console.log(`📋 ${index + 1}. ${notification.identifier}`);
        console.log(`    Title: ${notification.content.title}`);
        console.log(`    Trigger: ${triggerDate ? triggerDate.toLocaleString() : 'Unknown'}`);
        console.log(`    Time until: ${timeUntil !== null ? timeUntil + ' minutes' : 'Unknown'}`);
        console.log(`    Data: ${JSON.stringify(notification.content.data, null, 4)}`);
        console.log('');
      });
    }
    
    console.log('📋 ===============================================');
    
  } catch (error) {
    console.error('❌ Error logging scheduled notifications:', error);
  }
};

/**
 * Run comprehensive notification diagnostics
 */
export const runNotificationDiagnostics = async (): Promise<void> => {
  console.log('🔍 Running comprehensive notification diagnostics...');
  
  try {
    // Get full diagnostic info
    const diagnostics = await AlarmScheduler.getDiagnosticInfo();
    
    // Display summary in alert
    const summary = `
Notification Diagnostics:
• Permissions: ${diagnostics.permissions?.status || 'Unknown'}
• System Scheduled: ${diagnostics.systemScheduledCount}
• Tracked Alarms: ${diagnostics.trackedAlarmsCount}
• Stored Alarms: ${diagnostics.storedAlarmsCount}

Check console for full details.
    `;
    
    Alert.alert('Notification Diagnostics', summary, [{ text: 'OK' }]);
    
  } catch (error) {
    console.error('❌ Error running diagnostics:', error);
    Alert.alert('Diagnostics Error', 'Failed to run diagnostics. Check console for details.');
  }
};

/**
 * Test immediate notification
 */
export const testImmediateNotification = async (): Promise<void> => {
  console.log('🧪 Testing immediate notification...');
  
  try {
    const notificationId = await AlarmScheduler.testImmediateNotification();
    
    if (notificationId) {
      Alert.alert(
        'Test Sent', 
        'Immediate notification sent! You should see it now.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Test Failed', 
        'Failed to send immediate notification. Check console for details.',
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('❌ Error testing immediate notification:', error);
    Alert.alert('Test Error', 'Error testing notification. Check console for details.');
  }
};

/**
 * Test scheduled notification
 */
export const testScheduledNotification = async (delaySeconds: number = 10): Promise<void> => {
  console.log(`🧪 Testing scheduled notification in ${delaySeconds} seconds...`);
  
  try {
    const notificationId = await AlarmScheduler.testScheduledNotification(delaySeconds);
    
    if (notificationId) {
      Alert.alert(
        'Test Scheduled', 
        `Notification scheduled for ${delaySeconds} seconds from now. Wait for it!`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Test Failed', 
        'Failed to schedule test notification. Check console for details.',
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('❌ Error testing scheduled notification:', error);
    Alert.alert('Test Error', 'Error scheduling test notification. Check console for details.');
  }
};

/**
 * Force refresh all alarm scheduling
 */
export const forceRefreshScheduling = async (): Promise<void> => {
  console.log('🔄 Force refreshing all alarm scheduling...');
  
  try {
    await AlarmScheduler.forceRefreshScheduling();
    
    Alert.alert(
      'Refresh Complete', 
      'All alarm scheduling has been refreshed. Check console for details.',
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('❌ Error force refreshing scheduling:', error);
    Alert.alert('Refresh Error', 'Error refreshing scheduling. Check console for details.');
  }
};

/**
 * Clean up orphaned notifications
 */
export const cleanupOrphanedNotifications = async (): Promise<void> => {
  console.log('🧹 Cleaning up orphaned notifications...');
  
  try {
    await AlarmScheduler.cleanupOrphanedNotifications();
    
    Alert.alert(
      'Cleanup Complete', 
      'Orphaned notifications have been cleaned up. Check console for details.',
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
    Alert.alert('Cleanup Error', 'Error cleaning up notifications. Check console for details.');
  }
};

/**
 * Quick debug session - runs multiple tests
 */
export const quickDebugSession = async (): Promise<void> => {
  console.log('🚀 Starting quick debug session...');
  
  Alert.alert(
    'Debug Session',
    'This will run multiple tests. Check the console for detailed logs.',
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Start', 
        onPress: async () => {
          try {
            // Test immediate notification
            await testImmediateNotification();
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Test scheduled notification
            await testScheduledNotification(5);
            
            // Run diagnostics
            await runNotificationDiagnostics();
            
            console.log('✅ Quick debug session complete');
          } catch (error) {
            console.error('❌ Error in debug session:', error);
          }
        }
      }
    ]
  );
};

// Global functions for easy console access
if (__DEV__) {
  (global as any).testNotifications = testImmediateNotification;
  (global as any).testScheduled = testScheduledNotification;
  (global as any).refreshAlarms = forceRefreshScheduling;
  (global as any).debugAlarms = runNotificationDiagnostics;
  (global as any).cleanupNotifications = cleanupOrphanedNotifications;
  (global as any).quickDebug = quickDebugSession;
  (global as any).logScheduled = logAllScheduledNotifications;
  
  // Enhanced lifecycle testing functions
  (global as any).checkAppState = () => {
    try {
      const { AppState, Platform } = require('react-native');
      console.log('📱 ===============================================');
      console.log('📱 CURRENT APP LIFECYCLE STATE');
      console.log('📱 ===============================================');
      console.log(`📱 App State: ${AppState.currentState}`);
      console.log(`📱 Current Time: ${new Date().toLocaleString()}`);
      console.log(`📱 Platform: ${Platform.OS}`);
      console.log('💡 TIP: Check the main app log for detailed listener status');
      console.log('📱 ===============================================');
    } catch (error) {
      console.error('❌ App state check failed:', error);
    }
  };
  
  (global as any).testAppLifecycle = () => {
    try {
      console.log('🔄 ===============================================');
      console.log('🔄 APP LIFECYCLE TESTING GUIDE');
      console.log('� ===============================================');
      console.log('🔄 To test app lifecycle reliability:');
      console.log('');
      console.log('1️⃣ CREATE TEST ALARM:');
      console.log('   • Set alarm for 2-3 minutes from now');
      console.log('   • Watch for scheduling logs');
      console.log('');
      console.log('2️⃣ TEST FOREGROUND:');
      console.log('   • Leave app open');
      console.log('   • Alarm should trigger with full modal');
      console.log('');
      console.log('3️⃣ TEST BACKGROUND:');
      console.log('   • Set another alarm 2-3 minutes out');
      console.log('   • Press home button (background app)');
      console.log('   • Notification should appear in status bar');
      console.log('   • Tap notification to return to app');
      console.log('');
      console.log('4️⃣ TEST APP KILLED:');
      console.log('   • Set alarm 2-3 minutes out');
      console.log('   • Swipe app away (kill it)');
      console.log('   • Notification should still appear');
      console.log('');
      console.log('5️⃣ TEST PHONE LOCKED:');
      console.log('   • Set alarm 2-3 minutes out');
      console.log('   • Lock phone screen');
      console.log('   • Notification should wake screen');
      console.log('');
      console.log('✅ All scenarios should work reliably!');
      console.log('🔄 ===============================================');
    } catch (error) {
      console.error('❌ Lifecycle test guide failed:', error);
    }
  };
  
  (global as any).simulateBackgroundReturn = () => {
    try {
      console.log('🔄 ===============================================');
      console.log('🔄 BACKGROUND RETURN SIMULATION');
      console.log('🔄 ===============================================');
      console.log('🔄 Simulating app return from background...');
      console.log('💡 This would trigger the enhanced recovery logic');
      console.log('💡 In real usage, this happens automatically when:');
      console.log('   • User taps app icon');
      console.log('   • User taps notification');
      console.log('   • User switches back to app');
      console.log('');
      console.log('🔧 Recovery actions include:');
      console.log('   • Re-establishing notification listeners');
      console.log('   • Refreshing alarm scheduling');
      console.log('   • Checking for missed notifications');
      console.log('   • Validating permissions');
      console.log('🔄 ===============================================');
    } catch (error) {
      console.error('❌ Background simulation failed:', error);
    }
  };

  // Modal testing functions
  (global as any).testModal = async () => {
    try {
      console.log('🚨 Testing alarm modal display...');
      
      const modalManager = require('../services/AlarmModalManager').default;
      
      const testModalData = {
        alarmId: 'test_modal_' + Date.now(),
        title: 'Test Alarm Modal',
        label: 'Modal Test',
        originalTime: new Date().toLocaleTimeString(),
        puzzleType: 'none',
        onDismiss: () => console.log('✅ Test modal dismissed'),
        onSnooze: () => console.log('😴 Test modal snoozed'),
      };

      await modalManager.showAlarmModal(testModalData);
      console.log('✅ Test modal should be visible now');
      
    } catch (error) {
      console.error('❌ Modal test failed:', error);
    }
  };

  (global as any).testModalPuzzle = async () => {
    try {
      console.log('🧩 ===============================================');
      console.log('🧩 TESTING PUZZLE MODAL FUNCTIONALITY');
      console.log('🧩 ===============================================');
      
      const { AlarmModalManager } = require('../services/AlarmModalManager');
      const modalManager = AlarmModalManager.getInstance();
      
      // Test with explicit basic_math first
      const testModalData = {
        alarmId: 'test_puzzle_' + Date.now(),
        title: 'Puzzle Test Alarm',
        label: 'Math Puzzle Test',
        originalTime: new Date().toLocaleTimeString(),
        puzzleType: 'basic_math', // Explicitly test basic_math
        onDismiss: () => {
          console.log('✅ Test puzzle modal dismissed');
          modalManager.hideAlarmModal();
        },
        onSnooze: () => {
          console.log('😴 Test puzzle modal snoozed');
          modalManager.hideAlarmModal();
        },
      };

      console.log('🧩 Test modal data:', testModalData);
      
      const success = await modalManager.showAlarmModal(testModalData);
      
      if (success) {
        console.log(`✅ Test modal with ${testModalData.puzzleType} puzzle should be visible now`);
        console.log('🧩 Check the screen - you should see a math question to solve!');
      } else {
        console.error('❌ Modal failed to display');
      }
      
    } catch (error) {
      console.error('❌ Modal puzzle test failed:', error);
    }
  };
  
  console.log('�🔧 Debug functions available globally:');
  console.log('  testNotifications() - Test immediate notification');
  console.log('  testScheduled(10) - Test scheduled notification in 10 seconds');
  console.log('  refreshAlarms() - Force refresh all alarm scheduling');
  console.log('  debugAlarms() - Run full diagnostics');
  console.log('  cleanupNotifications() - Clean up orphaned notifications');
  console.log('  quickDebug() - Run quick debug session');
  console.log('  logScheduled() - Log all currently scheduled notifications');
  console.log('');
  console.log('🔄 Enhanced lifecycle testing:');
  console.log('  checkAppState() - Check current app lifecycle state');
  console.log('  testAppLifecycle() - Show lifecycle testing guide');
  console.log('  simulateBackgroundReturn() - Simulate background return info');
  console.log('');
  console.log('🚨 Modal system testing:');
  console.log('  getModalDebugInfo() - Check current modal state');
  console.log('  testModal() - Test alarm modal display');
  console.log('  testModalPuzzle() - Test modal with puzzle');
}
