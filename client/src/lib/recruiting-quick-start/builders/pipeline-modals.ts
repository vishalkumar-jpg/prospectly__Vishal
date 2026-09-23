import { IC } from "../icons";
import { PIPE_DEMO } from "./pipeline-demo";
import {
  recruiterPipelineHtml,
  type PipelineScene,
} from "./recruiter-pipeline";

function modalShell(
  body: string,
  foot: string,
  opts?: { wide?: boolean; invite?: boolean }
): string {
  let cls = "m-pm-dialog";
  if (opts?.invite) cls += " m-pm-dialog-invite";
  else if (opts?.wide) cls += " m-pm-dialog-wide";
  return '<div class="' + cls + '">' + body + foot + "</div>";
}

function pmSelectField(
  label: string,
  id: string,
  value: string,
  filled: boolean,
  chevron = IC.chevDown
): string {
  return (
    '<div class="m-pm-time-field">' +
    '<label class="m-pm-label">' +
    label +
    "</label>" +
    '<div class="m-pm-select' +
    (filled ? " filled" : "") +
    '" id="' +
    id +
    '">' +
    "<span>" +
    value +
    "</span>" +
    chevron +
    "</div></div>"
  );
}

function modalHero(
  icon: string,
  title: string,
  subtitle: string,
  indentSub = false
): string {
  return (
    '<div class="m-pm-hero">' +
    '<button type="button" class="m-pm-x" aria-label="Close">' +
    IC.x +
    "</button>" +
    '<div class="m-pm-hero-row">' +
    '<div class="m-pm-hero-ic">' +
    icon +
    "</div>" +
    "<div><h4>" +
    title +
    "</h4>" +
    '<p class="' +
    (indentSub ? "m-pm-hero-sub-indent" : "") +
    '">' +
    subtitle +
    "</p></div></div></div>"
  );
}

function modalFoot(
  confirmLabel: string,
  confirmId: string,
  opts?: { hot?: boolean; withIcon?: string; callout?: string }
): string {
  const confirmCls = "m-pm-confirm" + (opts?.hot ? " qsd-hot" : "");
  const attrs = opts?.hot
    ? ' data-callout="' +
      (opts.callout ?? "Click to confirm") +
      '" data-co-side="top" id="' +
      confirmId +
      '"'
    : ' id="' + confirmId + '"';

  return (
    '<div class="m-pm-foot">' +
    '<div class="m-pm-foot-actions">' +
    '<button type="button" class="m-pm-cancel">Cancel</button>' +
    '<button type="button" class="' +
    confirmCls +
    '"' +
    attrs +
    ">" +
    (opts?.withIcon ?? "") +
    "<span>" +
    confirmLabel +
    "</span></button></div></div>"
  );
}

export function pipelineWithModal(
  scene: PipelineScene,
  modalHtml: string
): string {
  return (
    '<div class="m-pm-scene">' +
    '<div class="m-pm-backdrop">' +
    recruiterPipelineHtml(scene, { backdrop: true }) +
    "</div>" +
    '<div class="m-pm-overlay">' +
    modalHtml +
    "</div></div>"
  );
}

export function shortlistConfirmModalHtml(): string {
  const body =
    modalHero(
      IC.creditCard,
      "Confirm Shortlist",
      "Shortlisting this candidate will authorize a payment on your card.",
      true
    ) +
    '<div class="m-pm-body m-pm-body-split">' +
    '<div class="m-pm-col">' +
    '<p class="m-pm-section-label">' +
    IC.dollar +
    " Cost Breakdown</p>" +
    '<div class="m-pm-cost-rows">' +
    '<div class="m-pm-cost-row"><span>Interview Cost</span><b>$206.35</b></div>' +
    '<div class="m-pm-cost-row"><span>Stripe Processing Fee <em>(2.9% + $0.30)</em></span><b>$6.28</b></div>' +
    '<div class="m-pm-cost-row"><span>Application Fee</span><b>$10.00</b></div></div>' +
    '<div class="m-pm-cost-total"><span>Total Authorization</span><b>$222.63</b></div>' +
    '<div class="m-pm-warn-box">' +
    IC.alertTriangle +
    "<div><b>Payment Authorization</b><p>Reserved on your card now, captured only when the interview is scheduled. The hold expires after 30 days if unused.</p></div></div></div>" +
    '<div class="m-pm-col m-pm-col-muted">' +
    '<p class="m-pm-section-label">' +
    IC.fileText +
    " Review Details</p>" +
    '<div class="m-pm-review-row"><span>Job</span><b>' +
    PIPE_DEMO.jobPostTitle +
    "</b></div>" +
    '<div class="m-pm-review-row"><span>Candidate</span><b>' +
    PIPE_DEMO.anonLabel +
    "</b></div>" +
    '<div class="m-pm-review-row"><span>Payment Method</span>' +
    '<div class="m-pm-pay-method"><span class="m-pm-card-brand">Visa</span><b>Ending in 4242</b></div></div>' +
    '<div class="m-pm-shield-box">' +
    IC.shield +
    "<p>Candidate details remain anonymized after shortlisting. Full personal details are revealed only after the interview is scheduled and payment is captured. <b>Powered by Stripe.</b></p></div></div></div>";

  return modalShell(
    body,
    modalFoot("Authorize &amp; Shortlist", "pipeShortlistConfirm", {
      hot: true,
      withIcon: IC.creditCard,
      callout: "Authorize & Shortlist",
    }),
    { wide: true }
  );
}

export function sendInterviewInviteModalHtml(): string {
  return interviewInviteModalHtml({
    title: "Send Interview Invite",
    subtitle:
      "Send an interview booking link to <b>" +
      PIPE_DEMO.anonLabel +
      "</b> for the <b>" +
      PIPE_DEMO.jobPostTitle +
      "</b> position.",
    stepsTitle: "What happens when you send this invite:",
    lastStepHtml:
      "Meeting is created on your calendar and you'll be <b>notified by email</b>",
    confirmLabel: "Send Interview Invite",
    confirmId: "pipeScheduleConfirm",
    confirmCallout: "Send Interview Invite",
    startId: "pipeInviteStart",
    endId: "pipeInviteEnd",
    tzId: "pipeInviteTz",
    availFilledId: "pipeInviteAvailFilled",
  });
}

export function rescheduleInterviewModalHtml(): string {
  return interviewInviteModalHtml({
    title: "Reschedule Interview",
    subtitle:
      "Send a new booking link to <b>" +
      PIPE_DEMO.anonLabel +
      "</b> to reschedule their interview.",
    stepsTitle: "What happens when you reschedule:",
    lastStepHtml:
      "A new meeting is created on your calendar once they <b>book</b>",
    confirmLabel: "Send New Booking Link",
    confirmId: "pipeRescheduleConfirm",
    confirmCallout: "Send New Booking Link",
    startId: "pipeRescheduleStart",
    endId: "pipeRescheduleEnd",
    tzId: "pipeRescheduleTz",
    availFilledId: "pipeRescheduleAvailFilled",
  });
}

function interviewInviteModalHtml(opts: {
  title: string;
  subtitle: string;
  stepsTitle: string;
  lastStepHtml: string;
  confirmLabel: string;
  confirmId: string;
  confirmCallout: string;
  startId: string;
  endId: string;
  tzId: string;
  availFilledId: string;
}): string {
  const body =
    modalHero(IC.calendar, opts.title, opts.subtitle) +
    '<div class="m-pm-body m-pm-body-invite">' +
    '<div class="m-pm-invite-grid">' +
    '<div class="m-pm-invite-left">' +
    '<div class="m-pm-avail-card">' +
    '<div class="m-pm-avail-head">' +
    '<span class="m-pm-avail-ic">' +
    IC.clock +
    "</span>" +
    "<div><b>Set your interview availability</b>" +
    "<p>The daily hours you're free to interview. Candidates can only pick a 30-minute slot within this window, Mon–Fri.</p></div></div>" +
    '<div id="' +
    opts.availFilledId +
    '">' +
    '<div class="m-pm-time-row">' +
    pmSelectField("Start", opts.startId, "Select time…", false) +
    pmSelectField("End", opts.endId, "Select time…", false) +
    "</div>" +
    pmSelectField(
      "Timezone",
      opts.tzId,
      "Select timezone…",
      false,
      IC.chevUpDown
    ) +
    '<p class="m-pm-avail-foot">Times you\'re busy on your connected calendar are removed automatically — block lunch/breaks on your calendar to hide them.</p>' +
    "</div>" +
    "</div>" +
    "</div>" +
    '<div class="m-pm-invite-right">' +
    '<div class="m-pm-steps-card">' +
    '<p class="m-pm-steps-title">' +
    opts.stepsTitle +
    "</p>" +
    '<div class="m-pm-steps">' +
    '<div class="m-pm-step"><span class="m-pm-step-ic m-pm-ic-sky">' +
    IC.mail +
    "</span><p>Candidate receives an email with a <b>unique booking link</b></p></div>" +
    '<div class="m-pm-step"><span class="m-pm-step-ic m-pm-ic-pu">' +
    IC.calendar +
    "</span><p>They select a time from your <b>available calendar slots</b> (Google/Microsoft)</p></div>" +
    '<div class="m-pm-step"><span class="m-pm-step-ic m-pm-ic-gn">' +
    IC.checkCircle +
    "</span><p>" +
    opts.lastStepHtml +
    "</p></div>" +
    "</div></div></div></div></div>";

  return modalShell(
    body,
    modalFoot(opts.confirmLabel, opts.confirmId, {
      withIcon: IC.send,
      callout: opts.confirmCallout,
    }),
    { invite: true }
  );
}

export function interviewOutcomeModalHtml(opts?: {
  outcomeSelected?: boolean;
}): string {
  const selected = opts?.outcomeSelected ?? false;
  const selectVal = selected ? "Interview Completed" : "Select outcome…";

  const body =
    modalHero(
      IC.clipboard,
      "Mark Interview Outcome",
      "Select the interview outcome for <b>" + PIPE_DEMO.anonLabel + "</b>."
    ) +
    '<div class="m-pm-body">' +
    '<label class="m-pm-label">Outcome <span class="m-pm-req">*</span></label>' +
    '<div class="m-pm-select' +
    (selected ? " filled" : "") +
    '" id="outcomeSelectBox">' +
    "<span>" +
    selectVal +
    "</span>" +
    IC.chevDown +
    "</div></div>";

  return modalShell(
    body,
    modalFoot("Confirm Outcome", "pipeOutcomeConfirm", {
      hot: true,
      callout: "Confirm Outcome",
    })
  );
}
