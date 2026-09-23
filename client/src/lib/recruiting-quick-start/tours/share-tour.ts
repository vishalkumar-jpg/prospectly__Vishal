import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import { jobMarketplaceHtml } from "../builders/job-marketplace";
import { marketplaceWithShareModal } from "../builders/share-modals";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const shareTour: Tour = {
  id: "share",
  meta: [
    {
      t: "Open the Job Marketplace",
      d: "Sharing starts from any job in the <b>Job Marketplace</b>. Click <b>Job Marketplace</b> in the sidebar.",
    },
    {
      t: "Share a job",
      d: "Pick a role and click <b>Share Job</b> to open your personal share panel.",
    },
    {
      t: "Copy your link",
      d: "Your link earns the <b>full referral payout</b> for a direct apply, or a <b>50/50 split</b> if another connector claims. Click <b>Copy</b> to grab your link.",
    },
    {
      t: "Shared 🔗",
      d: "Your unique link is ready to post anywhere. When someone you referred is hired, the payout is yours — tracked in Connector Earnings. Click <b>Done</b>.",
    },
  ],
  label: "Share a Job on Social Media",
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Share &amp; earn 🔗</div><div class="m-sub">Post a job link anywhere and earn the referral payout when your candidate is hired.</div>' +
          '<div class="m-card"><b style="font-size:11px">Earn on every share</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open the <b>Job Marketplace</b> to grab a shareable link.</div></div>',
        "marketplace",
        'Click "Job Marketplace"'
      ),
    () => shellFullWidth(jobMarketplaceHtml({ hotShare: true })),
    () => shellFullWidth(marketplaceWithShareModal()),
    () =>
      okScreen(
        "Shared! 🔗",
        "Your unique link is live. Post it on LinkedIn, X, Facebook, or anywhere else — when someone you referred is hired, the payout is yours under Transactions → Connector Earnings."
      ),
  ],
};
