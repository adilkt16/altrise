import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PermissionService, PermissionState } from '../services/PermissionService';
import { StorageService } from '../services/StorageService';

const { width } = Dimensions.get('window');

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
}

interface StepData {
  id: string;
  title: string;
  description: string;
  icon: string;
  permissionType: 'notifications' | 'displayOverApps';
  whyNeeded: string[];
  buttonText: string;
  skipText: string;
}

const ONBOARDING_STEPS: StepData[] = [
  {
    id: 'notifications',
    title: 'Enable Notifications',
    description: 'AltRise needs notification permissions to wake you up with alarms',
    icon: '🔔',
    permissionType: 'notifications',
    whyNeeded: [
      'Display alarm notifications when they trigger',
      'Show persistent notifications during active alarms',
      'Provide snooze and dismiss controls',
      'Ensure you never miss an important alarm'
    ],
    buttonText: 'Enable Notifications',
    skipText: 'Skip for now',
  },
  {
    id: 'displayOverApps',
    title: 'Display Over Other Apps',
    description: 'Allow AltRise to show alarms on top of other applications',
    icon: '📱',
    permissionType: 'displayOverApps',
    whyNeeded: [
      'Show alarm interface over any running app',
      'Ensure alarm is visible even when phone is locked',
      'Display puzzle challenges to turn off alarms',
      'Prevent accidentally dismissing alarms'
    ],
    buttonText: 'Enable Display Permission',
    skipText: 'Maybe later',
  },
];

type PermissionStatus = 'checking' | 'granted' | 'denied' | 'never_ask_again' | 'settings_required';

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Record<string, PermissionStatus>>({});
  const [slideAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkInitialPermissions();
  }, []);

  useEffect(() => {
    animateSlide();
  }, [currentStep]);

  const checkInitialPermissions = async () => {
    try {
      const notificationStatus = await PermissionService.checkNotificationPermissions();
      const displayOverAppsStatus = await PermissionService.checkDisplayOverOtherAppsPermission();

      const newStatuses: Record<string, PermissionStatus> = {};
      
      // Check notification status
      if (notificationStatus.granted) {
        newStatuses.notifications = 'granted';
        setCompletedSteps(prev => new Set([...Array.from(prev), 'notifications']));
      } else if (notificationStatus.state === PermissionState.NEVER_ASK_AGAIN) {
        newStatuses.notifications = 'never_ask_again';
      } else {
        newStatuses.notifications = 'denied';
      }

      // Check display over apps status
      if (displayOverAppsStatus.granted) {
        newStatuses.displayOverApps = 'granted';
        setCompletedSteps(prev => new Set([...Array.from(prev), 'displayOverApps']));
      } else {
        newStatuses.displayOverApps = 'denied';
      }

      setStepStatuses(newStatuses);

      // If both permissions are already granted, complete onboarding
      if (notificationStatus.granted && displayOverAppsStatus.granted) {
        await markOnboardingComplete();
        onComplete();
      }
    } catch (error) {
      console.error('Error checking initial permissions:', error);
    }
  };

  const animateSlide = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: currentStep * -width,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const markOnboardingComplete = async () => {
    try {
      await StorageService.updateUserSettings({
        onboardingCompleted: true,
      });
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  };

  const handlePermissionRequest = async (step: StepData) => {
    setLoading(true);
    setStepStatuses(prev => ({ ...prev, [step.id]: 'checking' }));

    try {
      if (step.permissionType === 'notifications') {
        const result = await PermissionService.requestNotificationPermissions();
        
        if (result.granted) {
          setStepStatuses(prev => ({ ...prev, [step.id]: 'granted' }));
          setCompletedSteps(prev => new Set([...Array.from(prev), step.id]));
          
          // Small delay to show success state
          setTimeout(() => {
            if (currentStep < ONBOARDING_STEPS.length - 1) {
              setCurrentStep(currentStep + 1);
            } else {
              completeOnboarding();
            }
          }, 1500);
        } else if (result.state === PermissionState.NEVER_ASK_AGAIN) {
          setStepStatuses(prev => ({ ...prev, [step.id]: 'never_ask_again' }));
        } else {
          setStepStatuses(prev => ({ ...prev, [step.id]: 'denied' }));
        }
      } else if (step.permissionType === 'displayOverApps') {
        // For DOOA, we need to open settings
        await PermissionService.requestDisplayOverOtherAppsPermission();
        setStepStatuses(prev => ({ ...prev, [step.id]: 'settings_required' }));
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setStepStatuses(prev => ({ ...prev, [step.id]: 'denied' }));
      Alert.alert('Error', 'Failed to request permission. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = async (step: StepData) => {
    try {
      if (step.permissionType === 'notifications') {
        await PermissionService.openNotificationSettings();
      } else if (step.permissionType === 'displayOverApps') {
        await PermissionService.openDisplayOverOtherAppsSettings();
      }
    } catch (error) {
      console.error('Error opening settings:', error);
      Alert.alert('Error', 'Failed to open settings. Please open them manually.');
    }
  };

  const handleSkipStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSkipAll();
    }
  };

  const handleSkipAll = () => {
    Alert.alert(
      'Skip Onboarding?',
      'You can enable permissions later in Settings. Some alarm features may not work properly without these permissions.',
      [
        { text: 'Go Back', style: 'cancel' },
        { 
          text: 'Skip Anyway', 
          style: 'destructive',
          onPress: async () => {
            await markOnboardingComplete();
            onSkip?.();
          }
        }
      ]
    );
  };

  const completeOnboarding = async () => {
    await markOnboardingComplete();
    onComplete();
  };

  const handleRetryCheck = async () => {
    await checkInitialPermissions();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {ONBOARDING_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index <= currentStep && styles.progressDotActive,
              completedSteps.has(ONBOARDING_STEPS[index].id) && styles.progressDotCompleted
            ]} 
          />
        ))}
      </View>

      {/* Steps container */}
      <Animated.View 
        style={[
          styles.stepsContainer,
          {
            transform: [{ translateX: slideAnim }],
            opacity: fadeAnim,
          }
        ]}
      >
        {ONBOARDING_STEPS.map((step, index) => (
          <View key={step.id} style={[styles.stepContainer, { width }]}>
            <ScrollView
              style={styles.stepContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.stepScrollContent}
            >
              {/* Step header */}
              <View style={styles.stepHeader}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>

              {/* Why section */}
              <View style={styles.whySection}>
                <Text style={styles.whySectionTitle}>Why is this needed?</Text>
                {step.whyNeeded.map((reason, idx) => (
                  <View style={styles.reasonItem} key={idx}>
                    <Text style={styles.reasonBullet}>•</Text>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </View>

              {/* Status message */}
              {(() => {
                const status = stepStatuses[step.id];
                if (status && status !== 'denied') {
                  return (
                    <View style={styles.statusContainer}>
                      {status === 'granted' && (
                        <Text style={styles.successMessage}>
                          ✓ Permission granted! You're all set.
                        </Text>
                      )}
                      {status === 'settings_required' && (
                        <Text style={styles.warningMessage}>
                          ⚠️ Please enable this permission in settings, then tap "I've Enabled It" below.
                        </Text>
                      )}
                      {status === 'checking' && (
                        <Text style={styles.infoMessage}>
                          Checking permission status...
                        </Text>
                      )}
                    </View>
                  );
                }
                return null;
              })()}

              {/* Permission button */}
              <View style={styles.buttonContainer}>
                {(() => {
                  const status = stepStatuses[step.id];
                  if (status === 'checking') {
                    return (
                      <TouchableOpacity style={[styles.permissionButton, styles.loadingButton]} disabled>
                        <Text style={styles.permissionButtonText}>Checking...</Text>
                      </TouchableOpacity>
                    );
                  }
                  
                  if (status === 'granted') {
                    return (
                      <View style={[styles.permissionButton, styles.successButton]}>
                        <Text style={styles.successButtonText}>✓ Permission Granted</Text>
                      </View>
                    );
                  }
                  
                  if (status === 'settings_required') {
                    return (
                      <TouchableOpacity
                        style={[styles.permissionButton, styles.settingsButton]}
                        onPress={() => handleOpenSettings(step)}
                      >
                        <Text style={styles.permissionButtonText}>Open Settings</Text>
                      </TouchableOpacity>
                    );
                  }
                  
                  return (
                    <TouchableOpacity
                      style={styles.permissionButton}
                      onPress={() => handlePermissionRequest(step)}
                    >
                      <Text style={styles.permissionButtonText}>{step.buttonText}</Text>
                    </TouchableOpacity>
                  );
                })()}
                {stepStatuses[step.id] === 'settings_required' && (
                  <TouchableOpacity
                    style={[styles.permissionButton, styles.retryButton]}
                    onPress={handleRetryCheck}
                  >
                    <Text style={styles.retryButtonText}>I've Enabled It</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            {/* Bottom navigation */}
            <View style={styles.bottomNavigation}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipStep}
              >
                <Text style={styles.skipButtonText}>{step.skipText}</Text>
              </TouchableOpacity>
              {index === ONBOARDING_STEPS.length - 1 && (
                <TouchableOpacity
                  style={styles.finishButton}
                  onPress={completeOnboarding}
                >
                  <Text style={styles.finishButtonText}>Finish Setup</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#6366f1',
  },
  progressDotCompleted: {
    backgroundColor: '#059669',
  },
  stepsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  whySection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  whySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reasonBullet: {
    fontSize: 16,
    color: '#6366f1',
    marginRight: 12,
    marginTop: 2,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  statusContainer: {
    marginBottom: 20,
  },
  successMessage: {
    fontSize: 16,
    color: '#059669',
    textAlign: 'center',
    fontWeight: '500',
  },
  warningMessage: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
  },
  infoMessage: {
    fontSize: 14,
    color: '#1e40af',
    textAlign: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  permissionButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingButton: {
    backgroundColor: '#94a3b8',
  },
  successButton: {
    backgroundColor: '#059669',
  },
  settingsButton: {
    backgroundColor: '#dc2626',
  },
  retryButton: {
    backgroundColor: '#0891b2',
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomNavigation: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  finishButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default OnboardingFlow;
