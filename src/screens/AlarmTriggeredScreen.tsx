import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Vibration,
  BackHandler,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alarm, PuzzleType } from '../types';
import { StorageService } from '../services/StorageService';
import { AlarmScheduler } from '../services/AlarmScheduler';

interface AlarmTriggeredScreenProps {
  alarmId: string;
  onDismiss: () => void;
  onSnooze: () => void;
}

const { width, height } = Dimensions.get('window');

export const AlarmTriggeredScreen: React.FC<AlarmTriggeredScreenProps> = ({
  alarmId,
  onDismiss,
  onSnooze,
}) => {
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [mathProblem, setMathProblem] = useState<{ question: string; answer: number } | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAlarm();
    startTimer();
    startAnimations();
    preventBackNavigation();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      Vibration.cancel();
    };
  }, []);

  useEffect(() => {
    if (alarm?.puzzleType === PuzzleType.MATH && !mathProblem) {
      generateMathProblem();
    }
  }, [alarm]);

  const loadAlarm = async () => {
    try {
      const allAlarms = await StorageService.getAllAlarms();
      const foundAlarm = allAlarms.find(a => a.id === alarmId);
      setAlarm(foundAlarm || null);
    } catch (error) {
      console.error('Error loading alarm:', error);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
  };

  const startAnimations = () => {
    // Pulse animation for the main alarm
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shake animation for urgency
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Vibration pattern
    const vibrationPattern = [0, 1000, 500, 1000, 500, 1000];
    Vibration.vibrate(vibrationPattern, true);
  };

  const preventBackNavigation = () => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Prevent back navigation - user must solve puzzle or use buttons
      return true;
    });

    return () => backHandler.remove();
  };

  const generateMathProblem = () => {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer: number;
    let question: string;
    
    switch (operation) {
      case '+':
        answer = num1 + num2;
        question = `${num1} + ${num2} = ?`;
        break;
      case '-':
        answer = Math.max(num1, num2) - Math.min(num1, num2);
        question = `${Math.max(num1, num2)} - ${Math.min(num1, num2)} = ?`;
        break;
      case '*':
        const smallNum1 = Math.floor(Math.random() * 10) + 1;
        const smallNum2 = Math.floor(Math.random() * 10) + 1;
        answer = smallNum1 * smallNum2;
        question = `${smallNum1} × ${smallNum2} = ?`;
        break;
      default:
        answer = num1 + num2;
        question = `${num1} + ${num2} = ?`;
    }
    
    setMathProblem({ question, answer });
  };

  const checkMathAnswer = () => {
    if (!mathProblem) return;
    
    const userNum = parseInt(userAnswer);
    if (userNum === mathProblem.answer) {
      setPuzzleSolved(true);
      Vibration.cancel();
      Alert.alert(
        '✅ Correct!',
        'Puzzle solved! You can now dismiss the alarm.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        '❌ Incorrect',
        'Try again!',
        [{ text: 'OK' }]
      );
      setUserAnswer('');
      // Generate new problem after wrong answer
      generateMathProblem();
    }
  };

  const handleDismiss = async () => {
    if (alarm?.puzzleType && alarm.puzzleType !== PuzzleType.NONE && !puzzleSolved) {
      Alert.alert(
        'Solve Puzzle First',
        'You need to solve the puzzle before dismissing the alarm.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      Vibration.cancel();
      
      // Mark alarm as completed for today if it's not repeating
      if (!alarm?.repeatDays || alarm.repeatDays.length === 0) {
        await StorageService.updateAlarm(alarmId, { isEnabled: false });
      }
      
      // Update alarm statistics
      // TODO: Implement alarm statistics tracking
      
      onDismiss();
    } catch (error) {
      console.error('Error dismissing alarm:', error);
      onDismiss(); // Still dismiss even if there's an error
    }
  };

  const handleSnooze = async () => {
    try {
      Vibration.cancel();
      
      // Schedule snooze notification (5 minutes from now)
      const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
      
      // TODO: Implement proper snooze scheduling
      console.log(`😴 Snoozing alarm until ${snoozeTime.toLocaleTimeString()}`);
      
      onSnooze();
    } catch (error) {
      console.error('Error snoozing alarm:', error);
      onSnooze(); // Still snooze even if there's an error
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPuzzle = () => {
    if (!alarm?.puzzleType || alarm.puzzleType === PuzzleType.NONE) {
      return null;
    }

    switch (alarm.puzzleType) {
      case PuzzleType.MATH:
        return (
          <View style={styles.puzzleContainer}>
            <Text style={styles.puzzleTitle}>🧮 Solve to dismiss alarm</Text>
            {mathProblem && (
              <>
                <Text style={styles.mathQuestion}>{mathProblem.question}</Text>
                <View style={styles.answerContainer}>
                  <Text style={styles.answerText}>Answer: </Text>
                  <TouchableOpacity
                    style={styles.answerInput}
                    onPress={() => {
                      // Simple number input simulation
                      Alert.prompt(
                        'Enter Answer',
                        'What is the answer?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Check', 
                            onPress: (text) => {
                              setUserAnswer(text || '');
                              setTimeout(() => checkMathAnswer(), 100);
                            }
                          }
                        ],
                        'plain-text'
                      );
                    }}
                  >
                    <Text style={styles.answerInputText}>
                      {userAnswer || 'Tap to enter'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {puzzleSolved && (
                  <Text style={styles.puzzleSolved}>✅ Puzzle Solved!</Text>
                )}
              </>
            )}
          </View>
        );
      
      case PuzzleType.PATTERN:
        return (
          <View style={styles.puzzleContainer}>
            <Text style={styles.puzzleTitle}>🔲 Pattern Memory</Text>
            <Text style={styles.puzzleDescription}>
              Pattern puzzle coming soon...
            </Text>
          </View>
        );
      
      case PuzzleType.QR_CODE:
        return (
          <View style={styles.puzzleContainer}>
            <Text style={styles.puzzleTitle}>📷 Scan QR Code</Text>
            <Text style={styles.puzzleDescription}>
              QR code scanning coming soon...
            </Text>
          </View>
        );
      
      default:
        return null;
    }
  };

  if (!alarm) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Alarm not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          { transform: [{ translateX: shakeAnim }] }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.timeElapsed}>
            Ringing for {formatTime(timeElapsed)}
          </Text>
        </View>

        {/* Main Alarm Display */}
        <Animated.View 
          style={[
            styles.alarmDisplay,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <Text style={styles.alarmIcon}>⏰</Text>
          <Text style={styles.alarmTime}>{alarm.time}</Text>
          <Text style={styles.alarmLabel}>
            {alarm.label || 'Alarm'}
          </Text>
        </Animated.View>

        {/* Puzzle Section */}
        {renderPuzzle()}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.snoozeButton]}
            onPress={handleSnooze}
          >
            <Text style={styles.buttonText}>😴 Snooze (5 min)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button, 
              styles.dismissButton,
              (!puzzleSolved && alarm.puzzleType && alarm.puzzleType !== PuzzleType.NONE) && styles.disabledButton
            ]}
            onPress={handleDismiss}
            disabled={!puzzleSolved && alarm.puzzleType && alarm.puzzleType !== PuzzleType.NONE}
          >
            <Text style={[
              styles.buttonText,
              (!puzzleSolved && alarm.puzzleType && alarm.puzzleType !== PuzzleType.NONE) && styles.disabledButtonText
            ]}>
              🔕 Turn Off
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
  },
  timeElapsed: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  alarmDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  alarmIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  alarmTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  alarmLabel: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  puzzleContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  puzzleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  puzzleDescription: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.8,
  },
  mathQuestion: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  answerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  answerText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
  },
  answerInput: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    marginLeft: 10,
  },
  answerInputText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  puzzleSolved: {
    fontSize: 18,
    color: '#4FFFB0',
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  snoozeButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.8)',
  },
  dismissButton: {
    backgroundColor: 'rgba(40, 167, 69, 0.8)',
  },
  disabledButton: {
    backgroundColor: 'rgba(108, 117, 125, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    opacity: 0.5,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
});
