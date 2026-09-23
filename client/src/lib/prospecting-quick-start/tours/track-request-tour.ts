import { shellWithNav, shellFullWidth } from "../builders/shell-full";
import {
  myProspectsPipelineEducation,
  myProspectsPipelineHtml,
  myProspectsPipelineWithContinue,
} from "../builders/my-prospects";
import {
  acknowledgeMeetingModalHtml,
  leaveFeedbackModalHtml,
  mpPipelineWithCenterModal,
  mpPipelineWithDrawer,
  mpPipelineWithFinanceModal,
  paymentDetailsModalHtml,
  requestDetailsDrawerHtml,
} from "../builders/my-prospects-modals";
import { okScreen } from "../builders/ok-screen";
import type { Tour } from "../types";

export const trackRequestTour: Tour = {
  id: "track-request",
  label: "Track Your Request",
  meta: [
    {
      t: "Open My Prospects",
      d: "Every introduction you requested lives under <b>My Prospects</b>. Click it in the sidebar to open your pipeline.",
    },
    {
      t: "Awaiting Connector",
      d: "After you request an intro, your card lands in <b>Awaiting Connector</b>. Prospectly emails your selected connectors — they accept from <b>Incoming Requests</b>. You do not drag the card; it moves when they act. Click <b>Continue</b>.",
    },
    {
      t: "Connector accepted",
      d: "When a connector accepts, Prospectly emails you and your card moves to <b>Awaiting Intro</b> automatically. The connector is now preparing the introduction email to your prospect. Click <b>Continue</b>.",
    },
    {
      t: "Intro email sent",
      d: "Your card is in <b>Intro Sent</b>. Click <b>Details</b> on your card to review the request, then <b>Finance</b> for payment status.",
    },
    {
      t: "Introduction Request Details",
      d: "The drawer shows people, meeting info, payment breakdown, and milestones. Click <b>Close</b> when done reviewing.",
    },
    {
      t: "Track payments",
      d: "Click <b>Finance</b> on your card to see payment status, timeline, and receipts.",
    },
    {
      t: "Payment Details",
      d: "Review your 5%/95% split, fee breakdown, payment timeline, and receipts — just like the real finance modal. Click <b>Close</b>.",
    },
    {
      t: "Meeting booked",
      d: "When your prospect picks a time from the booking link in the intro email, Prospectly confirms the meeting and your card moves to <b>Meeting Booked</b>. A <b>Join</b> button appears on your card. Click <b>Continue</b>.",
    },
    {
      t: "Confirm meeting completion",
      d: "After the meeting happens, <b>you</b> click <b>Confirm</b> on your card to acknowledge it was completed — this is the first step you take directly on the card.",
    },
    {
      t: "Acknowledge meeting",
      d: "Confirm the meeting happened. This moves your request to <b>Peer Feedback</b>. Click <b>Acknowledge Completion</b>.",
    },
    {
      t: "Leave peer feedback",
      d: "Rate your connector to complete the introduction. Click <b>Feedback</b> on your card.",
    },
    {
      t: "Submit feedback",
      d: "Your rating and comments auto-fill for the demo — click <b>Submit Feedback</b>.",
    },
    {
      t: "Journey complete ✓",
      d: "You've followed one request from start to finish. Click <b>Continue</b> to wrap up.",
    },
    {
      t: "You're all set ✓",
      d: "Cards move automatically as connectors and prospects act — you track progress, payments, and milestones from <b>My Prospects</b>. Click <b>Done</b>.",
    },
  ],
  screens: [
    () =>
      shellWithNav(
        "",
        "Dashboard",
        '<div class="m-h1">Track your requests 📊</div><div class="m-sub">See where every introduction stands — from connector acceptance through meeting completed.</div>' +
          '<div class="m-card"><b style="font-size:11px">Your pipeline board</b><div style="font-size:10px;color:#6B7280;margin-top:3px">Open <b>My Prospects</b> to view active requests and archive.</div></div>',
        "my-prospects",
        'Click "My Prospects"'
      ),
    () => shellFullWidth(myProspectsPipelineEducation("overview")),
    () => shellFullWidth(myProspectsPipelineEducation("awaiting_intro")),
    () =>
      shellFullWidth(
        myProspectsPipelineEducation("intro_sent", { showContinue: false })
      ),
    () =>
      shellFullWidth(
        mpPipelineWithDrawer("view_details", requestDetailsDrawerHtml())
      ),
    () => shellFullWidth(myProspectsPipelineHtml("view_finance")),
    () =>
      shellFullWidth(
        mpPipelineWithFinanceModal("view_finance", paymentDetailsModalHtml())
      ),
    () => shellFullWidth(myProspectsPipelineEducation("meeting_booked")),
    () => shellFullWidth(myProspectsPipelineHtml("confirm_meeting")),
    () =>
      shellFullWidth(
        mpPipelineWithCenterModal(
          "confirm_meeting",
          acknowledgeMeetingModalHtml()
        )
      ),
    () => shellFullWidth(myProspectsPipelineHtml("leave_feedback")),
    () =>
      shellFullWidth(
        mpPipelineWithCenterModal("leave_feedback", leaveFeedbackModalHtml())
      ),
    () => shellFullWidth(myProspectsPipelineWithContinue("journey_complete")),
    () =>
      okScreen(
        "My Prospects pipeline 🎯",
        "Track every open request as connectors accept, send intros, and meetings move through each stage."
      ),
  ],
};
