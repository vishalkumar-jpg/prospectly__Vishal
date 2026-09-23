export type RecruitmentEmailLogItem = {
  id: string;
  emailType: string;
  recipientType: string;
  subject: string | null;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  detailType: string | null;
  detailReason: string | null;
  canResend: boolean;
};

export type RecruitmentEmailLogsResponse = {
  logs: RecruitmentEmailLogItem[];
  hasHistoricalGap: boolean;
  /** Set by pool-match queries so resend uses the same audience as list/canResend. */
  audience?: "connector" | "recruiter";
};
