// Navigation types for the AltRise app
export type RootStackParamList = {
  Home: undefined;
  AddAlarm: undefined;
  EditAlarm: {
    alarmId: string;
  };
  Settings: undefined;
};

export type HomeScreenNavigationProp = any;
export type AddAlarmScreenNavigationProp = any;
export type EditAlarmScreenNavigationProp = any;
