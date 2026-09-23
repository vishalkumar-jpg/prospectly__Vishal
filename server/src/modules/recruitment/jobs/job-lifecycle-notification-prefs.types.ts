export interface JobLifecycleNotificationSelection {
  sendNotifications: boolean;
  candidateStageKeys: string[];
}

export interface JobLifecycleNotificationPrefs {
  lastClose?: JobLifecycleNotificationSelection;
  lastReopen?: JobLifecycleNotificationSelection;
}
