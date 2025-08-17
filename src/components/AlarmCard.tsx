import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch 
} from 'react-native';
import { Alarm } from '../types';
import { formatTimeForCard, getRepeatDaysText } from '../utils/timeUtils';

interface AlarmCardProps {
  alarm: Alarm;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onEdit: (alarm: Alarm) => void;
  onDelete: (id: string) => void;
  use24HourFormat?: boolean;
}

const AlarmCard: React.FC<AlarmCardProps> = ({ 
  alarm, 
  onToggleEnabled, 
  onEdit, 
  onDelete,
  use24HourFormat = false 
}) => {
  const handleToggle = (value: boolean) => {
    onToggleEnabled(alarm.id, value);
  };

  const handleEdit = () => {
    onEdit(alarm);
  };

  const handleDelete = () => {
    onDelete(alarm.id);
  };

  return (
    <View style={[styles.container, !alarm.isEnabled && styles.disabled]}>
      <View style={styles.leftSection}>
        <View style={styles.timeSection}>
          <Text style={[styles.time, !alarm.isEnabled && styles.disabledText]}>
            {formatTimeForCard(alarm.time, use24HourFormat)}
          </Text>
          {alarm.endTime && (
            <Text style={[styles.endTime, !alarm.isEnabled && styles.disabledText]}>
              - {formatTimeForCard(alarm.endTime, use24HourFormat)}
            </Text>
          )}
        </View>
        
        {alarm.label && (
          <Text style={[styles.label, !alarm.isEnabled && styles.disabledText]}>
            {alarm.label}
          </Text>
        )}
        
        <Text style={[styles.repeatDays, !alarm.isEnabled && styles.disabledText]}>
          {getRepeatDaysText(alarm.repeatDays)}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <Switch
          value={alarm.isEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
          thumbColor={alarm.isEnabled ? '#ffffff' : '#f1f5f9'}
        />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleEdit}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={handleDelete}
          >
            <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  disabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.7,
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  time: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  endTime: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 8,
  },
  label: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 2,
  },
  repeatDays: {
    fontSize: 14,
    color: '#64748b',
  },
  disabledText: {
    color: '#94a3b8',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  buttonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#dc2626',
  },
});

export default AlarmCard;
