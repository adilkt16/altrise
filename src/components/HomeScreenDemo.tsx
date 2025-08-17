import React from 'react';
import { View, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';

// Demo component to showcase the HomeScreen
const HomeScreenDemo: React.FC = () => {
  return (
    <View style={styles.container}>
      <HomeScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default HomeScreenDemo;
