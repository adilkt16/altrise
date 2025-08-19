import { AlarmModalData } from '../components/AlarmModal';

export interface AlarmModalState {
  isVisible: boolean;
  data: AlarmModalData | null;
  startTime: Date | null;
  endTime: Date | null;
  persistentId: string | null;
}

class AlarmModalManager {
  private static instance: AlarmModalManager;
  private modalState: AlarmModalState = {
    isVisible: false,
    data: null,
    startTime: null,
    endTime: null,
    persistentId: null,
  };

  private modalStateListeners: ((state: AlarmModalState) => void)[] = [];
  private fallbackTimers: Map<string, NodeJS.Timeout> = new Map();
  private recentAlarmIds: Set<string> = new Set(); // Track recent alarms to prevent duplicates
  private alarmCooldowns: Map<string, number> = new Map(); // Track alarm cooldowns

  static getInstance(): AlarmModalManager {
    if (!AlarmModalManager.instance) {
      AlarmModalManager.instance = new AlarmModalManager();
    }
    return AlarmModalManager.instance;
  }

  /**
   * Subscribe to modal state changes
   */
  subscribe(listener: (state: AlarmModalState) => void): () => void {
    this.modalStateListeners.push(listener);
    console.log(`📱 [ModalManager] Listener subscribed, total: ${this.modalStateListeners.length}`);
    
    // Return unsubscribe function
    return () => {
      const index = this.modalStateListeners.indexOf(listener);
      if (index > -1) {
        this.modalStateListeners.splice(index, 1);
        console.log(`📱 [ModalManager] Listener unsubscribed, remaining: ${this.modalStateListeners.length}`);
      }
    };
  }

  /**
   * Show alarm modal with reliability mechanisms
   */
  async showAlarmModal(data: AlarmModalData): Promise<boolean> {
    try {
      // Check for duplicate/recent alarms (cooldown: 30 seconds)
      const now = Date.now();
      const cooldownPeriod = 30000; // 30 seconds
      
      if (this.alarmCooldowns.has(data.alarmId)) {
        const lastTrigger = this.alarmCooldowns.get(data.alarmId)!;
        if (now - lastTrigger < cooldownPeriod) {
          console.log(`⏰ [ModalManager] Alarm ${data.alarmId} in cooldown period, skipping duplicate`);
          return false;
        }
      }
      
      // Update cooldown
      this.alarmCooldowns.set(data.alarmId, now);
      
      console.log('🚨 ===============================================');
      console.log('🚨 MODAL MANAGER: SHOWING ALARM MODAL');
      console.log('🚨 ===============================================');
      console.log(`🚨 Alarm ID: ${data.alarmId}`);
      console.log(`🚨 Title: ${data.title}`);
      console.log(`🚨 Current time: ${new Date().toLocaleString()}`);

      const startTime = new Date();
      const persistentId = `alarm_${data.alarmId}_${startTime.getTime()}`;

      // Calculate end time if provided
      let endTime: Date | null = null;
      if (data.endTime) {
        endTime = new Date();
        const [hours, minutes] = data.endTime.split(':');
        endTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // If end time is in the past, add a day
        if (endTime <= startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }
      }

      // Update modal state
      this.modalState = {
        isVisible: true,
        data,
        startTime,
        endTime,
        persistentId,
      };

      // Notify all listeners
      this.notifyListeners();

      // Set up fallback mechanisms
      this.setupFallbackMechanisms(persistentId, data);

      console.log(`✅ [ModalManager] Modal state updated, notified ${this.modalStateListeners.length} listeners`);
      return true;

    } catch (error) {
      console.error('❌ [ModalManager] Error showing alarm modal:', error);
      
      // Send fallback notification
      await this.sendFallbackNotification(data);
      return false;
    }
  }

  /**
   * Hide alarm modal
   */
  hideAlarmModal(): void {
    console.log('🚨 [ModalManager] Hiding alarm modal');
    
    // Clear fallback timers
    if (this.modalState.persistentId) {
      this.clearFallbackMechanisms(this.modalState.persistentId);
    }

    // Reset modal state
    this.modalState = {
      isVisible: false,
      data: null,
      startTime: null,
      endTime: null,
      persistentId: null,
    };

    // Notify all listeners
    this.notifyListeners();
    
    console.log('✅ [ModalManager] Modal hidden and state cleared');
  }

  /**
   * Get current modal state
   */
  getModalState(): AlarmModalState {
    return { ...this.modalState };
  }

  /**
   * Check if modal should be shown (for app resume scenarios)
   */
  shouldRestoreModal(): boolean {
    if (!this.modalState.isVisible || !this.modalState.startTime) {
      return false;
    }

    const now = new Date();
    const modalAge = now.getTime() - this.modalState.startTime.getTime();
    const maxModalAge = 10 * 60 * 1000; // 10 minutes

    // Check if modal is still within reasonable time
    if (modalAge > maxModalAge) {
      console.log(`⚠️ [ModalManager] Modal too old (${Math.round(modalAge / 60000)} minutes), not restoring`);
      this.hideAlarmModal();
      return false;
    }

    // Check if we haven't passed the end time
    if (this.modalState.endTime && now > this.modalState.endTime) {
      console.log(`⚠️ [ModalManager] Past end time, not restoring modal`);
      this.hideAlarmModal();
      return false;
    }

    console.log(`✅ [ModalManager] Modal should be restored (age: ${Math.round(modalAge / 1000)}s)`);
    return true;
  }

  /**
   * Handle app state changes
   */
  handleAppStateChange(nextAppState: string): void {
    console.log(`📱 [ModalManager] App state changed to: ${nextAppState}`);
    
    if (nextAppState === 'active' && this.modalState.isVisible) {
      console.log(`📱 [ModalManager] App active with modal state, checking if restoration needed`);
      
      if (this.shouldRestoreModal()) {
        console.log(`📱 [ModalManager] Triggering modal restoration`);
        this.notifyListeners(); // Re-trigger modal display
      }
    } else if (nextAppState === 'background' && this.modalState.isVisible) {
      console.log(`📱 [ModalManager] App backgrounded with active modal - state preserved`);
      // Modal state is preserved, will be restored when app returns
    }
  }

  /**
   * Setup fallback mechanisms for modal reliability
   */
  private setupFallbackMechanisms(persistentId: string, data: AlarmModalData): void {
    console.log(`🛡️ [ModalManager] Setting up fallback mechanisms for ${persistentId}`);

    // Clear any existing fallback for this alarm to prevent duplicates
    this.clearFallbackMechanisms(persistentId);

    // Fallback notification if modal doesn't appear within 10 seconds (increased from 5)
    const fallbackTimer = setTimeout(async () => {
      // Only send fallback if modal is still supposed to be visible
      if (this.modalState.isVisible && this.modalState.data?.alarmId === data.alarmId) {
        console.log(`🔔 [ModalManager] Fallback triggered for ${persistentId}`);
        await this.sendFallbackNotification(data);
      } else {
        console.log(`🔔 [ModalManager] Fallback cancelled - modal no longer active for ${persistentId}`);
      }
    }, 10000); // Increased from 5000 to 10000

    this.fallbackTimers.set(persistentId, fallbackTimer);

    // Auto-dismiss at end time
    if (this.modalState.endTime) {
      const endTime = this.modalState.endTime;
      const timeUntilEnd = endTime.getTime() - new Date().getTime();
      
      if (timeUntilEnd > 0) {
        const autoDismissTimer = setTimeout(() => {
          console.log(`⏰ [ModalManager] Auto-dismissing modal at end time: ${endTime.toLocaleString()}`);
          this.hideAlarmModal();
        }, timeUntilEnd);

        this.fallbackTimers.set(`${persistentId}_auto_dismiss`, autoDismissTimer);
      }
    }
  }

  /**
   * Clear fallback mechanisms
   */
  private clearFallbackMechanisms(persistentId: string): void {
    console.log(`🛡️ [ModalManager] Clearing fallback mechanisms for ${persistentId}`);

    // Clear main fallback timer
    const fallbackTimer = this.fallbackTimers.get(persistentId);
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      this.fallbackTimers.delete(persistentId);
    }

    // Clear auto-dismiss timer
    const autoDismissTimer = this.fallbackTimers.get(`${persistentId}_auto_dismiss`);
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      this.fallbackTimers.delete(`${persistentId}_auto_dismiss`);
    }
  }

  /**
   * Send fallback notification if modal fails
   */
  private async sendFallbackNotification(data: AlarmModalData): Promise<void> {
    try {
      console.log('🔔 [ModalManager] Sending fallback notification');
      
      // Import Notifications here to avoid circular dependencies
      const Notifications = require('expo-notifications');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 ALARM MODAL ISSUE',
          body: `${data.title || data.label || 'Alarm'} - Please open the app to dismiss the alarm.`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true, // Make notification persistent
          data: {
            alarmId: data.alarmId,
            fallback: true,
            originalTitle: data.title,
          },
        },
        trigger: null, // Immediate
      });
      
      console.log('✅ [ModalManager] Fallback notification sent');
      
    } catch (error) {
      console.error('❌ [ModalManager] Failed to send fallback notification:', error);
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    console.log(`📢 [ModalManager] Notifying ${this.modalStateListeners.length} listeners`);
    
    this.modalStateListeners.forEach((listener, index) => {
      try {
        listener(this.modalState);
        console.log(`✅ [ModalManager] Listener ${index + 1} notified successfully`);
      } catch (error) {
        console.error(`❌ [ModalManager] Error notifying listener ${index + 1}:`, error);
      }
    });
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return {
      modalState: this.modalState,
      listenerCount: this.modalStateListeners.length,
      fallbackTimers: Array.from(this.fallbackTimers.keys()),
      shouldRestore: this.shouldRestoreModal(),
    };
  }
}

// Export singleton instance
export const modalManager = AlarmModalManager.getInstance();

// Global debug function
if (__DEV__) {
  (global as any).getModalDebugInfo = () => {
    const debugInfo = modalManager.getDebugInfo();
    console.log('🔍 ===============================================');
    console.log('🔍 MODAL MANAGER DEBUG INFO');
    console.log('🔍 ===============================================');
    console.log('🔍 Modal State:', debugInfo.modalState);
    console.log('🔍 Active Listeners:', debugInfo.listenerCount);
    console.log('🔍 Fallback Timers:', debugInfo.fallbackTimers);
    console.log('🔍 Should Restore:', debugInfo.shouldRestore);
    console.log('🔍 ===============================================');
    return debugInfo;
  };
}

export default modalManager;
