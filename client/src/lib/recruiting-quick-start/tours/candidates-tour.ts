import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import { myJobPostsPageHtml } from "../builders/my-job-posts";
import {
  pipelineWithModal,
  shortlistConfirmModalHtml,
  sendInterviewInviteModalHtml,
  rescheduleInterviewModalHtml,
  interviewOutcomeModalHtml,
} from "../builders/pipeline-modals";
import {
  candidateDetailModalHtml,
  moveToHiredModalHtml,
} from "../builders/pipeline-modals-extra";
import { recruiterPipelineHtml } from "../builders/recruiter-pipeline";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const candidatesTour: Tour = {
  id: "candidates",
  meta: [
    {
      t: "Open My Job Posts",
      d: "All your jobs live here. Click <b>My Job Posts</b> in the sidebar.",
    },
    {
      t: "View your pipeline",
      d: "Each card shows salary, per-candidate cost, and views. Click <b>View Candidates →</b> to open the pipeline board.",
    },
    {
      t: "Review the candidate",
      d: "In <b>In Review</b>, open the full profile. Click <b>View</b> on the candidate card.",
    },
    {
      t: "Candidate profile",
      d: "Explore <b>Overview</b>, <b>Experience</b>, <b>Skills</b>, or <b>Projects</b> if you like — then click <b>Shortlist</b> when ready.",
    },
    {
      t: "Confirm Shortlist",
      d: "Review the payment authorization, then click <b>Authorize &amp; Shortlist</b>.",
    },
    {
      t: "Schedule interview",
      d: "Your shortlisted candidate is ready — click <b>Schedule</b> to send an interview invite.",
    },
    {
      t: "Send Interview Invite",
      d: "<b>Start</b>, <b>End</b>, and <b>Timezone</b> auto-fill one by one — click <b>Send Interview Invite</b> when ready.",
    },
    {
      t: "Reschedule interview",
      d: "Need a new time? On an <b>Interview Scheduled</b> card, click <b>Reschedule</b> next to <b>View</b>.",
    },
    {
      t: "Reschedule Interview",
      d: "<b>Start</b>, <b>End</b>, and <b>Timezone</b> auto-fill one by one — click <b>Send New Booking Link</b> when ready.",
    },
    {
      t: "Mark interview outcome",
      d: "After the interview, click <b>Mark Outcome</b> on the scheduled candidate.",
    },
    {
      t: "Mark Interview Outcome",
      d: "We auto-select <b>Interview Completed</b> for the demo. Click <b>Confirm Outcome</b>.",
    },
    {
      t: "Move to Hired",
      d: "When you're ready to hire, click <b>Move to Hired</b> on the completed interview card.",
    },
    {
      t: "Confirm hire",
      d: "Hire date and connector classification fill in automatically. Click <b>Pay &amp; Move to Hired</b>.",
    },
    {
      t: "Hired! 🎉",
      d: "Your candidate is in <b>Hired</b> with <b>Release Connector Payout</b> and <b>Release Candidate Bonus</b>. Click <b>Continue</b>.",
    },
    {
      t: "All done ✓",
      d: "You've walked through the full pipeline. Click <b>Done</b> to finish.",
    },
  ],
  label: "Manage Your Candidates",
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Your job is live ✓</div><div class="m-sub">Now let’s see the candidates coming in.</div>' +
          '<div class="m-card"><b style="font-size:11px">Candidates arrived!</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>My Job Posts</b> to review them.</div></div>',
        "my-jobs",
        'Click "My Job Posts"'
      ),
    () => shellFullWidth(myJobPostsPageHtml({ hotViewCandidates: true })),
    () => shellFullWidth(recruiterPipelineHtml("view_candidate")),
    () =>
      shellFullWidth(
        pipelineWithModal("view_candidate", candidateDetailModalHtml())
      ),
    () =>
      shellFullWidth(
        pipelineWithModal("shortlist_candidate", shortlistConfirmModalHtml())
      ),
    () => shellFullWidth(recruiterPipelineHtml("shortlisted")),
    () =>
      shellFullWidth(
        pipelineWithModal("shortlisted", sendInterviewInviteModalHtml())
      ),
    () => shellFullWidth(recruiterPipelineHtml("interview_scheduled")),
    () =>
      shellFullWidth(
        pipelineWithModal("interview_scheduled", rescheduleInterviewModalHtml())
      ),
    () => shellFullWidth(recruiterPipelineHtml("mark_outcome")),
    () =>
      shellFullWidth(
        pipelineWithModal("mark_outcome", interviewOutcomeModalHtml())
      ),
    () => shellFullWidth(recruiterPipelineHtml("move_hired")),
    () =>
      shellFullWidth(pipelineWithModal("move_hired", moveToHiredModalHtml())),
    () => shellFullWidth(recruiterPipelineHtml("hired_done")),
    () =>
      okScreen(
        "Candidate hired! 🎉",
        "The referral payout was released to the connector automatically, and the success-fee bonus will be paid after the 90-day probation."
      ),
  ],
};
