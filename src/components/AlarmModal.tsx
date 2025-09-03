import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Vibration,
  BackHandler,
  AppState,
  AppStateStatus,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { audioService, AudioConfig } from '../services/AudioService';

export interface AlarmModalData {
  alarmId: string;
  title: string;
  label?: string;
  originalTime: string;
  endTime: string; // Required end time for alarms
  puzzleType: 'none' | 'math'; // Only math puzzles supported
  soundFile: string; // Sound file identifier for alarm
  vibrationEnabled: boolean; // Whether vibration is enabled
  onDismiss: () => void;
  onSnooze: () => void;
}

interface PuzzleData {
  question: string;
  answer: string;
  options?: string[];
}

export const AlarmModal: React.FC<{
  visible: boolean;
  data: AlarmModalData | null;
  onClose: () => void;
}> = ({ visible, data, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTimeTimer, setEndTimeTimer] = useState<NodeJS.Timeout | null>(null);
  const [puzzleGenerated, setPuzzleGenerated] = useState(false); // Track if puzzle has been generated for this alarm
  
  // Reliability tracking
  const retryCount = useRef(0);
  const maxRetries = 2; // Reduced from 3 to 2
  const displayAttempts = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const fallbackSent = useRef(false); // Track if fallback notification already sent

  // Modal state persistence for app lifecycle changes
  const modalStateRef = useRef({
    isActive: false,
    alarmId: '',
    startTime: null as Date | null,
    puzzleStarted: false,
  });

  // Screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    console.log('🚨 ===============================================');
    console.log('🚨 ALARM MODAL LIFECYCLE EVENT');
    console.log('🚨 ===============================================');
    console.log(`🚨 Modal visible prop changed: ${visible}`);
    console.log(`🚨 Current internal state: ${isVisible}`);
    console.log(`🚨 App state: ${AppState.currentState}`);
    console.log(`🚨 Modal data:`, data);
    
    if (visible && data) {
      // Only call handleModalShow if modal is not already visible or if it's a new alarm
      const isNewAlarm = modalStateRef.current.alarmId !== data.alarmId;
      if (!isVisible || isNewAlarm) {
        console.log(`🚨 Showing modal: isVisible=${isVisible}, isNewAlarm=${isNewAlarm}`);
        handleModalShow(data);
      } else {
        console.log(`🚨 Modal already visible for same alarm, skipping handleModalShow`);
      }
    } else if (!visible) {
      handleModalHide();
    }
  }, [visible, data?.alarmId]); // Only depend on visible and alarmId, not the entire data object

  // Handle app state changes to persist modal state
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      console.log(`🚨 [AlarmModal] App state changed: ${previousState} -> ${nextAppState}`);
      
      if (modalStateRef.current.isActive) {
        console.log(`🚨 [AlarmModal] Modal is active during app state change`);
        
        if (nextAppState === 'background') {
          console.log(`🚨 [AlarmModal] App going to background with active modal`);
          // Modal state is preserved in modalStateRef
          // Audio should continue playing in background
        } else if (previousState.match(/inactive|background/) && nextAppState === 'active') {
          console.log(`🚨 [AlarmModal] App returning from background with modal state`);
          // Restore modal if it was active
          if (modalStateRef.current.isActive && !isVisible) {
            console.log(`🚨 [AlarmModal] Restoring modal after background return`);
            setIsVisible(true);
            setShowPuzzle(modalStateRef.current.puzzleStarted);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isVisible]);

  // Cleanup effect - stop audio when component unmounts
  useEffect(() => {
    return () => {
      console.log('🔊 [AlarmModal] Component unmounting - cleaning up audio');
      audioService.stopAlarmSound().catch(error => {
        console.error('❌ [AlarmModal] Failed to stop audio during cleanup:', error);
      });
    };
  }, []);

  // Handle Android back button
  useEffect(() => {
    const handleBackPress = () => {
      if (isVisible) {
        console.log('🚨 [AlarmModal] Back button pressed - preventing dismissal during alarm');
        // Prevent back button from dismissing alarm modal
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [isVisible]);

  const handleModalShow = async (modalData: AlarmModalData) => {
    try {
      console.log('🚨 ===============================================');
      console.log('🚨 SHOWING ALARM MODAL');
      console.log('🚨 ===============================================');
      console.log(`🚨 Alarm ID: ${modalData.alarmId}`);
      console.log(`🚨 Title: ${modalData.title}`);
      console.log(`🚨 Puzzle Type: ${modalData.puzzleType}`);
      console.log(`🚨 Current time: ${new Date().toLocaleString()}`);
      
      displayAttempts.current += 1;
      const currentTime = new Date();
      setStartTime(currentTime);
      
      // Check if this is a new alarm (different ID) and reset puzzle generation
      const previousAlarmId = modalStateRef.current.alarmId;
      if (previousAlarmId && previousAlarmId !== modalData.alarmId) {
        console.log(`🧩 [AlarmModal] New alarm detected (${previousAlarmId} -> ${modalData.alarmId}), resetting puzzle generation`);
        setPuzzleGenerated(false);
      }

      // Update persistent modal state
      modalStateRef.current = {
        isActive: true,
        alarmId: modalData.alarmId,
        startTime: currentTime,
        puzzleStarted: modalData.puzzleType !== 'none',
      };

      // Reset state for new alarm
      setUserAnswer('');
      setAttempts(0);
      setModalError(null);
      fallbackSent.current = false; // Reset fallback flag for new alarm
      
      // Start alarm audio
      console.log('🔊 [AlarmModal] Starting alarm audio...');
      const audioConfig: AudioConfig = {
        soundFile: modalData.soundFile || 'alarm_default',
        volume: 0.8, // High volume for alarm
        shouldLoop: true, // Loop until dismissed
        enableVibration: modalData.vibrationEnabled
      };
      
      const audioStarted = await audioService.startAlarmSound(audioConfig);
      if (audioStarted) {
        console.log('✅ [AlarmModal] Alarm audio started successfully');
      } else {
        console.error('❌ [AlarmModal] Failed to start alarm audio');
      }
      
      // Generate puzzle if needed - only once per alarm session
      if (modalData.puzzleType !== 'none' && !puzzleGenerated) {
        console.log(`🧩 [AlarmModal] About to generate puzzle for type: "${modalData.puzzleType}"`);
        const puzzle = generatePuzzle(modalData.puzzleType);
        setCurrentPuzzle(puzzle);
        setShowPuzzle(true);
        setPuzzleGenerated(true); // Mark puzzle as generated
        console.log(`🧩 Generated puzzle: ${puzzle.question} = ${puzzle.answer}`);
        console.log(`🧩 Show puzzle state: ${true}, Current puzzle:`, puzzle);
      } else if (modalData.puzzleType !== 'none' && puzzleGenerated) {
        console.log(`🧩 [AlarmModal] Puzzle already generated, keeping existing puzzle`);
        setShowPuzzle(true);
      } else {
        console.log(`🧩 [AlarmModal] No puzzle required (type: "${modalData.puzzleType}")`);
        setShowPuzzle(false);
        setCurrentPuzzle(null);
        setPuzzleGenerated(false);
      }

      // Set up auto-dismiss timer for end time
      const endTime = new Date();
      const [hours, minutes] = modalData.endTime.split(':');
      endTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const timeUntilEnd = endTime.getTime() - currentTime.getTime();
      if (timeUntilEnd > 0) {
        console.log(`⏰ Auto-dismiss scheduled for: ${endTime.toLocaleString()}`);
        const timer = setTimeout(() => {
          console.log(`⏰ Auto-dismissing alarm at end time: ${endTime.toLocaleString()}`);
          handleAutoDismiss().catch(error => {
            console.error('❌ [AlarmModal] Error in handleAutoDismiss:', error);
          });
        }, timeUntilEnd);
        setEndTimeTimer(timer);
      }

      // Show modal with retry mechanism
      await showModalWithRetry();
      
      // Start vibration pattern
      startAlarmVibration();
      
      console.log(`✅ Alarm modal displayed successfully (attempt ${displayAttempts.current})`);
      
    } catch (error) {
      console.error('❌ [AlarmModal] Error showing modal:', error);
      setModalError(`Failed to display alarm modal: ${error}`);
      
      // Fallback notification if modal fails - DISABLED to prevent dismiss/snooze alerts
      // await sendFallbackNotification(modalData);
    }
  };

  const showModalWithRetry = async () => {
    try {
      setIsVisible(true);
      
      // Verify modal is actually visible
      await new Promise(resolve => setTimeout(resolve, 200)); // Increased wait time
      
      if (!isVisible) {
        throw new Error('Modal failed to become visible');
      }
      
      retryCount.current = 0; // Reset retry count on success
      
    } catch (error) {
      console.error(`❌ [AlarmModal] Modal display failed (attempt ${retryCount.current + 1}):`, error);
      
      if (retryCount.current < maxRetries) {
        retryCount.current += 1;
        console.log(`🔄 [AlarmModal] Retrying modal display (${retryCount.current}/${maxRetries})`);
        
        // Exponential backoff with longer delays
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount.current));
        
        return showModalWithRetry();
      } else {
        throw new Error(`Modal display failed after ${maxRetries} attempts`);
      }
    }
  };

  const sendFallbackNotification = async (modalData: AlarmModalData) => {
    try {
      // Prevent duplicate fallback notifications
      if (fallbackSent.current) {
        console.log('🔔 [AlarmModal] Fallback notification already sent, skipping');
        return;
      }
      
      fallbackSent.current = true;
      console.log('🔔 [AlarmModal] Sending fallback notification for failed modal');
      
      // Import Notifications here to avoid circular dependencies
      const Notifications = require('expo-notifications');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 ALARM MODAL FAILED',
          body: `${modalData.title || modalData.label || 'Alarm'} - Modal display failed. Please open the app.`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // Immediate
      });
      
      console.log('✅ [AlarmModal] Fallback notification sent');
      
    } catch (error) {
      console.error('❌ [AlarmModal] Failed to send fallback notification:', error);
    }
  };

  const handleModalHide = async () => {
    console.log('🚨 [AlarmModal] Hiding alarm modal');
    
    // Stop alarm audio immediately
    console.log('🔊 [AlarmModal] Stopping alarm audio...');
    await audioService.stopAlarmSound();
    console.log('✅ [AlarmModal] Alarm audio stopped');
    
    setIsVisible(false);
    setShowPuzzle(false);
    setCurrentPuzzle(null);
    setUserAnswer('');
    setAttempts(0);
    setModalError(null);
    setStartTime(null);
    setPuzzleGenerated(false); // Reset puzzle generation flag
    
    // Clear timers
    if (endTimeTimer) {
      clearTimeout(endTimeTimer);
      setEndTimeTimer(null);
    }
    
    // Stop vibration
    Vibration.cancel();
    
    // Reset persistent state
    modalStateRef.current = {
      isActive: false,
      alarmId: '',
      startTime: null,
      puzzleStarted: false,
    };
    
    console.log('✅ [AlarmModal] Modal hidden and state cleared');
  };

  const startAlarmVibration = () => {
    try {
      // Continuous vibration pattern for alarm
      const pattern = [0, 1000, 500, 1000, 500]; // 1s on, 0.5s off, repeat
      Vibration.vibrate(pattern, true); // Repeat indefinitely
      console.log('📳 [AlarmModal] Alarm vibration started');
    } catch (error) {
      console.error('❌ [AlarmModal] Failed to start vibration:', error);
    }
  };

  const generatePuzzle = (type: string): PuzzleData => {
    console.log(`🧩 [AlarmModal] Generating puzzle of type: ${type}`);
    
    if (type === 'math') {
      return generateMathPuzzle();
    } else if (type === 'none') {
      return { question: 'No puzzle required', answer: '' };
    } else {
      // Default to math for any unrecognized type
      console.log(`🧩 [AlarmModal] Unknown puzzle type '${type}', defaulting to math`);
      return generateMathPuzzle();
    }
  };

  const generateMathPuzzle = (): PuzzleData => {
    // Generate simple arithmetic problems with answers between 1-100
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let a: number, b: number, answer: number;
    
    switch (operation) {
      case '+':
        // Addition: ensure sum is between 1-100
        a = Math.floor(Math.random() * 40) + 1;  // 1-40
        b = Math.floor(Math.random() * (100 - a)) + 1;  // 1 to (100-a)
        answer = a + b;
        break;
      case '-':
        // Subtraction: ensure positive result between 1-100
        answer = Math.floor(Math.random() * 100) + 1;  // 1-100
        b = Math.floor(Math.random() * answer) + 1;     // 1 to answer
        a = answer + b;
        break;
      case '*':
        // Multiplication: small numbers to keep result under 100
        a = Math.floor(Math.random() * 10) + 1;  // 1-10
        b = Math.floor(Math.random() * Math.floor(100/a)) + 1;  // 1 to floor(100/a)
        answer = a * b;
        break;
      default:
        a = 2; b = 3; answer = 5;
    }
    
    const question = `${a} ${operation} ${b} = ?`;
    console.log(`🔢 Math puzzle: ${question} (answer: ${answer})`);
    
    return {
      question,
      answer: answer.toString(),
    };
  };

  const handleAnswerSubmit = () => {
    if (!currentPuzzle) return;
    
    const isCorrect = userAnswer.trim() === currentPuzzle.answer;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    console.log(`🧩 [AlarmModal] Puzzle attempt ${newAttempts}: "${userAnswer}" ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    
    if (isCorrect) {
      console.log('✅ [AlarmModal] Puzzle solved! Allowing dismiss.');
      handleDismiss().catch(error => {
        console.error('❌ [AlarmModal] Error in handleDismiss:', error);
      });
    } else {
      console.log(`❌ [AlarmModal] Incorrect answer. Continue trying until correct or end time reached.`);
      setUserAnswer('');
    }
  };

  const handleDismiss = async () => {
    console.log('✅ [AlarmModal] Alarm dismissed by user');
    console.log(`⏱️ [AlarmModal] Alarm duration: ${startTime ? Math.round((new Date().getTime() - startTime.getTime()) / 1000) : 0} seconds`);
    
    // Add before dismissing
    try {
      const { AlarmForegroundService } = require('../services/AlarmForegroundService');
      await AlarmForegroundService.stopAlarmService();
      console.log('🛑 [AlarmModal] Foreground service stopped successfully');
    } catch (error) {
      console.error('❌ [AlarmModal] Error stopping foreground service:', error);
    }
    
    if (data?.onDismiss) {
      data.onDismiss();
    }
    onClose();
  };

  const handleSnooze = async () => {
    console.log('😴 [AlarmModal] Alarm snoozed by user');
    console.log(`⏱️ [AlarmModal] Alarm duration before snooze: ${startTime ? Math.round((new Date().getTime() - startTime.getTime()) / 1000) : 0} seconds`);
    
    // Add before snoozing
    try {
      const { AlarmForegroundService } = require('../services/AlarmForegroundService');
      await AlarmForegroundService.stopAlarmService();
      console.log('🛑 [AlarmModal] Foreground service stopped successfully');
    } catch (error) {
      console.error('❌ [AlarmModal] Error stopping foreground service:', error);
    }
    
    if (data?.onSnooze) {
      data.onSnooze();
    }
    onClose();
  };

  const handleAutoDismiss = async () => {
    console.log('⏰ [AlarmModal] Auto-dismissing alarm at end time');
    await handleDismiss();
  };

  if (!data) {
    console.log('⚠️ [AlarmModal] No modal data provided');
    return null;
  }

  // Log puzzle state on every render
  console.log(`🧩 [AlarmModal Render] showPuzzle: ${showPuzzle}, currentPuzzle:`, currentPuzzle);
  console.log(`🧩 [AlarmModal Render] puzzleType from data: ${data.puzzleType}`);

  return (
    <Modal
      visible={isVisible}
      transparent={false}
      animationType="none" // No animation for reliability
      onRequestClose={() => {
        console.log('🚨 [AlarmModal] Modal close requested - preventing');
        // Prevent closing until puzzle is solved or dismissed
        return false;
      }}
      presentationStyle="fullScreen" // Full screen for maximum visibility
      supportedOrientations={['portrait', 'landscape']}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.alarmContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.timeText}>{new Date().toLocaleTimeString()}</Text>
            <Text style={styles.titleText}>{data.title}</Text>
            {data.label && <Text style={styles.labelText}>{data.label}</Text>}
          </View>

          {/* Error Display */}
          {modalError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {modalError}</Text>
            </View>
          )}

          {/* Puzzle Section */}
          {showPuzzle && currentPuzzle ? (
            <View style={styles.puzzleContainer}>
              <Text style={styles.puzzleTitle}>Solve to dismiss alarm:</Text>
              <Text style={styles.puzzleQuestion}>{currentPuzzle.question}</Text>
              <TextInput
                style={styles.puzzleInput}
                value={userAnswer}
                onChangeText={setUserAnswer}
                placeholder="Enter answer"
                keyboardType="numeric"
                autoFocus={true}
                onSubmitEditing={handleAnswerSubmit}
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleAnswerSubmit}>
                <Text style={styles.buttonText}>Submit Answer</Text>
              </TouchableOpacity>
              <Text style={styles.attemptsText}>Attempts: {attempts}</Text>
            </View>
          ) : (
            /* Show fallback if puzzle should be shown but isn't ready */
            showPuzzle && (
              <View style={styles.puzzleContainer}>
                <Text style={styles.puzzleTitle}>Loading puzzle...</Text>
              </View>
            )
          )}
          {/* Debug info for puzzle state */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>Puzzle Debug:</Text>
              <Text style={styles.debugText}>showPuzzle: {showPuzzle ? 'true' : 'false'}</Text>
              <Text style={styles.debugText}>currentPuzzle: {currentPuzzle ? 'exists' : 'null'}</Text>
              <Text style={styles.debugText}>puzzleGenerated: {puzzleGenerated ? 'true' : 'false'}</Text>
              <Text style={styles.debugText}>puzzleType: {data.puzzleType}</Text>
              {currentPuzzle && (
                <Text style={styles.debugText}>question: {currentPuzzle.question}</Text>
              )}
            </View>
          )}

          {/* Debug Info (development only) */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>Debug Info:</Text>
              <Text style={styles.debugText}>Alarm ID: {data.alarmId}</Text>
              <Text style={styles.debugText}>Display Attempts: {displayAttempts.current}</Text>
              <Text style={styles.debugText}>App State: {AppState.currentState}</Text>
              <Text style={styles.debugText}>Modal Active: {modalStateRef.current.isActive ? 'Yes' : 'No'}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF4444', // Bright red for alarm
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF4444',
    marginBottom: 10,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  labelText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFE6E6',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#CC0000',
    textAlign: 'center',
    fontSize: 14,
  },
  puzzleContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  puzzleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  puzzleQuestion: {
    fontSize: 24,
    color: '#444',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 32,
  },
  puzzleInput: {
    width: '100%',
    height: 50,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: 'white',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  attemptsText: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: '#28A745',
  },
  snoozeButton: {
    backgroundColor: '#FFC107',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default AlarmModal;
