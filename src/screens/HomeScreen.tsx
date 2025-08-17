import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to AltRise</Text>
        <Text style={styles.subtitle}>Your smart alarm clock companion</Text>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            🕐 Alarm features coming soon...
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 40,
    textAlign: 'center',
  },
  placeholder: {
    backgroundColor: '#e2e8f0',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
  },
});

export default HomeScreen;
