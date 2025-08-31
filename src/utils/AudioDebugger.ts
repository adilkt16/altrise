/**
 * AudioDebugger - Utility for testing audio functionality in development
 */

import { audioService, AudioConfig } from '../services/AudioService';

export class AudioDebugger {
  /**
   * Test basic audio playback
   */
  static async testBasicPlayback(): Promise<void> {
    console.log('🔧 [AudioDebugger] Testing basic audio playback...');
    
    const config: AudioConfig = {
      soundFile: 'alarm_default',
      volume: 0.5,
      shouldLoop: false,
      enableVibration: false
    };

    const success = await audioService.startAlarmSound(config);
    if (success) {
      console.log('✅ [AudioDebugger] Audio test started successfully');
      setTimeout(async () => {
        await audioService.stopAlarmSound();
        console.log('✅ [AudioDebugger] Audio test completed');
      }, 3000);
    } else {
      console.error('❌ [AudioDebugger] Audio test failed');
    }
  }

  /**
   * Test alarm audio with looping
   */
  static async testAlarmAudio(): Promise<void> {
    console.log('🔧 [AudioDebugger] Testing alarm audio with looping...');
    
    const config: AudioConfig = {
      soundFile: 'alarm_default',
      volume: 0.8,
      shouldLoop: true,
      enableVibration: true
    };

    const success = await audioService.startAlarmSound(config);
    if (success) {
      console.log('✅ [AudioDebugger] Alarm audio test started - will play for 5 seconds');
      setTimeout(async () => {
        await audioService.stopAlarmSound();
        console.log('✅ [AudioDebugger] Alarm audio test completed');
      }, 5000);
    } else {
      console.error('❌ [AudioDebugger] Alarm audio test failed');
    }
  }

  /**
   * Test different sound files
   */
  static async testAllSounds(): Promise<void> {
    console.log('🔧 [AudioDebugger] Testing all available sounds...');
    
    const sounds = ['alarm_default', 'alarm_gentle'];
    
    for (let i = 0; i < sounds.length; i++) {
      const soundFile = sounds[i];
      console.log(`🔧 [AudioDebugger] Testing sound: ${soundFile}`);
      
      const config: AudioConfig = {
        soundFile,
        volume: 0.6,
        shouldLoop: false,
        enableVibration: false
      };

      const success = await audioService.startAlarmSound(config);
      if (success) {
        console.log(`✅ [AudioDebugger] ${soundFile} started successfully`);
        
        // Wait for sound to play
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await audioService.stopAlarmSound();
        console.log(`✅ [AudioDebugger] ${soundFile} stopped`);
        
        // Brief pause between sounds
        if (i < sounds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        console.error(`❌ [AudioDebugger] ${soundFile} failed to start`);
      }
    }
    
    console.log('✅ [AudioDebugger] All sounds tested');
  }

  /**
   * Test sound preview functionality
   */
  static async testSoundPreview(): Promise<void> {
    console.log('🔧 [AudioDebugger] Testing sound preview functionality...');
    
    const success = await audioService.playSoundPreview('alarm_gentle', 2000);
    if (success) {
      console.log('✅ [AudioDebugger] Sound preview started - will auto-stop in 2 seconds');
    } else {
      console.error('❌ [AudioDebugger] Sound preview failed');
    }
  }

  /**
   * Test volume control
   */
  static async testVolumeControl(): Promise<void> {
    console.log('🔧 [AudioDebugger] Testing volume control...');
    
    const config: AudioConfig = {
      soundFile: 'alarm_default',
      volume: 0.3,
      shouldLoop: true,
      enableVibration: false
    };

    const success = await audioService.startAlarmSound(config);
    if (success) {
      console.log('✅ [AudioDebugger] Audio started at volume 0.3');
      
      // Change volume every second
      setTimeout(() => {
        audioService.setVolume(0.6);
        console.log('🔧 [AudioDebugger] Volume changed to 0.6');
      }, 1000);
      
      setTimeout(() => {
        audioService.setVolume(0.9);
        console.log('🔧 [AudioDebugger] Volume changed to 0.9');
      }, 2000);
      
      setTimeout(async () => {
        await audioService.stopAlarmSound();
        console.log('✅ [AudioDebugger] Volume test completed');
      }, 3000);
    } else {
      console.error('❌ [AudioDebugger] Volume test failed to start');
    }
  }

  /**
   * Run all tests sequentially
   */
  static async runAllTests(): Promise<void> {
    console.log('🔧 [AudioDebugger] Running all audio tests...');
    
    try {
      await this.testBasicPlayback();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.testSoundPreview();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await this.testVolumeControl();
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      await this.testAllSounds();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.testAlarmAudio();
      
      console.log('✅ [AudioDebugger] All tests completed successfully');
    } catch (error) {
      console.error('❌ [AudioDebugger] Test suite failed:', error);
    }
  }
}

// Make available globally for easy testing in development
if (__DEV__) {
  (global as any).AudioDebugger = AudioDebugger;
  console.log('🔧 [AudioDebugger] Debug utility available globally. Use AudioDebugger.testBasicPlayback() to test audio.');
}
