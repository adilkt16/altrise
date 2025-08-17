import React from 'react';
import { View, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';

// Mock navigation object for demo purposes
const mockNavigation = {
  navigate: (screen: string, params?: any) => {
    console.log(`Navigate to ${screen}`, params);
  },
  goBack: () => {
    console.log('Go back');
  },
  setOptions: () => {},
  addListener: () => () => {},
  removeListener: () => {},
  isFocused: () => true,
  canGoBack: () => false,
  getId: () => 'demo',
  getParent: () => undefined,
  getState: () => ({ routes: [], index: 0 }),
  dispatch: () => {},
  reset: () => {},
  setParams: () => {},
};

// Demo component to showcase the HomeScreen
const HomeScreenDemo: React.FC = () => {
  return (
    <View style={styles.container}>
      <HomeScreen navigation={mockNavigation as any} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default HomeScreenDemo;
