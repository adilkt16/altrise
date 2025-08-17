import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, View } from 'react-native';
import { AlarmService } from '../services/AlarmService';
import { PuzzleType } from '../types';
import { testImmediateNotification, testScheduledNotification, checkNotificationStatus } from '../utils/notificationTest';

interface TestAlarmButtonProps {
  onAlarmCreated?: () => void;
}

export const TestAlarmButton: React.FC<TestAlarmButtonProps> = ({ onAlarmCreated }) => {
  const createTestAlarm = async () => {
    try {
      console.log('🧪 Creating 30-second test alarm...');
      
      // Create alarm for 30 seconds from now
      const futureTime = new Date(Date.now() + 30 * 1000);
      const hours = futureTime.getHours().toString().padStart(2, '0');
      const minutes = futureTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      const testAlarmData = {
        time: timeString,
        isEnabled: true,
        repeatDays: [], // One-time alarm
        puzzleType: PuzzleType.MATH,
        soundFile: 'default_alarm.mp3',
        vibrationEnabled: true,
        label: 'Test Alarm (30s)',
      };

      console.log('📝 Creating alarm:', testAlarmData);
      
      const alarm = await AlarmService.createAlarm(testAlarmData);
      
      console.log(`✅ Test alarm created: ${alarm.id}`);
      console.log(`⏰ Will trigger at: ${futureTime.toLocaleTimeString()}`);
      
      Alert.alert(
        '🧪 Test Alarm Created',
        `Alarm will trigger in 30 seconds at ${futureTime.toLocaleTimeString()}.\n\nClose the app to test background notifications!`,
        [{ text: 'OK' }]
      );
      
      onAlarmCreated?.();
      
    } catch (error) {
      console.error('❌ Error creating test alarm:', error);
      Alert.alert('Error', `Failed to create test alarm: ${String(error)}`);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={createTestAlarm}>
        <Text style={styles.buttonText}>🧪 Test 30s Alarm</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.immediateButton} onPress={testImmediateNotification}>
        <Text style={styles.buttonText}>📱 Test Now</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.scheduledButton} onPress={testScheduledNotification}>
        <Text style={styles.buttonText}>⏰ Test 5s</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.statusButton} onPress={checkNotificationStatus}>
        <Text style={styles.buttonText}>📊 Status</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    margin: 4,
  },
  immediateButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    margin: 4,
  },
  scheduledButton: {
    backgroundColor: '#45B7D1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    margin: 4,
  },
  statusButton: {
    backgroundColor: '#96CEB4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    margin: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
