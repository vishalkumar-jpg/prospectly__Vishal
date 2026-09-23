export enum NameSlug {
  PlatformFees = "platform_fees",
  DisputeWindow = "dispute_window",
  ConferenceLink = "conference_link",
  /** JSONB: number `7`, or `{ "days": 7 }`. Missing/0/invalid = immediate purge. */
  AccountDeletionGracePeriodDays = "account_deletion_grace_period_days",
  UnsuccessfulEnabledTimePeriod = "unsuccessful_enabled_time_period",
  /** JSON: `{ "to": [...], "bcc": [...] }` or legacy `{ "feedback_notification_emails": { "to", "bcc" } }` */
  FeedbackNotificationRecipients = "feedback_notification_recipients",
  /** Days in In Review before one-time status emails (sent on day N+1). Must be configured with integer ≥ 1 or cron skips. */
  InReviewReminderDays = "in_review_reminder_days",
}

/** Legacy nested key inside `feedback_notification_recipients` config value. */
export const FEEDBACK_NOTIFICATION_EMAILS_KEY = "feedback_notification_emails";
