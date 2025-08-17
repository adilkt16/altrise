import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AlarmCardProps {
  // Props will be defined when implementing alarm logic
}

const AlarmCard: React.FC<AlarmCardProps> = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Alarm Card Component</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
});

export default AlarmCard;
