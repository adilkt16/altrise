import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALARM_TASK_NAME = 'ALARM_FOREGROUND_TASK';
const ACTIVE_ALARM_KEY = 'ACTIVE_ALARM_DATA';

export class AlarmForegroundService {
  private static soundObject: Audio.Sound | null = null;
  private static isPlaying: boolean = false;

  static async startAlarmService(alarmData: any) {
    try {
      console.log('🚨 Starting foreground alarm service...');
      
      // Store active alarm data
      await AsyncStorage.setItem(ACTIVE_ALARM_KEY, JSON.stringify({
        ...alarmData,
        startTime: new Date().toISOString(),
      }));

      // Keep device awake
      await activateKeepAwakeAsync('ALARM_ACTIVE');
      
      // Configure audio for alarm priority
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1, // Mix with others
        interruptionModeAndroid: 1, // Do not mix
      });

      // Show high-priority notification with full-screen intent
      await this.showAlarmNotification(alarmData);
      
      // Start playing alarm sound
      await this.playAlarmSound(alarmData.soundFile);
      
      return true;
    } catch (error) {
      console.error('❌ Error starting alarm service:', error);
      return false;
    }
  }

  static async showAlarmNotification(alarmData: any) {
    const notificationContent: Notifications.NotificationContentInput = {
      title: '⏰ ALARM RINGING!',
      body: alarmData.label || 'Your alarm is ringing',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 500, 200, 500, 200, 500],
      categoryIdentifier: 'alarm',
      data: {
        ...alarmData,
        isAlarmNotification: true,
      },
      // Android specific
      sticky: true,
      autoDismiss: false,
    };

    // Android-specific full-screen intent for lock screen
    if (Platform.OS === 'android') {
      (notificationContent as any).android = {
        channelId: 'alarm-channel',
        importance: Notifications.AndroidImportance.MAX,
        sound: true,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#FF0000',
        autoCancel: false,
        ongoing: true,
        priority: 'max',
        showWhen: true,
        usesChronometer: true,
        fullScreenIntent: true,
        lockscreenVisibility: 1,
      };
    }

    // Create high-priority channel for alarms
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alarm-channel', {
        name: 'Active Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#FF0000',
        sound: 'default',
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });
    }

    await Notifications.presentNotificationAsync(notificationContent);
  }

  static async playAlarmSound(soundFile: string = 'alarm_default') {
    try {
      // Stop any existing sound
      if (this.soundObject) {
        await this.soundObject.unloadAsync();
        this.soundObject = null;
      }

      // Load and play alarm sound
      const soundAsset = this.getSoundAsset(soundFile);
      const { sound } = await Audio.Sound.createAsync(
        soundAsset,
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        },
        this.onPlaybackStatusUpdate
      );

      this.soundObject = sound;
      this.isPlaying = true;
      
      console.log('🔊 Alarm sound playing');
      return true;
    } catch (error) {
      console.error('❌ Error playing alarm sound:', error);
      return false;
    }
  }

  static getSoundAsset(soundFile: string) {
    const sounds: Record<string, any> = {
      'alarm_default': require('../../assets/sounds/alarm_default.wav'),
      'alarm_gentle': require('../../assets/sounds/alarm_gentle.wav'),
      'alarm_urgent': require('../../assets/sounds/alarm_urgent.wav'),
    };
    return sounds[soundFile] || sounds['alarm_default'];
  }

  static onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && !status.isPlaying && this.isPlaying) {
      // Restart if it stopped unexpectedly
      this.soundObject?.playAsync();
    }
  };

  static async stopAlarmService() {
    try {
      console.log('🛑 Stopping alarm service...');
      
      // Stop sound
      if (this.soundObject) {
        await this.soundObject.stopAsync();
        await this.soundObject.unloadAsync();
        this.soundObject = null;
      }
      this.isPlaying = false;

      // Clear active alarm data
      await AsyncStorage.removeItem(ACTIVE_ALARM_KEY);
      
      // Deactivate keep awake
      await deactivateKeepAwake('ALARM_ACTIVE');
      
      // Dismiss notifications
      await Notifications.dismissAllNotificationsAsync();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error stopping alarm service:', error);
      return false;
    }
  }

  static async checkActiveAlarm() {
    try {
      const data = await AsyncStorage.getItem(ACTIVE_ALARM_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}

// Register background task (for future enhancement)
TaskManager.defineTask(ALARM_TASK_NAME, async () => {
  console.log('⏰ Background alarm task executed');
  return TaskManager.TaskManagerTaskExecutorResult.SUCCESS;
});
  }