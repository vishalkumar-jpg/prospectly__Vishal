export interface BackfillScoreBreakdownJobData {
  jobIds: string[];
  /** When false, rows that already carry a breakdown are skipped. */
  force: boolean;
}
