import { Slug } from "modules/emails/emails.constants";
import {
  NOTIFICATION_CATEGORY_KEYS,
  type NotificationCategoryKey,
} from "./notification-preferences.constants";

/** Maps each outbound email template slug to a notification preference category. */
export const SLUG_TO_NOTIFICATION_CATEGORY: Record<
  string,
  NotificationCategoryKey
> = {
  [Slug.Authentication]: NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
  [Slug.Introduction]: NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
  [Slug.PasswordReset]: NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
  [Slug.PasswordForgot]: NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
  [Slug.Welcome]: NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
  [Slug.AccountVerification]: NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
  [Slug.InviteEmail]: NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
  [Slug.RecruitmentNewJobPost]: NOTIFICATION_CATEGORY_KEYS.JOB_OPPORTUNITIES,
  [Slug.RecruitmentRecruiterNewCandidate]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentCandidateShortlisted]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentConnectorShortlisted]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentConnectorInterviewInviteSent]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentConnectorInterviewScheduled]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentConnectorInterviewCompleted]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentCandidateHired]: NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentConnectorHired]: NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentCandidateRejected]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentConnectorRejected]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentCandidateInReviewStatus]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentConnectorInReviewStatus]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentCollaboratorAdded]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentJobClosedConnector]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentJobClosedCandidate]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentJobReopenedConnector]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentJobReopenedCandidate]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentInterviewInvite]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.RecruitmentInterviewBookingError]:
    NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.CandidateConsent]: NOTIFICATION_CATEGORY_KEYS.PIPELINE_UPDATES,
  [Slug.IntroductionRequest]: NOTIFICATION_CATEGORY_KEYS.INTRO_ACTIVITY,
  [Slug.IntroductionRequestAccepted]: NOTIFICATION_CATEGORY_KEYS.INTRO_ACTIVITY,
  [Slug.IntroductionSentRequester]: NOTIFICATION_CATEGORY_KEYS.INTRO_ACTIVITY,
  [Slug.IntroductionEmail]: NOTIFICATION_CATEGORY_KEYS.INTRO_ACTIVITY,
  [Slug.IntroductionFeedbackRequest]: NOTIFICATION_CATEGORY_KEYS.INTRO_ACTIVITY,
  [Slug.IntroductionRequestUnsuccessful]:
    NOTIFICATION_CATEGORY_KEYS.INTRO_ACTIVITY,
  [Slug.MarketplaceSharerRequestClaimed]:
    NOTIFICATION_CATEGORY_KEYS.INTRO_ACTIVITY,
  [Slug.IntroductionMeetingAckRequester]:
    NOTIFICATION_CATEGORY_KEYS.PROSPECT_PIPELINE_UPDATES,
  [Slug.MeetingScheduled]: NOTIFICATION_CATEGORY_KEYS.PROSPECT_PIPELINE_UPDATES,
  [Slug.MeetingConfirmation]:
    NOTIFICATION_CATEGORY_KEYS.PROSPECT_PIPELINE_UPDATES,
  [Slug.SubscriptionPurchase]: NOTIFICATION_CATEGORY_KEYS.SUBSCRIPTION,
  [Slug.SubscriptionUpgrade]: NOTIFICATION_CATEGORY_KEYS.SUBSCRIPTION,
  [Slug.SubscriptionDowngrade]: NOTIFICATION_CATEGORY_KEYS.SUBSCRIPTION,
  [Slug.SubscriptionCancellation]: NOTIFICATION_CATEGORY_KEYS.SUBSCRIPTION,
  [Slug.SubscriptionRenewal]: NOTIFICATION_CATEGORY_KEYS.SUBSCRIPTION,
  [Slug.PayoutStart]: NOTIFICATION_CATEGORY_KEYS.PAYOUTS,
  [Slug.PayoutComplete]: NOTIFICATION_CATEGORY_KEYS.PAYOUTS,
  [Slug.RecruitmentCandidatePayoutSetup]: NOTIFICATION_CATEGORY_KEYS.PAYOUTS,
  [Slug.RecruitmentConnectorPayoutSetup]: NOTIFICATION_CATEGORY_KEYS.PAYOUTS,
  [Slug.RecruitmentCandidatePayoutReleased]: NOTIFICATION_CATEGORY_KEYS.PAYOUTS,
  [Slug.RecruitmentConnectorPayoutReleased]: NOTIFICATION_CATEGORY_KEYS.PAYOUTS,
  [Slug.ContactImportReminder]: NOTIFICATION_CATEGORY_KEYS.PRODUCT_REMINDERS,
  [Slug.SystemFeedbackSubmitted]: NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
  [Slug.SystemFeedbackAcknowledgement]:
    NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
  [Slug.SystemFeedbackStatusChanged]:
    NOTIFICATION_CATEGORY_KEYS.ACCOUNT_SECURITY,
};

export function resolveCategoryKeyForSlug(
  slug?: string
): NotificationCategoryKey | null {
  if (!slug) return null;
  return SLUG_TO_NOTIFICATION_CATEGORY[slug] ?? null;
}
