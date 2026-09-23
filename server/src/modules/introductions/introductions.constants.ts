export const IntroductionStatus = {
  PENDING: "pending",
  INTRO_SENT: "intro_sent",
  MEETING_SCHEDULED: "meeting_scheduled",
  MEETING_BOOKED: "meeting_booked",
  MEETING_RESCHEDULED: "meeting_rescheduled",
  MEETING_COMPLETED: "meeting_completed",
  PEER_FEEDBACK: "peer_feedback",
  COMPLETED: "completed",
  ARCHIVED: "archived",
  CANCELLED: "cancelled",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
} as const;

export const DEFAULT_EMAIL_CONFIG = {
  FROM: "noreply@prospectly.com",
  NAME: "Prospectly",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  FAILED: "failed",
  COMPLETED: "completed",
} as const;

export const INTRODUCTIONS_MESSAGES = {
  ERROR: {
    REQUEST_NOT_FOUND: "Introduction request not found",
    ACCESS_DENIED: "Access denied",
    ONLY_CONTACT_OWNER_OR_POTENTIAL_CAN_ACCEPT:
      "Only contact owner or potential connector can accept this request",
    ONLY_CONTACT_OWNER_OR_POTENTIAL_CAN_DECLINE:
      "Only contact owner or potential connector can decline this request",
    ONLY_ACCEPTED_CONNECTOR_CAN_SEND_EMAIL:
      "Only the connector who accepted this request can send the introduction email",
    REQUESTER_PROFILE_NOT_FOUND: "Requester profile not found",
    CONTACT_NOT_FOUND: "Contact not found",
    CONTACT_EMAIL_NOT_FOUND:
      "Contact email not found or could not be decrypted",
    CONNECTOR_PROFILE_NOT_FOUND: "Connector profile not found",
    FAILED_TO_SEND_EMAIL: "Failed to send introduction email",
    CONTACT_OWNER_OR_ID_REQUIRED:
      "Either contact owner or contact ID is required",
    NO_PAYMENT_METHOD:
      "Please add a payment method before creating introduction requests",
    INVALID_BOOKING_LINK: "Invalid or expired booking link",
    BOOKING_LINK_EXPIRED: "Booking link has expired",
    INVALID_BOOKED_DATE: "Invalid booked meeting_date",
    PAYMENT_AUTH_FAILED:
      "Unable to complete meeting booking. Payment authorization failed. Please contact support.",
    ONLY_REQUESTER_OR_CONNECTOR_ACKNOWLEDGE:
      "Only requester or connector can acknowledge meeting completion",
    ONLY_REQUESTER_OR_CONNECTOR_VIEW_FEEDBACK:
      "Only requester or connector can view feedback",
    ONLY_REQUESTER_OR_CONNECTOR_SUBMIT_FEEDBACK:
      "Only requester or connector can submit feedback",
    CONTACT_OWNER_REQUIRED:
      "Contact owner is required. Please provide either contactOwnerId or contactId.",
    CONTACT_NO_CONNECTORS: (id: number) =>
      `Contact owner is required. The contact with ID ${id} does not have any connectors assigned in the contact_relationships table, and has no original importer.`,
    MINIMUM_BOUNTY_REQUIRED: (amount: number) =>
      `Referral payout amount cannot be lower than the minimum required for this contact. Minimum referral payout: $${amount.toLocaleString()}`,
    CONTACT_NOT_FOUND_ID: (id: number) => `Contact with ID ${id} not found`,
    FAILED_CREATE_PAYMENT_INTENTS: (retryMessage: string) =>
      `Failed to create dual PaymentIntents: ${retryMessage}`,
    FAILED_CAPTURE_PAYMENT: (error: string) =>
      `Unable to complete meeting booking. Payment authorization failed: ${error}. Please contact support.`,
    FEEDBACK_NOT_FOUND: "Feedback not found",
    ACTIVE_REQUEST_LIMIT_REACHED:
      "You've reached your active introduction requests limit. Please upgrade your subscription plan to create more active introduction requests.",
    PENDING_FEEDBACK_REQUIRED:
      "You have pending feedback requests that must be completed before making new introduction requests.",
    ALREADY_ACCEPTED:
      "This introduction request has already been accepted by another connector",
    MEETING_ALREADY_BOOKED:
      "This meeting has already been booked. Refresh the page or return to this tab to see the scheduled time.",
    CANNOT_REQUEST_OWN_CONTACT:
      "You cannot request an introduction to your own contact.",
  },
  INFO: {
    REQUEST_ACCEPTED: "Introduction request accepted successfully",
    EMAIL_SENT: "Introduction email sent successfully",
    MEETING_ALREADY_BOOKED:
      "Meeting has already been booked for this introduction",
    MEETING_BOOKED_SUCCESS: "Meeting booked successfully",
    MEETING_COMPLETION_ACKNOWLEDGED:
      "Meeting completion acknowledged successfully",
    FEEDBACK_SUBMITTED: "Feedback submitted successfully",
  },
  LOG: {
    SENDING_EMAIL: (contactId: number) =>
      `Sending introduction email to decrypted email for contact ${contactId}`,
    EMAIL_LOG_UPDATED: (requestId: string, emailId: string) =>
      `Email log updated for retry - Introduction ${requestId}, New Resend ID: ${emailId}`,
    EMAIL_LOG_CREATED: (requestId: string, emailId: string) =>
      `Email log created for introduction ${requestId}, Resend ID: ${emailId}`,
    ERROR_SENDING_EMAIL: "Error sending introduction email:",
    PROCESSING_REQUEST: (
      contactId: number | null,
      contactOwnerId: string | null
    ) =>
      `Processing introduction request with contactId: ${contactId}, contactOwnerId: ${contactOwnerId}`,
    CONTACT_NOT_FOUND: (id: number) => `Contact ${id} not found`,
    FOUND_CONTACT: (
      contactId: number,
      name: string,
      importerId: string | null
    ) =>
      `Found contact ${contactId}: ${name}, originalImporterId: ${importerId}`,
    NO_CONTACT_OWNER: (contactId: number) =>
      `No contactOwnerId provided, fetching connectors from contact_relationships for contact ${contactId}`,
    FOUND_CONNECTORS: (contactId: number, count: number, ids: string) =>
      `Found ${count} connectors for contact ${contactId}: ${ids}`,
    USING_FIRST_CONNECTOR: (id: string) =>
      `Using first connector ${id} as contactOwnerId`,
    FALLBACK_IMPORTER: (id: string) =>
      `No connectors found, falling back to originalImporterId: ${id}`,
    NO_CONNECTORS_FOUND: (contactId: number) =>
      `Contact ${contactId} has no connectors and no originalImporterId`,
    CREATED_POTENTIAL_CONNECTORS: (count: number, requestId: string) =>
      `Created ${count} potential connector entries for request ${requestId}`,
    FAILED_POTENTIAL_CONNECTORS: (requestId: string, error: string) =>
      `Failed to create potential connector entries for request ${requestId}: ${error}`,
    CREATING_DUAL_PAYMENTS: (requestId: string) =>
      `Creating dual PaymentIntents for introduction request ${requestId}`,
    DUAL_PAYMENTS_SUCCESS: (initial: string, remaining: string) =>
      `Dual PaymentIntents created successfully: initial=${initial}, remaining=${remaining}`,
    FAILED_DUAL_PAYMENTS: (requestId: string, error: string) =>
      `Failed to create dual PaymentIntents for request ${requestId}: ${error}`,
    FETCHED_SLOTS: (count: number) =>
      `Fetched ${count} available slots from calendar API`,
    USING_MOCK_SLOTS: (requesterId: string) =>
      `No calendar integration found for requester ${requesterId}, using mock slots`,
    FILTERED_SLOT: (start: string, end: string) =>
      `Filtered out booked slot from scheduled_meetings: ${start} - ${end}`,
    MEETING_ALREADY_BOOKED: (requestId: string) =>
      `Meeting already booked for request ${requestId} - returning existing booking info`,
    CAPTURE_95_PAYMENT: (requestId: string) =>
      `Attempting to capture 95% payment for request ${requestId} before meeting booking`,
    CAPTURE_95_SUCCESS: (requestId: string, result: string) =>
      `95% payment captured successfully for request ${requestId}: ${result}`,
    CAPTURE_95_FAILED: (requestId: string, error: string) =>
      `Failed to capture 95% payment for request ${requestId}: ${error}`,
    CREATING_CALENDAR_EVENT: (requesterId: string) =>
      `Creating calendar event for requester ${requesterId}`,
    CALENDAR_EVENT_CREATED: (eventId: string) =>
      `Calendar event created successfully: ${eventId}`,
    SKIPPING_CALENDAR: (requesterId: string) =>
      `Requester ${requesterId} has not connected Google Calendar - skipping calendar event creation`,
    FAILED_CALENDAR: (error: string) =>
      `Failed to create calendar event: ${error}`,
    CONFIRMATION_EMAIL_REQUESTER: (email: string) =>
      `Meeting confirmation email sent to requester: ${email}`,
    FAILED_EMAIL_REQUESTER: (error: string) =>
      `Failed to send confirmation email to requester: ${error}`,
    CONFIRMATION_EMAIL_PROSPECT: (email: string) =>
      `Meeting confirmation email sent to prospect: ${email}`,
    FAILED_EMAIL_PROSPECT: (error: string) =>
      `Failed to send confirmation email to prospect: ${error}`,
    MEETING_BOOKED: (requestId: string, start: string, end: string) =>
      `Meeting booked for request ${requestId}: ${start} - ${end}`,
    ACKNOWLEDGING_COMPLETION: (userId: string, requestId: string) =>
      `User ${userId} acknowledging meeting completion for request ${requestId}`,
    MOVING_TO_PEER_FEEDBACK: (requestId: string) =>
      `Moving introduction request ${requestId} to peer_feedback stage`,
    QUEUEING_PAYOUT: (requestId: string) =>
      `Queueing trust-score-based payout for request ${requestId}`,
    PAYOUT_QUEUED: (requestId: string, result: string) =>
      `Payout queue result for request ${requestId}: ${result}`,
    FAILED_PAYOUT: (requestId: string, error: string) =>
      `Failed to queue payout for request ${requestId}: ${error}`,
    CONNECTOR_ACKNOWLEDGED: (requestId: string) =>
      `Connector acknowledged meeting completion for request ${requestId}`,
    ACKNOWLEDGED_BY: (role: string, requestId: string) =>
      `Meeting completion acknowledged by ${role} for request ${requestId}`,
    GETTING_FEEDBACK: (requestId: string, type: string) =>
      `Getting existing feedback for request ${requestId}, type: ${type}`,
    SUBMITTING_FEEDBACK: (type: string, requestId: string, userId: string) =>
      `Submitting ${type} for request ${requestId} by user ${userId}`,
    FEEDBACK_SUBMITTED: (requestId: string) =>
      `Feedback submitted successfully for request ${requestId}`,
    REQUEST_ARCHIVED: (requestId: string, role: string) =>
      `Request ${requestId} archived for ${role} after peer feedback submission`,
    QUEUEING_DEFERRED_PAYOUT: (requestId: string) =>
      `Connector submitted peer feedback for request ${requestId}, queueing deferred payout`,
    FAILED_DEFERRED_PAYOUT: (requestId: string, error: string) =>
      `Failed to queue feedback-triggered payout for request ${requestId}: ${error}`,
    ERROR_CHECKING_CALENDAR: "Error checking calendar integration:",
    ERROR_CHECKING_FEEDBACK: "Error checking pending feedback:",
    ERROR_FETCHING_AVAILABILITY: "Error fetching calendar availability:",
    MASKED_EMAIL_LOG: (
      contactId: number,
      masked: string | undefined,
      found: boolean
    ) =>
      `Contact ${contactId}: masked email=${masked}, real email=${found ? "decrypted" : "not found"}`,
    REQUEST_CREATED_AT: (id: string, date: Date | string) =>
      `Request ${id} createdAt: ${date}, type: ${typeof date}`,
    CALENDAR_ATTENDEES: (requester: string | undefined, prospect: string) =>
      `Calendar attendees: requester=${requester}, prospect=${prospect}`,
    MEEETING_LINK: (link: string) => `Meeting link: ${link}`,
    SCHEDULED_MEETING_CREATED:
      "Scheduled meeting created in database for Google Meet verification",
  },
};
