import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import {
  browseOpportunitiesHtml,
  opportunitiesWithShareModal,
} from "../builders/browse-opportunities";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const shareOpportunityTour: Tour = {
  id: "opportunity",
  label: "Share an Opportunity",
  meta: [
    {
      t: "Open Opportunities",
      d: "Browse open introduction requests and share deals to earn. Click <b>Opportunities</b> in the sidebar.",
    },
    {
      t: "Share a deal",
      d: "Pick an introduction request and click <b>Share</b> to open your personal share panel.",
    },
    {
      t: "Copy your link",
      d: "Earn <b>50% of the referral payout</b> when someone you refer claims and completes the intro. Click <b>Copy</b> to grab your link.",
    },
    {
      t: "Shared 🔗",
      d: "Your unique link is ready to post anywhere. Track earnings under <b>Transactions</b>. Click <b>Done</b>.",
    },
  ],
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Share &amp; earn 🔗</div><div class="m-sub">Post a deal link anywhere and earn 50% of the referral payout when someone you refer completes the intro.</div>' +
          '<div class="m-card"><b style="font-size:11px">Earn on every share</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>Opportunities</b> to grab a shareable link.</div></div>',
        "opportunities",
        'Click "Opportunities"'
      ),
    () => shellFullWidth(browseOpportunitiesHtml({ hotShare: true })),
    () => shellFullWidth(opportunitiesWithShareModal()),
    () =>
      okScreen(
        "Shared! 🔗",
        "Your unique link is live. Post it on LinkedIn, X, Facebook, or anywhere else — when someone you refer completes the intro, your share is tracked under Transactions."
      ),
  ],
};
