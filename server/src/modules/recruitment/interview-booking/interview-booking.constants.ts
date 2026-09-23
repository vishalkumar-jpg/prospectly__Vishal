export const INTERVIEW_BOOKING_MESSAGES = {
  ERROR: {
    INVALID_OR_EXPIRED_TOKEN:
      "This booking link is invalid or has expired. Please contact the recruiter for a new link.",
    ALREADY_BOOKED: "An interview has already been booked for this candidate.",
    NO_CALENDAR_CONNECTED:
      "The recruiter has not connected a calendar. Please contact them directly.",
    BOOKING_FAILED: "Failed to book the interview. Please try again.",
    PAYMENT_CAPTURE_FAILED:
      "Unable to process payment for this interview. Please contact the recruiter.",
    NO_TRANSACTION_FOUND:
      "No payment authorization found for this interview. Please contact the recruiter.",
    SLOT_NO_LONGER_AVAILABLE:
      "That time is no longer available. Please pick another slot.",
  },
  SUCCESS: {
    BOOKING_CONFIRMED: "Interview booked successfully",
  },
} as const;

export const INTERVIEW_BOOKING_DURATION = 30;
