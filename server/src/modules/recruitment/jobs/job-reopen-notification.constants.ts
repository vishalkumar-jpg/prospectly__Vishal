export interface JobReopenedNotificationJobData {
  jobId: string;
  reopenedByUserId: string;
  /** Empty = connectors only. Includes `all` or specific stage keys. */
  candidateStageKeys: string[];
}
