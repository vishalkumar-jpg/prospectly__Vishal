import { IntroductionStatus } from "modules/introductions/introductions.constants";

export type PendingRequesterFeedbackRow = {
  status?: string;
  meetingCompletedByRequester?: boolean;
  requesterFeedbackCompleted?: boolean;
  requesterArchived?: boolean;
};

/**
 * True when the requester must submit peer feedback before creating new intros.
 * Archived / withdrawn requests are excluded (aligned with requester pipeline).
 */
export function isPendingRequesterFeedback(
  req: PendingRequesterFeedbackRow
): boolean {
  if (req.requesterArchived) {
    return false;
  }
  if (req.status === IntroductionStatus.ARCHIVED) {
    return false;
  }

  const isMeetingCompleted =
    req.status === IntroductionStatus.MEETING_COMPLETED ||
    req.status === IntroductionStatus.COMPLETED;
  const hasMeetingCompletedByRequester =
    req.meetingCompletedByRequester === true;
  const feedbackNotCompleted = req.requesterFeedbackCompleted === false;

  return (
    (isMeetingCompleted || hasMeetingCompletedByRequester) &&
    feedbackNotCompleted
  );
}
