import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AlarmContextType {
  activeAlarmId: string | null;
  isAlarmActive: boolean;
  showAlarmScreen: (alarmId: string) => void;
  hideAlarmScreen: () => void;
  snoozeAlarm: () => void;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

interface AlarmProviderProps {
  children: ReactNode;
}

export const AlarmProvider: React.FC<AlarmProviderProps> = ({ children }) => {
  const [activeAlarmId, setActiveAlarmId] = useState<string | null>(null);
  const [isAlarmActive, setIsAlarmActive] = useState(false);

  const showAlarmScreen = (alarmId: string) => {
    console.log(`🚨 Showing alarm screen for alarm: ${alarmId}`);
    setActiveAlarmId(alarmId);
    setIsAlarmActive(true);
  };

  const hideAlarmScreen = () => {
    console.log('🔕 Hiding alarm screen');
    setActiveAlarmId(null);
    setIsAlarmActive(false);
  };

  const snoozeAlarm = () => {
    console.log('😴 Snoozing alarm');
    hideAlarmScreen();
  };

  return (
    <AlarmContext.Provider
      value={{
        activeAlarmId,
        isAlarmActive,
        showAlarmScreen,
        hideAlarmScreen,
        snoozeAlarm,
      }}
    >
      {children}
    </AlarmContext.Provider>
  );
};

export const useAlarm = (): AlarmContextType => {
  const context = useContext(AlarmContext);
  if (context === undefined) {
    throw new Error('useAlarm must be used within an AlarmProvider');
  }
  return context;
};
