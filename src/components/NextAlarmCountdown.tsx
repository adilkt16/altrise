import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Alarm } from '../types';
import { getNextAlarm, formatTimeUntil, NextAlarmInfo } from '../utils/nextAlarmUtils';

interface NextAlarmCountdownProps {
  alarms: Alarm[];
  onAlarmPress?: (alarm: Alarm) => void;
}

const NextAlarmCountdown: React.FC<NextAlarmCountdownProps> = ({ 
  alarms, 
  onAlarmPress 
}) => {
  const [nextAlarmInfo, setNextAlarmInfo] = useState<NextAlarmInfo>({
    alarm: null,
    timeUntil: null,
    isToday: false
  });

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      const info = getNextAlarm(alarms);
      setNextAlarmInfo(info);
    };

    // Initial calculation
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [alarms]);

  if (!nextAlarmInfo.alarm || !nextAlarmInfo.timeUntil) {
    return null; // No alarms or no enabled alarms
  }

  const { alarm, timeUntil, isToday } = nextAlarmInfo;
  const timeDisplay = formatTimeUntil(timeUntil);

  // Determine the status text
  const getStatusText = () => {
    if (timeUntil.totalSeconds < 60) {
      return 'Alarm in less than a minute!';
    } else if (timeUntil.totalSeconds < 3600) {
      return `Alarm in ${timeUntil.minutes} minutes`;
    } else if (isToday) {
      return 'Next alarm today';
    } else if (timeUntil.hours < 24) {
      return 'Next alarm tomorrow';
    } else {
      const days = Math.floor(timeUntil.hours / 24);
      return `Next alarm in ${days} day${days > 1 ? 's' : ''}`;
    }
  };

  // Color based on urgency
  const getUrgencyColor = () => {
    if (timeUntil.totalSeconds < 3600) { // Less than 1 hour
      return '#ef4444'; // Red
    } else if (timeUntil.totalSeconds < 7200) { // Less than 2 hours
      return '#f97316'; // Orange
    } else if (isToday) {
      return '#10b981'; // Green
    } else {
      return '#6366f1'; // Blue
    }
  };

  const urgencyColor = getUrgencyColor();
  const statusText = getStatusText();

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: urgencyColor }]}
      onPress={() => onAlarmPress?.(alarm)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Next Alarm</Text>
          <View style={[styles.statusDot, { backgroundColor: urgencyColor }]} />
        </View>
        <Text style={[styles.status, { color: urgencyColor }]}>{statusText}</Text>
      </View>

      <View style={styles.countdownContainer}>
        <Text style={[styles.countdown, { color: urgencyColor }]}>
          {timeDisplay}
        </Text>
        <View style={styles.alarmInfo}>
          <Text style={styles.alarmTime}>{alarm.time}</Text>
          {alarm.label && (
            <Text style={styles.alarmLabel} numberOfLines={1}>
              {alarm.label}
            </Text>
          )}
        </View>
      </View>

      {alarm.repeatDays && alarm.repeatDays.length > 0 && (
        <View style={styles.repeatDays}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <View
              key={index}
              style={[
                styles.dayBadge,
                alarm.repeatDays!.includes(index) && {
                  backgroundColor: urgencyColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  alarm.repeatDays!.includes(index) && styles.dayTextActive,
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.iconContainer}>
        <Text style={styles.alarmIcon}>⏰</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  countdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countdown: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  alarmInfo: {
    alignItems: 'flex-end',
  },
  alarmTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  alarmLabel: {
    fontSize: 14,
    color: '#6b7280',
    maxWidth: 120,
  },
  repeatDays: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  dayTextActive: {
    color: '#ffffff',
  },
  iconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.1,
  },
  alarmIcon: {
    fontSize: 40,
  },
});

export default NextAlarmCountdown;
