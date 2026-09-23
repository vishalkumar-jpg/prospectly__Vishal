export const CONSENT_UPDATE_EMAIL_SEND_QUEUE_NAME = "consent-update-email-send";

export const CONSENT_UPDATE_EMAIL_SEND_JOB = "send-consent-update-email";

export const CONSENT_UPDATE_EMAIL_SEND_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 5000 },
    removeOnComplete: true,
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
      count: 100,
    },
  },
};

export type ConsentUpdateEmailSendJobData = {
  poolMatchId: string;
  recruitmentJobId: string;
  consentToken: string;
  to: string;
  candidateName: string;
  connectorName: string;
  jobTitle: string;
  companyName: string;
  consentLink: string;
  createdBy: string;
};
