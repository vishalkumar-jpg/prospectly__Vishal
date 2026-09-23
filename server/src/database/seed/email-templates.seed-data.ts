export type EmailTemplateSeedEntry = {
  name: string;
  subject: string;
  slug: string;
  file: string;
  category: string;
  description: string;
  status: "active" | "inactive";
};

export const EMAIL_TEMPLATE_SEED_DATA: EmailTemplateSeedEntry[] = [
  {
    name: "User Invite",
    subject: "{{senderName}} invited you to join Prospectly",
    slug: "invite_email",
    file: "invite-email.html",
    category: "onboarding",
    description: "Invitation email to join the platform",
    status: "active",
  },
  {
    name: "Meeting Confirmation",
    subject: "Meeting Confirmed: {{otherPartyName}} - {{meetingDate}}",
    slug: "meeting_confirmation",
    file: "meeting-confirmation.html",
    category: "meetings",
    description: "Detailed meeting confirmation with calendar details",
    status: "active",
  },
  {
    name: "Introduction Email",
    subject: "Introduction: {{requesterName}} <> {{targetName}}",
    slug: "introduction_email",
    file: "introduction-email.html",
    category: "introductions",
    description: "The actual introduction email introducing two parties",
    status: "active",
  },
  {
    name: "Welcome Email",
    subject: "Welcome to Prospectly",
    slug: "admin_welcome",
    file: "admin-welcome.html",
    category: "onboarding",
    description: "Sent to new users after successful registration",
    status: "active",
  },
  {
    name: "Subscription Purchase",
    subject: "Welcome to Prospectly! Your subscription is active",
    slug: "subscription_purchase",
    file: "subscription-purchase.html",
    category: "subscriptions",
    description: "Sent when a user purchases a new subscription.",
    status: "active",
  },
  {
    name: "Subscription Renewal",
    subject: "Subscription Renewed! Thank you for staying with us",
    slug: "subscription_renewal",
    file: "subscription-renewal.html",
    category: "subscriptions",
    description: "Sent when a subscription automatically renews.",
    status: "active",
  },
  {
    name: "Subscription Upgrade",
    subject: "Subscription Upgraded! Unlock more potential",
    slug: "subscription_upgrade",
    file: "subscription-upgrade.html",
    category: "subscriptions",
    description: "Sent when a user upgrades their existing subscription.",
    status: "active",
  },
  {
    name: "Subscription Downgrade",
    subject: "Subscription Downgrade! Unlock more potential",
    slug: "subscription_downgrade",
    file: "subscription-downgrade.html",
    category: "subscriptions",
    description: "Sent when a user downgrades their existing subscription.",
    status: "active",
  },
  {
    name: "Payout Complete",
    subject: "Payout Sent Successfully",
    slug: "payout_complete",
    file: "payout-complete.html",
    category: "billing",
    description: "Notification sent when payout is successfully completed",
    status: "active",
  },
  {
    name: "Payout Start",
    subject: "Your Payout is Being Processed",
    slug: "payout_start",
    file: "payout-start.html",
    category: "billing",
    description: "Notification sent when payout processing begins",
    status: "active",
  },
  {
    name: "Subscription Cancellation",
    subject: "Subscription Cancelled",
    slug: "subscription_cancellation",
    file: "subscription-cancellation.html",
    category: "subscriptions",
    description: "Sent when a subscription is cancelled.",
    status: "active",
  },
  {
    name: "Candidate Consent",
    subject:
      "{{connectorName}} thinks you'd be great for {{jobTitle}} at {{companyName}}",
    slug: "candidate_consent",
    file: "candidate-consent.html",
    category: "recruitment",
    description:
      "Sent to a candidate when a connector approves them for a job referral, asking for consent.",
    status: "active",
  },
  {
    name: "Recruitment Interview Invite",
    subject: "Interview Invitation: {{jobTitle}} at {{companyName}}",
    slug: "recruitment_interview_invite",
    file: "recruitment-interview-invite.html",
    category: "recruitment",
    description:
      "Sent to a candidate when a recruiter sends an interview invite with a booking link.",
    status: "active",
  },
  {
    name: "Recruitment Interview Booking Error",
    subject: "Interview booking issue: {{candidateName}} — {{jobTitle}}",
    slug: "recruitment_interview_booking_error",
    file: "recruitment-interview-booking-error.html",
    category: "recruitment",
    description:
      "Sent to the job owner (To) with active collaborators CC'd when a candidate encounters an error while booking an interview.",
    status: "active",
  },
  {
    name: "Recruitment New Job Post",
    subject: "New opportunity: {{jobTitle}} at {{companyName}}",
    slug: "recruitment_new_job_post",
    file: "recruitment-new-job-post.html",
    category: "recruitment",
    description:
      "Sent in bulk to users of selected Organization when a recruiter posts a new job and notifies them.",
    status: "active",
  },
  {
    name: "Recruitment Collaborator Added",
    subject: "You're now a collaborator on {{jobTitle}}",
    slug: "recruitment_collaborator_added",
    file: "recruitment-collaborator-added.html",
    category: "recruitment",
    description:
      "Sent to a co-worker when a job owner adds them as a collaborator to help manage candidates on a job post.",
    status: "active",
  },
  {
    name: "Recruitment Recruiter New Candidate",
    subject: "New candidate in review: {{jobTitle}} at {{companyName}}",
    slug: "recruitment_recruiter_new_candidate",
    file: "recruitment-recruiter-new-candidate.html",
    category: "recruitment",
    description:
      "Sent to the job owner (To) with active collaborators CC'd when a candidate enters the in_review stage after evaluation.",
    status: "active",
  },
  {
    name: "Recruitment Candidate In Review Status",
    subject: "Update on your application for {{jobTitle}}",
    slug: "recruitment_candidate_in_review_status",
    file: "recruitment-candidate-in-review-status.html",
    category: "recruitment",
    description:
      "One-time update sent to a candidate after sitting in In Review past the configured reminder threshold.",
    status: "active",
  },
  {
    name: "Recruitment Connector In Review Status",
    subject: "Your referral is still in review — {{jobTitle}}",
    slug: "recruitment_connector_in_review_status",
    file: "recruitment-connector-in-review-status.html",
    category: "recruitment",
    description:
      "One-time update sent to a connector when their referred candidate remains in In Review past the configured threshold.",
    status: "active",
  },
  {
    name: "Recruitment Candidate Shortlisted",
    subject: "You've been shortlisted for {{jobTitle}} at {{companyName}}",
    slug: "recruitment_candidate_shortlisted",
    file: "recruitment-candidate-shortlisted.html",
    category: "recruitment",
    description:
      "Sent to a candidate when a recruiter shortlists them for a role.",
    status: "active",
  },
  {
    name: "Recruitment Connector Shortlisted",
    subject: "Your referral was shortlisted — {{jobTitle}}",
    slug: "recruitment_connector_shortlisted",
    file: "recruitment-connector-shortlisted.html",
    category: "recruitment",
    description:
      "Sent to a connector when their referred candidate is shortlisted.",
    status: "active",
  },
  {
    name: "Recruitment Connector Interview Invite Sent",
    subject: "Your referral received an interview invite — {{jobTitle}}",
    slug: "recruitment_connector_interview_invite_sent",
    file: "recruitment-connector-interview-invite-sent.html",
    category: "recruitment",
    description:
      "Sent to a connector when their referred candidate receives an interview invite.",
    status: "active",
  },
  {
    name: "Recruitment Connector Interview Scheduled",
    subject: "Your referral scheduled an interview — {{jobTitle}}",
    slug: "recruitment_connector_interview_scheduled",
    file: "recruitment-connector-interview-scheduled.html",
    category: "recruitment",
    description:
      "Sent to a connector when their referred candidate books an interview.",
    status: "active",
  },
  {
    name: "Recruitment Connector Interview Completed",
    subject: "Your referral completed the interview — {{jobTitle}}",
    slug: "recruitment_connector_interview_completed",
    file: "recruitment-connector-interview-completed.html",
    category: "recruitment",
    description:
      "Sent to a connector when their referred candidate completes the interview.",
    status: "active",
  },
  {
    name: "Recruitment Candidate Hired",
    subject: "Congratulations — you've been hired for {{jobTitle}}",
    slug: "recruitment_candidate_hired",
    file: "recruitment-candidate-hired.html",
    category: "recruitment",
    description: "Sent to a candidate when they are moved to the hired stage.",
    status: "active",
  },
  {
    name: "Recruitment Connector Hired",
    subject: "Your referral was hired — {{jobTitle}}",
    slug: "recruitment_connector_hired",
    file: "recruitment-connector-hired.html",
    category: "recruitment",
    description: "Sent to a connector when their referred candidate is hired.",
    status: "active",
  },
  {
    name: "Recruitment Candidate Rejected",
    subject: "Update on your application for {{jobTitle}}",
    slug: "recruitment_candidate_rejected",
    file: "recruitment-candidate-rejected.html",
    category: "recruitment",
    description:
      "Sent to a candidate when a recruiter rejects them from a role.",
    status: "active",
  },
  {
    name: "Recruitment Connector Rejected",
    subject: "Update on {{candidateName}} — {{jobTitle}}",
    slug: "recruitment_connector_rejected",
    file: "recruitment-connector-rejected.html",
    category: "recruitment",
    description: "Sent to connectors when a candidate is rejected.",
    status: "active",
  },
  {
    name: "Recruitment Candidate Payout Setup",
    subject: "Connect your bank to receive your success bonus",
    slug: "recruitment_candidate_payout_setup",
    file: "recruitment-candidate-payout-setup.html",
    category: "recruitment",
    description:
      "Sent to a candidate when a released payout is deferred because Stripe Connect is not set up.",
    status: "active",
  },
  {
    name: "Recruitment Connector Payout Setup",
    subject: "Connect your bank to receive your referral payout",
    slug: "recruitment_connector_payout_setup",
    file: "recruitment-connector-payout-setup.html",
    category: "recruitment",
    description:
      "Sent to a connector when a released payout is deferred because Stripe Connect is not set up.",
    status: "active",
  },
  {
    name: "Recruitment Candidate Payout Released",
    subject: "Your {{payoutAmount}} success bonus has been released",
    slug: "recruitment_candidate_payout_released",
    file: "recruitment-candidate-payout-released.html",
    category: "recruitment",
    description:
      "Sent to a candidate when HR releases their success bonus payout from the hired stage.",
    status: "active",
  },
  {
    name: "Recruitment Connector Payout Released",
    subject: "Your {{payoutAmount}} referral payout has been released",
    slug: "recruitment_connector_payout_released",
    file: "recruitment-connector-payout-released.html",
    category: "recruitment",
    description:
      "Sent to a connector when HR releases their referral payout from the hired stage.",
    status: "active",
  },
  {
    name: "Recruitment Job Closed (Connector)",
    subject: "Job post closed — {{jobTitle}}",
    slug: "recruitment_job_closed_connector",
    file: "recruitment-job-closed-connector.html",
    category: "recruitment",
    description:
      "Sent to connectors linked to a job when the recruiter closes the job post.",
    status: "active",
  },
  {
    name: "Recruitment Job Closed (Candidate)",
    subject: "Update: {{jobTitle}} position has been closed",
    slug: "recruitment_job_closed_candidate",
    file: "recruitment-job-closed-candidate.html",
    category: "recruitment",
    description:
      "Sent to candidates in selected pipeline stages when a recruiter closes a job post.",
    status: "active",
  },
  {
    name: "Recruitment Job Reopened (Connector)",
    subject: "Job post reopened — {{jobTitle}}",
    slug: "recruitment_job_reopened_connector",
    file: "recruitment-job-reopened-connector.html",
    category: "recruitment",
    description:
      "Sent to connectors linked to a job when the recruiter reopens a previously closed job post.",
    status: "active",
  },
  {
    name: "Recruitment Job Reopened (Candidate)",
    subject: "Update: {{jobTitle}} position is open again",
    slug: "recruitment_job_reopened_candidate",
    file: "recruitment-job-reopened-candidate.html",
    category: "recruitment",
    description:
      "Sent to candidates in selected pipeline stages when a recruiter reopens a job post.",
    status: "active",
  },
  {
    name: "Contact Import Reminder",
    subject: "Complete Your Setup by Importing Your Contacts",
    slug: "contact_import_reminder",
    file: "contact-import-reminder.html",
    category: "notifications",
    description:
      "Sent to users who have not imported their contacts after signup. Used for automated reminder emails based on configured reminder days.",
    status: "active",
  },
  {
    name: "Introduction Request (Connector)",
    subject: "New introduction request from {{requesterName}}",
    slug: "introduction_request",
    file: "introduction-request.html",
    category: "introductions",
    description:
      "Notifies potential connectors when a requester raises a new introduction request.",
    status: "active",
  },
  {
    name: "Introduction Request Accepted",
    subject: "{{connectorName}} accepted your introduction request",
    slug: "introduction_request_accepted",
    file: "introduction-request-accepted.html",
    category: "introductions",
    description:
      "Notifies the requester when a connector accepts their request.",
    status: "active",
  },
  {
    name: "Introduction Request Unsuccessful",
    subject: "Your introduction was marked unsuccessful",
    slug: "introduction_request_unsuccessful",
    file: "introduction-request-unsuccessful.html",
    category: "introductions",
    description:
      "Notifies the requester when a connector marks their introduction request as unsuccessful.",
    status: "active",
  },
  {
    name: "Introduction Sent (Requester)",
    subject: "Introduction email sent to {{prospectName}}",
    slug: "introduction_sent_requester",
    file: "introduction-sent-requester.html",
    category: "introductions",
    description:
      "Notifies the requester when the connector sends the warm intro email to the prospect.",
    status: "active",
  },
  {
    name: "Introduction Meeting Ack (Requester)",
    subject: "Please confirm your meeting with {{prospectName}}",
    slug: "introduction_meeting_ack_requester",
    file: "introduction-meeting-ack-requester.html",
    category: "introductions",
    description:
      "Asks the requester to acknowledge that their introduction meeting took place.",
    status: "active",
  },
  {
    name: "Introduction Feedback Request",
    subject: "Share feedback on your meeting with {{otherPartyName}}",
    slug: "introduction_feedback_request",
    file: "introduction-feedback-request.html",
    category: "introductions",
    description:
      "Asks the connector to submit peer feedback after the requester acknowledges the meeting.",
    status: "active",
  },
  {
    name: "Marketplace Sharer Request Claimed",
    subject:
      "Someone claimed your shared introduction — you earn {{sharerShare}}",
    slug: "marketplace_sharer_request_claimed",
    file: "marketplace-sharer-request-claimed.html",
    category: "introductions",
    description:
      "Notifies the deal sharer when someone claims their shared marketplace introduction opportunity.",
    status: "active",
  },
  {
    name: "System Feedback Submitted",
    subject: "New feedback to review: {{feedbackTitle}}",
    slug: "system_feedback_submitted",
    file: "system-feedback-submitted.html",
    category: "support",
    description:
      "Notifies the development team and stakeholders when a user submits system feedback.",
    status: "active",
  },
  {
    name: "System Feedback Acknowledgement",
    subject: "We've received your feedback",
    slug: "system_feedback_acknowledgement",
    file: "system-feedback-acknowledgement.html",
    category: "support",
    description:
      "Short acknowledgement sent to the user after they submit system feedback (no submission details repeated).",
    status: "active",
  },
  {
    name: "System Feedback Status Changed",
    subject: "Your feedback status updated to {{statusLabel}}",
    slug: "system_feedback_status_changed",
    file: "system-feedback-status-changed.html",
    category: "support",
    description:
      "Notifies the submitting user when admin updates system feedback status.",
    status: "active",
  },
];
