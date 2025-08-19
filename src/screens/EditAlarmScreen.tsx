import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AlarmService } from '../services/AlarmService';
import { Alarm, WeekDay, PuzzleType, UpdateAlarmData } from '../types';
import { formatTimeForCard } from '../utils/timeUtils';

interface EditAlarmScreenProps {
  navigation?: any;
  route?: {
    params?: {
      alarmId?: string;
    };
  };
}

const EditAlarmScreen: React.FC<EditAlarmScreenProps> = ({ navigation, route }) => {
  const alarmId = route?.params?.alarmId;
  
  if (!alarmId) {
    // Handle case where alarmId is not provided
    Alert.alert('Error', 'Alarm ID not provided', [
      { text: 'OK', onPress: () => navigation?.goBack() }
    ]);
    return null;
  }
  
  const [loading, setLoading] = useState(true);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start');
  const [label, setLabel] = useState('');
  const [repeatDays, setRepeatDays] = useState<WeekDay[]>([]);
  const [puzzleType, setPuzzleType] = useState<PuzzleType>(PuzzleType.NONE);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [soundFile, setSoundFile] = useState('default_alarm.mp3');
  const [hasEndTime, setHasEndTime] = useState(false);
  const [saving, setSaving] = useState(false);

  const dayNames = [
    { day: WeekDay.SUNDAY, name: 'Sunday', short: 'Sun' },
    { day: WeekDay.MONDAY, name: 'Monday', short: 'Mon' },
    { day: WeekDay.TUESDAY, name: 'Tuesday', short: 'Tue' },
    { day: WeekDay.WEDNESDAY, name: 'Wednesday', short: 'Wed' },
    { day: WeekDay.THURSDAY, name: 'Thursday', short: 'Thu' },
    { day: WeekDay.FRIDAY, name: 'Friday', short: 'Fri' },
    { day: WeekDay.SATURDAY, name: 'Saturday', short: 'Sat' },
  ];

  const puzzleOptions = [
    { value: PuzzleType.NONE, label: 'No Puzzle' },
    { value: PuzzleType.MATH, label: 'Math Problem' },
    { value: PuzzleType.PATTERN, label: 'Pattern Recognition' },
    { value: PuzzleType.MEMORY, label: 'Memory Game' },
    { value: PuzzleType.SEQUENCE, label: 'Sequence Puzzle' },
    { value: PuzzleType.SHAKE, label: 'Shake to Dismiss' },
    { value: PuzzleType.QR_CODE, label: 'QR Code Scan' },
  ];

  const soundOptions = [
    { value: 'default_alarm.mp3', label: 'Default Alarm' },
    { value: 'gentle_wake.mp3', label: 'Gentle Wake' },
    { value: 'nature_sounds.mp3', label: 'Nature Sounds' },
    { value: 'classic_bell.mp3', label: 'Classic Bell' },
    { value: 'digital_beep.mp3', label: 'Digital Beep' },
  ];

  useEffect(() => {
    loadAlarm();
  }, [alarmId]);

  const parseTimeString = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const loadAlarm = async () => {
    try {
      setLoading(true);
      const alarmData = await AlarmService.getAlarmById(alarmId);
      
      if (!alarmData) {
        Alert.alert('Error', 'Alarm not found', [
          { text: 'OK', onPress: () => navigation?.goBack() }
        ]);
        return;
      }

      setAlarm(alarmData);
      setAlarmTime(parseTimeString(alarmData.time));
      setEndTime(alarmData.endTime ? parseTimeString(alarmData.endTime) : null);
      setHasEndTime(!!alarmData.endTime);
      setLabel(alarmData.label || '');
      setRepeatDays(alarmData.repeatDays);
      setPuzzleType(alarmData.puzzleType);
      setVibrationEnabled(alarmData.vibrationEnabled);
      setSoundFile(alarmData.soundFile);
    } catch (error) {
      console.error('Error loading alarm:', error);
      Alert.alert('Error', 'Failed to load alarm', [
        { text: 'OK', onPress: () => navigation?.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    setShowEndTimePicker(false);
    
    if (selectedTime) {
      if (timePickerMode === 'start') {
        setAlarmTime(selectedTime);
        // If end time exists and is now before start time, reset it
        if (endTime && selectedTime >= endTime) {
          setEndTime(null);
        }
      } else {
        // Validate end time is after start time
        if (selectedTime <= alarmTime) {
          Alert.alert('Invalid Time', 'End time must be after start time');
          return;
        }
        setEndTime(selectedTime);
      }
    }
  };

  const showTimePickerModal = (mode: 'start' | 'end') => {
    setTimePickerMode(mode);
    if (mode === 'start') {
      setShowTimePicker(true);
    } else {
      setShowEndTimePicker(true);
    }
  };

  const toggleRepeatDay = (day: WeekDay) => {
    setRepeatDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const validateForm = (): boolean => {
    if (hasEndTime && endTime && endTime <= alarmTime) {
      Alert.alert('Validation Error', 'End time must be after start time');
      return false;
    }

    // Note: Empty repeat days is allowed for one-time alarms
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !alarm) return;

    setSaving(true);
    try {
      console.log(`📝 [EditAlarmScreen] Starting alarm update - ID: ${alarmId}`);
      console.log(`📝 [EditAlarmScreen] Update started at: ${new Date().toISOString()}`);
      
      const updateData: UpdateAlarmData = {
        time: formatTime(alarmTime),
        endTime: hasEndTime && endTime ? formatTime(endTime) : undefined,
        repeatDays,
        puzzleType,
        soundFile,
        vibrationEnabled,
        label: label.trim() || undefined,
      };

      console.log(`📝 [EditAlarmScreen] Update data:`, updateData);

      const updatedAlarm = await AlarmService.updateAlarm(alarmId, updateData);
      
      console.log(`📝 [EditAlarmScreen] Update completed at: ${new Date().toISOString()}`);
      console.log(`📝 [EditAlarmScreen] Updated alarm result:`, updatedAlarm ? 'SUCCESS' : 'FAILED');
      
      if (updatedAlarm) {
        console.log(`📝 [EditAlarmScreen] Alarm successfully updated with scheduling!`);
        Alert.alert('Success', 'Alarm updated successfully', [
          { text: 'OK', onPress: () => navigation?.goBack() }
        ]);
      } else {
        console.error(`❌ [EditAlarmScreen] Failed to update alarm`);
        Alert.alert('Error', 'Failed to update alarm. Please try again.');
      }
    } catch (error) {
      console.error('❌ [EditAlarmScreen] Error updating alarm:', error);
      Alert.alert('Error', 'Failed to update alarm. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigation?.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading alarm...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!alarm) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Alarm not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alarm Time</Text>
          
          <TouchableOpacity 
            style={styles.timeButton}
            onPress={() => showTimePickerModal('start')}
          >
            <Text style={styles.timeButtonText}>
              {formatTimeForCard(formatTime(alarmTime), false)}
            </Text>
          </TouchableOpacity>

          <View style={styles.endTimeContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Set End Time</Text>
              <Switch
                value={hasEndTime}
                onValueChange={(value) => {
                  setHasEndTime(value);
                  if (!value) {
                    setEndTime(null);
                  }
                }}
                trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
                thumbColor={hasEndTime ? '#ffffff' : '#f1f5f9'}
              />
            </View>
            
            {hasEndTime && (
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => showTimePickerModal('end')}
              >
                <Text style={styles.timeButtonText}>
                  {endTime ? formatTimeForCard(formatTime(endTime), false) : 'Select End Time'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Label Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Label (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={label}
            onChangeText={setLabel}
            placeholder="Enter alarm label"
            maxLength={50}
          />
        </View>

        {/* Repeat Days Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repeat Days</Text>
          <View style={styles.daysContainer}>
            {dayNames.map(({ day, name, short }) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  repeatDays.includes(day) && styles.dayButtonSelected
                ]}
                onPress={() => toggleRepeatDay(day)}
              >
                <Text style={[
                  styles.dayButtonText,
                  repeatDays.includes(day) && styles.dayButtonTextSelected
                ]}>
                  {short}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.repeatHelperText}>
            {repeatDays.length === 0 
              ? 'One-time alarm (no repeat)' 
              : `Repeats on: ${repeatDays.map(day => dayNames[day].short).join(', ')}`
            }
          </Text>
        </View>

        {/* Puzzle Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Puzzle Type</Text>
          <View style={styles.optionsContainer}>
            {puzzleOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  puzzleType === option.value && styles.optionButtonSelected
                ]}
                onPress={() => setPuzzleType(option.value)}
              >
                <Text style={[
                  styles.optionButtonText,
                  puzzleType === option.value && styles.optionButtonTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sound Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alarm Sound</Text>
          <View style={styles.optionsContainer}>
            {soundOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  soundFile === option.value && styles.optionButtonSelected
                ]}
                onPress={() => setSoundFile(option.value)}
              >
                <Text style={[
                  styles.optionButtonText,
                  soundFile === option.value && styles.optionButtonTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vibration Section */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Vibration</Text>
            <Switch
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
              trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
              thumbColor={vibrationEnabled ? '#ffffff' : '#f1f5f9'}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Update Alarm'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Pickers */}
      {showTimePicker && (
        <DateTimePicker
          value={alarmTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}
      
      {showEndTimePicker && (
        <DateTimePicker
          value={endTime || new Date(alarmTime.getTime() + 60 * 60 * 1000)} // Default to 1 hour later
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  timeButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  endTimeContainer: {
    marginTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
  },
  textInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  dayButtonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: '#ffffff',
  },
  repeatHelperText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  optionButtonText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  optionButtonTextSelected: {
    color: '#ffffff',
  },
  buttonContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default EditAlarmScreen;
