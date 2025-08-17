import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AlarmCard from '../components/AlarmCard';
import { StorageService } from '../services/StorageService';
import { Alarm } from '../types';

interface HomeScreenProps {
  navigation: any; // Will be typed properly when navigation is set up
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [use24HourFormat, setUse24HourFormat] = useState(false);

  // Load alarms when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAlarms();
    }, [])
  );

  const loadAlarms = async () => {
    try {
      setLoading(true);
      const allAlarms = await StorageService.getAllAlarms();
      // Sort alarms by time
      const sortedAlarms = allAlarms.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        const minutesA = timeA[0] * 60 + timeA[1];
        const minutesB = timeB[0] * 60 + timeB[1];
        return minutesA - minutesB;
      });
      setAlarms(sortedAlarms);
    } catch (error) {
      console.error('Error loading alarms:', error);
      Alert.alert('Error', 'Failed to load alarms');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAlarms();
    setRefreshing(false);
  };

  const handleToggleAlarm = async (alarmId: string, enabled: boolean) => {
    try {
      const updatedAlarm = await StorageService.updateAlarm(alarmId, { 
        isEnabled: enabled 
      });
      
      if (updatedAlarm) {
        // Update the local state
        setAlarms(prevAlarms => 
          prevAlarms.map(alarm => 
            alarm.id === alarmId 
              ? { ...alarm, isEnabled: enabled }
              : alarm
          )
        );
      }
    } catch (error) {
      console.error('Error toggling alarm:', error);
      Alert.alert('Error', 'Failed to update alarm');
    }
  };

  const handleEditAlarm = (alarm: Alarm) => {
    // Navigate to edit screen
    navigation.navigate('EditAlarm', { alarmId: alarm.id });
  };

  const handleDeleteAlarm = (alarmId: string) => {
    const alarm = alarms.find(a => a.id === alarmId);
    
    Alert.alert(
      'Delete Alarm',
      `Are you sure you want to delete the alarm${alarm?.label ? ` "${alarm.label}"` : ''} at ${alarm?.time}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await StorageService.deleteAlarm(alarmId);
              if (success) {
                setAlarms(prevAlarms => 
                  prevAlarms.filter(alarm => alarm.id !== alarmId)
                );
              }
            } catch (error) {
              console.error('Error deleting alarm:', error);
              Alert.alert('Error', 'Failed to delete alarm');
            }
          }
        }
      ]
    );
  };

  const handleAddAlarm = () => {
    // Navigate to add alarm screen
    navigation.navigate('AddAlarm');
  };

  const renderAlarmItem = ({ item }: { item: Alarm }) => (
    <AlarmCard
      alarm={item}
      onToggleEnabled={handleToggleAlarm}
      onEdit={handleEditAlarm}
      onDelete={handleDeleteAlarm}
      use24HourFormat={use24HourFormat}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>⏰</Text>
      <Text style={styles.emptyStateTitle}>No Alarms Set</Text>
      <Text style={styles.emptyStateText}>
        Tap the + button to create your first alarm
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>My Alarms</Text>
      <TouchableOpacity 
        style={styles.formatToggle}
        onPress={() => setUse24HourFormat(!use24HourFormat)}
      >
        <Text style={styles.formatToggleText}>
          {use24HourFormat ? '24h' : '12h'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {renderHeader()}
      
      <FlatList
        data={alarms}
        renderItem={renderAlarmItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          alarms.length === 0 && styles.emptyListContainer
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddAlarm}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  formatToggle: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  formatToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 100, // Space for floating add button
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  addButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
