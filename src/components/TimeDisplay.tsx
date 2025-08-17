import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TimeDisplayProps {
  // Props will be defined when implementing time display logic
}

const TimeDisplay: React.FC<TimeDisplayProps> = () => {
  const currentTime = new Date().toLocaleTimeString();

  return (
    <View style={styles.container}>
      <Text style={styles.timeText}>{currentTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1e293b',
    fontVariant: ['tabular-nums'],
  },
});

export default TimeDisplay;
