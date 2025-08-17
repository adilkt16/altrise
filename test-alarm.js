// Quick Test: Set alarm for 2 minutes from now
import { AlarmScheduler } from './src/services/AlarmService';

const quickTest = async () => {
  const testAlarm = {
    id: 'quick-test',
    time: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
    label: 'Development Build Test',
    enabled: true,
    repeat: []
  };
  
  try {
    await AlarmScheduler.scheduleAlarm(testAlarm);
    console.log('✅ Test alarm scheduled for:', testAlarm.time.toLocaleTimeString());
    
    // Verify it was scheduled
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📱 Total scheduled: ${scheduled.length}`);
    
    alert(`Test alarm set for ${testAlarm.time.toLocaleTimeString()}!\nClose the app and wait...`);
  } catch (error) {
    console.error('❌ Error scheduling test alarm:', error);
  }
};

// Call this after installing the development APK
quickTest();
