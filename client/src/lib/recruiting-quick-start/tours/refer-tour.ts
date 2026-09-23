import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import { jobMarketplaceHtml } from "../builders/job-marketplace";
import {
  marketplaceWithUploadModal,
  inboxWithConsentModal,
} from "../builders/refer-modals";
import {
  referCandidatesInboxHtml,
  referCandidatesPipelineHtml,
} from "../builders/refer-candidates";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const referTour: Tour = {
  id: "refer",
  meta: [
    {
      t: "Open the Job Marketplace",
      d: "Every open role is here, each showing the <b>referral payout</b> you earn if your candidate is hired. Click <b>Job Marketplace</b> in the sidebar.",
    },
    {
      t: "Refer a candidate",
      d: "Found a great fit? Click <b>Refer a Candidate</b> on the job card to upload their resume.",
    },
    {
      t: "Upload the resume",
      d: "Drag in a <b>PDF</b>, add the <b>candidate’s email</b>, confirm permission to share, then click <b>Upload Resume</b>.",
    },
    {
      t: "Review in Inbox",
      d: "Your upload appears under <b>Refer Candidates → Inbox</b> as an AI-matched opportunity. Review the match and click <b>Refer Candidate</b>.",
    },
    {
      t: "Send consent email",
      d: "Confirm to send a consent email so the candidate can review the job and accept or decline. Click <b>Send Consent</b>.",
    },
    {
      t: "Track progress",
      d: "Open <b>View Candidates</b> on the job to track your referral through each stage until hire. Click <b>Continue</b>.",
    },
    {
      t: "You earn on Hire 💸",
      d: "When your referral reaches <b>Hired</b>, the referral payout is released — track it under Transactions → Connector Earnings. Click <b>Done</b>.",
    },
  ],
  label: "Refer a Candidate & Upload a Resume",
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Earn by referring 💸</div><div class="m-sub">Know someone perfect for a job? Refer them and earn the referral payout when they’re hired.</div>' +
          '<div class="m-card"><b style="font-size:11px">Open roles are waiting</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open the <b>Job Marketplace</b> to refer a candidate.</div></div>',
        "marketplace",
        'Click "Job Marketplace"'
      ),
    () => shellFullWidth(jobMarketplaceHtml({ hotRefer: true })),
    () => shellFullWidth(marketplaceWithUploadModal()),
    () => shellFullWidth(referCandidatesInboxHtml()),
    () => shellFullWidth(inboxWithConsentModal(referCandidatesInboxHtml())),
    () => shellFullWidth(referCandidatesPipelineHtml()),
    () =>
      okScreen(
        "That’s how you earn! 💸",
        "When your referral reaches Hired, the referral payout is released — track it under Transactions → Connector Earnings (Pending → Processing → Paid)."
      ),
  ],
};
