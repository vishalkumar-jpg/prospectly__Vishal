/**
 * Candidate-facing timeline copy for My Applications (maps API stage + note).
 */

/** Reinstate rows use note: "Moved back to {Stage label} from Rejected". */
function getReinstateTimelineLabel(
  status: string,
  lowerNote: string
): string | null {
  if (
    !lowerNote.includes("moved back to") ||
    !lowerNote.includes("from rejected")
  ) {
    return null;
  }

  switch (status) {
    case "in_review":
      return "Your application was reopened after a previous decision and is under review again.";
    case "shortlisted":
      return "Your application was reopened after a previous decision and moved back to the shortlist.";
    case "interview_invite_sent":
      return "Your application was reopened. You may schedule your interview again — please check for a new invite.";
    case "interview_scheduled":
      return "Your application was reopened and your interview slot has been restored.";
    case "interview_completed":
      return "Your application was reopened at the interview stage for further review.";
    default:
      return "Your application was reopened after a previous decision and the hiring process continues.";
  }
}

export function getCandidateTimelineLabel(
  status: string,
  note: string
): string {
  const n = (note ?? "").trim();
  const lower = n.toLowerCase();

  if (
    lower.includes("application submitted") ||
    lower.includes("via consent")
  ) {
    return "You have successfully applied for this job.";
  }

  const reinstateLabel = getReinstateTimelineLabel(status, lower);
  if (reinstateLabel) {
    return reinstateLabel;
  }

  if (
    status === "processing" &&
    !lower.includes("application submitted") &&
    !lower.includes("via consent")
  ) {
    return "We are reviewing your application and checking how well your profile matches the job.";
  }

  if (lower.includes("not eligible for this job")) {
    return "Unfortunately, your profile was not selected for this role.";
  }

  if (lower.includes("eligible for this job")) {
    return "Good news! Your profile matches what we're looking for.";
  }

  if (status === "shortlisted" || lower.includes("shortlisted")) {
    return "You have been shortlisted for the next stage of the hiring process.";
  }

  if (
    lower.includes("interview invite resent") ||
    lower.includes("interview invite sent")
  ) {
    return "We've invited you to schedule an interview at your convenience.";
  }

  if (lower.includes("interview booked by candidate")) {
    return "Your interview has been successfully scheduled.";
  }

  if (lower.includes("interview rescheduled")) {
    return "Your interview was rescheduled.";
  }

  if (status === "interview_completed") {
    return "Your interview is complete. We'll get back to you soon.";
  }

  if (status === "rejected" || status === "jd_mismatched") {
    return "Thank you for your time. We will not be moving forward at this stage.";
  }

  return n || status;
}
