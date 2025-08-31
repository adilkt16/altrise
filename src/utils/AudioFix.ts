// Emergency audio service fix - adds safer stop method
// This fixes the infinite recursion issue in the AudioService

import { audioService } from '../services/AudioService';

// Global debug function to test audio without infinite recursion
(global as any).testAudioSafely = async () => {
  console.log('🔧 Testing audio service safely...');
  
  try {
    // First, emergency stop any existing audio
    await audioService.emergencyStop();
    console.log('✅ Emergency stop completed');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to test basic functionality
    const testConfig = {
      soundFile: 'alarm_default',
      volume: 0.3,
      shouldLoop: false,
      enableVibration: false
    };
    
    console.log('🔧 Attempting to start test sound...');
    const success = await audioService.startAlarmSound(testConfig);
    
    if (success) {
      console.log('✅ Audio test started successfully');
      // Stop after 2 seconds
      setTimeout(async () => {
        await audioService.stopAlarmSound();
        console.log('✅ Audio test completed');
      }, 2000);
    } else {
      console.log('⚠️ Audio test failed to start (this is expected in web/Expo Go)');
    }
    
  } catch (error) {
    console.error('❌ Audio test error:', error);
  }
};

// Global emergency stop function
(global as any).emergencyStopAudio = async () => {
  console.log('🚨 Emergency stopping all audio...');
  try {
    await audioService.emergencyStop();
    console.log('✅ Emergency stop completed');
  } catch (error) {
    console.error('❌ Emergency stop failed:', error);
  }
};

console.log('🔧 Audio fix loaded. Available global functions:');
console.log('  - testAudioSafely() - Test audio without infinite loops');
console.log('  - emergencyStopAudio() - Emergency stop all audio');
