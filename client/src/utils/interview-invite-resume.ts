// Persists the recruiter's intent to send/reschedule/resend an interview invite
// across the full-page calendar-OAuth redirect, so the interview dialog can be
// auto-reopened for the same candidate once they return to the pipeline.
const INTERVIEW_INVITE_RESUME_KEY = "prospectly_interview_invite_resume";

export interface InterviewInviteResume {
  jobId: string;
  candidateId: string;
}

export function setInterviewInviteResume(resume: InterviewInviteResume): void {
  if (!resume.jobId || !resume.candidateId) {
    return;
  }
  try {
    sessionStorage.setItem(INTERVIEW_INVITE_RESUME_KEY, JSON.stringify(resume));
  } catch {
    // Ignore storage errors (private browsing, quota, etc.)
  }
}

export function consumeInterviewInviteResume(): InterviewInviteResume | null {
  try {
    const raw = sessionStorage.getItem(INTERVIEW_INVITE_RESUME_KEY);
    sessionStorage.removeItem(INTERVIEW_INVITE_RESUME_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<InterviewInviteResume>;
    if (!parsed?.jobId || !parsed?.candidateId) {
      return null;
    }
    return { jobId: parsed.jobId, candidateId: parsed.candidateId };
  } catch {
    return null;
  }
}

export function clearInterviewInviteResume(): void {
  try {
    sessionStorage.removeItem(INTERVIEW_INVITE_RESUME_KEY);
  } catch {
    // Ignore storage errors
  }
}
