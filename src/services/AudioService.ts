import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform, AppState, AppStateStatus } from 'react-native';

export interface AudioConfig {
  soundFile: string;
  volume: number;
  shouldLoop: boolean;
  enableVibration: boolean;
}

interface SoundAsset {
  uri: any;
  name: string;
  description: string;
}

/**
 * AudioService - Bulletproof audio playback for AltRise alarm app
 * 
 * Features:
 * - Reliable alarm sound playback with expo-av
 * - Proper audio session management
 * - Graceful handling of audio interruptions
 * - Background audio support
 * - Volume control and system volume respect
 * - Vibration integration with expo-haptics
 * - Sound preview functionality
 * - Memory leak prevention
 * - Cross-platform compatibility
 * 
 * Note: expo-av is deprecated in SDK 54+, but still functional.
 * Future migration to expo-audio planned when stable.
 */
class AudioService {
  private currentSound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private currentConfig: AudioConfig | null = null;
  private vibrationTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private isInitialized: boolean = false;
  private soundAssets: Map<string, SoundAsset> = new Map();
  private previewSoundInstance: Audio.Sound | null = null;
  
  // Audio session configuration
  private readonly AUDIO_MODE = {
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    playThroughEarpieceAndroid: false,
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize audio service with proper configuration
   */
  private async initialize(): Promise<void> {
    try {
      console.log('🔊 [AudioService] Initializing audio system...');
      
      // Configure audio session
      await Audio.setAudioModeAsync(this.AUDIO_MODE);
      console.log('🔊 [AudioService] Audio mode configured for alarm playback');

      // Load sound assets
      this.loadSoundAssets();

      // Set up app state monitoring
      this.setupAppStateMonitoring();

      this.isInitialized = true;
      console.log('✅ [AudioService] Audio service initialized successfully');
    } catch (error) {
      console.error('❌ [AudioService] Failed to initialize audio service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Load available sound assets
   */
  private loadSoundAssets(): void {
    // Note: For development, you need actual MP3 files in assets/sounds/
    // These are placeholder entries - replace with actual audio files
    this.soundAssets.set('alarm_default', {
      uri: require('../../assets/sounds/alarm_default.mp3'),
      name: 'Default Alarm',
      description: 'Classic alarm beep pattern'
    });

    this.soundAssets.set('alarm_gentle', {
      uri: require('../../assets/sounds/alarm_gentle.mp3'),
      name: 'Gentle Wake-up',
      description: 'Soft chimes for easy awakening'
    });

    console.log(`🔊 [AudioService] Loaded ${this.soundAssets.size} sound assets`);
    console.log('⚠️ [AudioService] Note: Actual MP3 files required in assets/sounds/ for audio playback');
  }

  /**
   * Set up app state monitoring for background audio handling
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Handle app state changes to maintain audio playback
   */
  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    console.log(`🔊 [AudioService] App state changed to: ${nextAppState}`);
    
    if (this.isPlaying && nextAppState === 'background') {
      console.log('🔊 [AudioService] App backgrounded - maintaining alarm audio');
      // Audio should continue playing in background for alarms
      // Ensure audio session allows background playback
      try {
        await Audio.setAudioModeAsync({
          ...this.AUDIO_MODE,
          staysActiveInBackground: true,
        });
      } catch (error) {
        console.error('❌ [AudioService] Failed to maintain background audio:', error);
      }
    }
  }

  /**
   * Start playing alarm sound with configuration
   */
  public async startAlarmSound(config: AudioConfig): Promise<boolean> {
    try {
      console.log('🔊 [AudioService] Starting alarm sound...');
      console.log(`🔊 Sound: ${config.soundFile}, Volume: ${config.volume}, Loop: ${config.shouldLoop}`);

      // Ensure audio service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Stop any currently playing sound (with guard to prevent recursion)
      if (this.isPlaying || this.currentSound) {
        await this.stopAlarmSound();
      }

      // Get sound asset
      const soundAsset = this.soundAssets.get(config.soundFile);
      if (!soundAsset) {
        console.error(`❌ [AudioService] Sound asset not found: ${config.soundFile}`);
        return false;
      }

      // Create and configure sound with error handling
      let sound: Audio.Sound;
      try {
        const result = await Audio.Sound.createAsync(
          soundAsset.uri,
          {
            shouldPlay: true,
            isLooping: config.shouldLoop,
            volume: Math.max(0, Math.min(1, config.volume)), // Clamp volume 0-1
          },
          this.onPlaybackStatusUpdate.bind(this)
        );
        sound = result.sound;
      } catch (createError) {
        console.error('❌ [AudioService] Failed to create sound:', createError);
        throw createError;
      }

      this.currentSound = sound;
      this.currentConfig = config;
      this.isPlaying = true;

      // Start vibration if enabled
      if (config.enableVibration) {
        this.startVibration();
      }

      console.log('✅ [AudioService] Alarm sound started successfully');
      return true;

    } catch (error) {
      console.error('❌ [AudioService] Failed to start alarm sound:', error);
      
      // Provide specific error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('UnrecognizedInputFormatException')) {
          console.error('🔊 [AudioService] Audio file format error - check that MP3 files exist and are valid');
          console.error('💡 [AudioService] For development build: Place actual MP3 files in assets/sounds/');
        } else if (error.message.includes('FileNotFound') || error.message.includes('No such file')) {
          console.error('🔊 [AudioService] Audio file not found - check assets/sounds/ directory');
        }
      }
      
      // Clean up state on error
      this.isPlaying = false;
      this.currentSound = null;
      this.currentConfig = null;
      this.stopVibration();
      
      return false;
    }
  }

  /**
   * Stop alarm sound and vibration
   */
  public async stopAlarmSound(): Promise<void> {
    // Guard against recursive calls
    if (!this.isPlaying && !this.currentSound) {
      return;
    }

    try {
      console.log('🔊 [AudioService] Stopping alarm sound...');

      // Stop vibration first
      this.stopVibration();

      // Set flags early to prevent re-entry
      this.isPlaying = false;
      
      // Stop and unload current sound
      if (this.currentSound) {
        try {
          const status = await this.currentSound.getStatusAsync();
          if (status.isLoaded) {
            await this.currentSound.stopAsync();
            await this.currentSound.unloadAsync();
          }
        } catch (soundError) {
          console.warn('⚠️ [AudioService] Error during sound cleanup:', soundError);
          // Continue with cleanup even if there are errors
        }
        this.currentSound = null;
      }

      this.currentConfig = null;

      console.log('✅ [AudioService] Alarm sound stopped successfully');

    } catch (error) {
      console.error('❌ [AudioService] Failed to stop alarm sound:', error);
      // Force cleanup even if error occurs
      this.currentSound = null;
      this.isPlaying = false;
      this.currentConfig = null;
      this.stopVibration();
    }
  }

  /**
   * Start vibration pattern for alarm
   */
  private startVibration(): void {
    try {
      if (Platform.OS === 'android') {
        // Android: Use Haptics with custom pattern
        this.vibrationTimer = setInterval(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 1000); // Vibrate every second
      } else {
        // iOS: Use notification haptics
        this.vibrationTimer = setInterval(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }, 2000); // Vibrate every 2 seconds on iOS
      }

      console.log('🔊 [AudioService] Vibration started');
    } catch (error) {
      console.error('❌ [AudioService] Failed to start vibration:', error);
    }
  }

  /**
   * Stop vibration
   */
  private stopVibration(): void {
    if (this.vibrationTimer) {
      clearInterval(this.vibrationTimer);
      this.vibrationTimer = null;
      console.log('🔊 [AudioService] Vibration stopped');
    }
  }

  /**
   * Handle playback status updates
   */
  private onPlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (status.isLoaded) {
      if (status.didJustFinish && !status.isLooping) {
        console.log('🔊 [AudioService] Sound finished playing');
        this.isPlaying = false;
      }
    } else {
      // Handle error status with guard to prevent infinite recursion
      console.error('❌ [AudioService] Audio loading error:', status.error);
      
      // Only try to stop if we're actually playing to prevent infinite recursion
      if (this.isPlaying && this.currentSound) {
        this.isPlaying = false; // Set this first to prevent re-entry
        this.emergencyStopInternal();
      }
    }
  }

  /**
   * Preview sound for settings/selection
   */
  public async playSoundPreview(soundFile: string, duration: number = 3000): Promise<boolean> {
    try {
      console.log(`🔊 [AudioService] Previewing sound: ${soundFile}`);

      // Stop any current preview
      await this.stopPreview();

      const soundAsset = this.soundAssets.get(soundFile);
      if (!soundAsset) {
        console.error(`❌ [AudioService] Preview sound not found: ${soundFile}`);
        return false;
      }

      // Create preview sound (non-looping, moderate volume)
      const { sound } = await Audio.Sound.createAsync(
        soundAsset.uri,
        {
          shouldPlay: true,
          isLooping: false,
          volume: 0.7, // Moderate volume for preview
        }
      );

      this.previewSoundInstance = sound;

      // Auto-stop preview after duration
      setTimeout(async () => {
        await this.stopPreview();
      }, duration);

      console.log('✅ [AudioService] Sound preview started');
      return true;

    } catch (error) {
      console.error('❌ [AudioService] Failed to preview sound:', error);
      return false;
    }
  }

  /**
   * Stop sound preview
   */
  public async stopPreview(): Promise<void> {
    try {
      if (this.previewSoundInstance) {
        const status = await this.previewSoundInstance.getStatusAsync();
        if (status.isLoaded) {
          await this.previewSoundInstance.stopAsync();
          await this.previewSoundInstance.unloadAsync();
        }
        this.previewSoundInstance = null;
        console.log('🔊 [AudioService] Sound preview stopped');
      }
    } catch (error) {
      console.error('❌ [AudioService] Failed to stop preview:', error);
      this.previewSoundInstance = null;
    }
  }

  /**
   * Set volume for current playing sound
   */
  public async setVolume(volume: number): Promise<void> {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      
      if (this.currentSound) {
        await this.currentSound.setVolumeAsync(clampedVolume);
        console.log(`🔊 [AudioService] Volume set to: ${clampedVolume}`);
      }

      // Update current config
      if (this.currentConfig) {
        this.currentConfig.volume = clampedVolume;
      }
    } catch (error) {
      console.error('❌ [AudioService] Failed to set volume:', error);
    }
  }

  /**
   * Get available sound assets
   */
  public getAvailableSounds(): Array<{id: string, name: string, description: string}> {
    return Array.from(this.soundAssets.entries()).map(([id, asset]) => ({
      id,
      name: asset.name,
      description: asset.description
    }));
  }

  /**
   * Check if audio is currently playing
   */
  public isAlarmPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current audio configuration
   */
  public getCurrentConfig(): AudioConfig | null {
    return this.currentConfig;
  }

  /**
   * Emergency stop - force stop all audio and vibration
   */
  public async emergencyStop(): Promise<void> {
    console.log('🚨 [AudioService] Emergency stop triggered');
    
    try {
      // Stop all sounds
      await this.stopAlarmSound();
      await this.stopPreview();
      
      // Force cleanup
      this.currentSound = null;
      this.previewSoundInstance = null;
      this.isPlaying = false;
      this.stopVibration();
      
      console.log('✅ [AudioService] Emergency stop completed');
    } catch (error) {
      console.error('❌ [AudioService] Emergency stop failed:', error);
    }
  }

  /**
   * Internal emergency stop without recursion risk
   */
  private emergencyStopInternal(): void {
    console.log('🚨 [AudioService] Internal emergency stop triggered');
    
    try {
      // Force cleanup without async operations that might trigger more callbacks
      if (this.currentSound) {
        // Don't await - just fire and forget to avoid recursion
        this.currentSound.unloadAsync().catch(() => {
          // Ignore errors during emergency cleanup
        });
        this.currentSound = null;
      }
      
      if (this.previewSoundInstance) {
        this.previewSoundInstance.unloadAsync().catch(() => {
          // Ignore errors during emergency cleanup
        });
        this.previewSoundInstance = null;
      }
      
      this.isPlaying = false;
      this.currentConfig = null;
      this.stopVibration();
      
      console.log('✅ [AudioService] Internal emergency stop completed');
    } catch (error) {
      console.error('❌ [AudioService] Internal emergency stop failed:', error);
    }
  }

  /**
   * Cleanup resources when service is destroyed
   */
  public async cleanup(): Promise<void> {
    console.log('🔊 [AudioService] Cleaning up audio service...');
    
    try {
      await this.emergencyStop();
      
      // Remove app state listener
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      this.isInitialized = false;
      console.log('✅ [AudioService] Audio service cleanup completed');
      
    } catch (error) {
      console.error('❌ [AudioService] Cleanup failed:', error);
    }
  }

  /**
   * Test audio functionality (for debugging)
   */
  public async testAudio(): Promise<void> {
    console.log('🔧 [AudioService] Testing audio functionality...');
    
    try {
      const testConfig: AudioConfig = {
        soundFile: 'alarm_default',
        volume: 0.5,
        shouldLoop: false,
        enableVibration: false
      };

      const success = await this.startAlarmSound(testConfig);
      if (success) {
        console.log('✅ [AudioService] Audio test started');
        setTimeout(async () => {
          await this.stopAlarmSound();
          console.log('✅ [AudioService] Audio test completed');
        }, 2000);
      } else {
        console.error('❌ [AudioService] Audio test failed to start');
      }
    } catch (error) {
      console.error('❌ [AudioService] Audio test error:', error);
    }
  }
}

// Export singleton instance
export const audioService = new AudioService();
