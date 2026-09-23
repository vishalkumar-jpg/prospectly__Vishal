import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import {
  incomingRequestsInboxHtml,
  incomingRequestsPipelineHtml,
  incomingRequestsWithDraftModal,
  incomingRequestsWithReviewModal,
} from "../builders/incoming-requests";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const fulfillRequestTour: Tour = {
  id: "fulfill-request",
  label: "Fulfill a Request",
  meta: [
    {
      t: "Open Incoming Requests",
      d: "Earn referral payouts by accepting requests and sending warm introductions. Click <b>Incoming Requests</b> in the sidebar.",
    },
    {
      t: "Review inbox requests",
      d: "Each card shows the requester, prospect, payout, and meeting details. Click <b>Accept</b> on a request you want to fulfill.",
    },
    {
      t: "Accept the request",
      d: "Review the meeting details, then click <b>Accept Request</b> to move to drafting the introduction email.",
    },
    {
      t: "Send the introduction",
      d: "Review the pre-filled email, then click <b>Send Introduction</b> to deliver the warm intro to your contact.",
    },
    {
      t: "Track in Pipeline",
      d: "Your introduction moves through connector pipeline stages — intro sent through peer feedback. Click <b>Continue</b>.",
    },
    {
      t: "Introduction sent ✓",
      d: "You've walked through fulfilling a request end-to-end. Click <b>Done</b> to finish.",
    },
  ],
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Fulfill incoming requests 🤝</div><div class="m-sub">Accept introduction requests from your network and earn referral payouts when meetings happen.</div>' +
          '<div class="m-card"><b style="font-size:11px">New requests waiting</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>Incoming Requests</b> to review your inbox.</div></div>',
        "incoming-requests",
        'Click "Incoming Requests"'
      ),
    () => shellFullWidth(incomingRequestsInboxHtml()),
    () => shellFullWidth(incomingRequestsWithReviewModal()),
    () => shellFullWidth(incomingRequestsWithDraftModal()),
    () => shellFullWidth(incomingRequestsPipelineHtml()),
    () =>
      okScreen(
        "Introduction fulfilled! 🤝",
        "Accept requests, send warm intros, and track each deal through your connector pipeline until payout."
      ),
  ],
};
