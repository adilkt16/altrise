// Test utility for alarm configuration screens
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createSampleAlarms, clearAllAlarms } from '../utils/testData';

const AlarmTestUtils: React.FC = () => {
  const handleCreateSampleAlarms = async () => {
    try {
      await createSampleAlarms();
      Alert.alert('Success', 'Sample alarms created! Check your alarm list.');
    } catch (error) {
      Alert.alert('Error', 'Failed to create sample alarms');
    }
  };

  const handleClearAlarms = async () => {
    try {
      await clearAllAlarms();
      Alert.alert('Success', 'All alarms cleared!');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear alarms');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alarm Test Utils</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleCreateSampleAlarms}>
        <Text style={styles.buttonText}>Create Sample Alarms</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClearAlarms}>
        <Text style={[styles.buttonText, styles.dangerText]}>Clear All Alarms</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerText: {
    color: '#ffffff',
  },
});

export default AlarmTestUtils;
