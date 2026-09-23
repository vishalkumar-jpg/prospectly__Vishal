export const RESEND_WEBHOOKS_MESSAGES = {
  ERROR: {
    MISSING_EMAIL_ID: "Missing email_id",
    INVALID_SIGNATURE: "Invalid webhook signature",
    MISSING_SIGNATURE_HEADERS: "Missing required signature headers",
    MISSING_WEBHOOK_SECRET: "Webhook secret is not configured",
  },
};

export const RESEND_WEBHOOKS_EVENT_TYPES = {
  EMAIL_SENT: "email.sent",
  EMAIL_DELIVERED: "email.delivered",
  EMAIL_DELIVERY_DELAYED: "email.delivery_delayed",
  EMAIL_SCHEDULED: "email.scheduled",
  EMAIL_RECEIVED: "email.received",
  EMAIL_FAILED: "email.failed",
  EMAIL_BOUNCED: "email.bounced",
  EMAIL_CLICKED: "email.clicked",
  EMAIL_COMPLAINED: "email.complained",
};

export const RESEND_WEBHOOKS_STATUS = {
  PENDING: "pending",
  SCHEDULED: "scheduled",
  SENT: "sent",
  DELIVERY_DELAYED: "delivery_delayed",
  DELIVERED: "delivered",
  RECEIVED: "received",
  FAILED: "failed",
  BOUNCED: "bounced",
  COMPLAINED: "complained",
};

export const STATUS_PRIORITY = {
  pending: 0,
  scheduled: 1,
  sent: 2,
  delivery_delayed: 3,
  delivered: 4,
  received: 5,
  failed: 100,
  bounced: 100,
  complained: 100,
};
