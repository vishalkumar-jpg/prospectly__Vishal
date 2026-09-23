import { IC } from "../icons";
import {
  MP_DETAILS_DEMO,
  MP_FEEDBACK_DEMO,
  MP_TOUR_FEES,
  type MpPipelineScene,
} from "./my-prospects-demo";
import { myProspectsPipelineHtml } from "./my-prospects";

function statusPill(label: string, tone: "ok" | "warn" | "pending"): string {
  return '<span class="m-mp-pill m-mp-pill-' + tone + '">' + label + "</span>";
}

function financeHero(subtitle: string): string {
  return brandHeroHtml({
    icon: IC.creditCard,
    title: "Payment Details",
    subtitle,
    closeId: "mpFinanceCloseBtn",
    closeCallout: "Click Close",
    closeSide: "left",
    heroClass: "m-mp-fin-hero",
    closeClass: "m-mp-fin-x",
  });
}

function brandHeroHtml(opts: {
  icon: string;
  title: string;
  subtitle: string;
  closeId?: string;
  closeCallout?: string;
  closeSide?: string;
  heroClass: string;
  closeClass: string;
}): string {
  const closeAttrs =
    opts.closeId && opts.closeCallout
      ? ' id="' +
        opts.closeId +
        '" class="' +
        opts.closeClass +
        ' qsd-hot" data-callout="' +
        opts.closeCallout +
        '" data-co-side="' +
        (opts.closeSide ?? "left") +
        '" data-co-theme="light" aria-label="Close"'
      : ' class="' + opts.closeClass + '" aria-label="Close"';

  return (
    '<div class="' +
    opts.heroClass +
    ' m-mp-brand-hero">' +
    '<div class="m-mp-brand-hero-overlay" aria-hidden></div>' +
    '<button type="button"' +
    closeAttrs +
    ">" +
    IC.x +
    "</button>" +
    '<div class="m-mp-brand-hero-row">' +
    '<div class="m-mp-brand-hero-ic">' +
    opts.icon +
    "</div>" +
    "<div><h4>" +
    opts.title +
    "</h4><p>" +
    opts.subtitle +
    "</p></div></div></div>"
  );
}

export function mpPipelineWithDrawer(
  scene: MpPipelineScene,
  drawerHtml: string
): string {
  return (
    '<div class="m-mp-scene m-mp-drawer-scene">' +
    '<div class="m-mp-backdrop">' +
    myProspectsPipelineHtml(scene, { backdrop: true }) +
    "</div>" +
    '<div class="m-mp-drawer-overlay">' +
    drawerHtml +
    "</div></div>"
  );
}

export function mpPipelineWithFinanceModal(
  scene: MpPipelineScene,
  modalHtml: string
): string {
  return (
    '<div class="m-mp-scene">' +
    '<div class="m-mp-backdrop">' +
    myProspectsPipelineHtml(scene, { backdrop: true }) +
    "</div>" +
    '<div class="m-mp-overlay m-mp-overlay-fin">' +
    modalHtml +
    "</div></div>"
  );
}

export function mpPipelineWithCenterModal(
  scene: MpPipelineScene,
  modalHtml: string
): string {
  return (
    '<div class="m-mp-scene">' +
    '<div class="m-mp-backdrop">' +
    myProspectsPipelineHtml(scene, { backdrop: true }) +
    "</div>" +
    '<div class="m-mp-overlay m-mp-overlay-center">' +
    modalHtml +
    "</div></div>"
  );
}

/** @deprecated use mpPipelineWithFinanceModal or mpPipelineWithCenterModal */
export function mpPipelineWithModal(
  scene: MpPipelineScene,
  modalHtml: string
): string {
  return mpPipelineWithCenterModal(scene, modalHtml);
}

export function requestDetailsDrawerHtml(): string {
  const D = MP_DETAILS_DEMO;
  const F = MP_TOUR_FEES;

  return (
    '<aside class="m-mp-drawer">' +
    brandHeroHtml({
      icon: IC.eye,
      title: "Introduction Request Details",
      subtitle: "Track this introduction's people, payout, and progress.",
      closeId: "mpDetailsCloseBtn",
      closeCallout: "Click to close",
      closeSide: "left",
      heroClass: "m-mp-drawer-hero",
      closeClass: "m-mp-drawer-x",
    }) +
    '<div class="m-mp-drawer-scroll">' +
    '<div class="m-mp-drawer-people">' +
    '<div class="m-mp-drawer-person con">' +
    '<div class="m-mp-drawer-person-head"><span class="dot bl"></span>CONNECTOR' +
    '<span class="trust">' +
    IC.shield +
    " TRUST " +
    D.connectorTrust +
    "</span></div>" +
    '<div class="m-mp-drawer-person-body">' +
    '<div class="m-mp-av m-mp-av-gn">MR</div>' +
    "<div><b>" +
    D.connectorName +
    "</b><span>" +
    D.connectorTitle +
    "</span></div></div>" +
    '<div class="m-mp-drawer-meta">' +
    IC.briefcase +
    "<span>" +
    D.connectorIndustry +
    "</span></div>" +
    '<div class="m-mp-drawer-org">' +
    D.connectorCompany +
    "</div>" +
    '<button type="button" class="m-mp-drawer-mini">' +
    IC.messageSquare +
    "Reviews</button></div>" +
    '<div class="m-mp-drawer-person pro">' +
    '<div class="m-mp-drawer-person-head"><span class="dot pu"></span>PROSPECT</div>' +
    '<div class="m-mp-drawer-person-body">' +
    '<div class="m-mp-av m-mp-av-bl">SC</div>' +
    "<div><b>" +
    D.prospectName +
    "</b><span>" +
    D.prospectTitle +
    "</span></div></div>" +
    '<div class="m-mp-drawer-org">' +
    D.prospectCompany +
    "</div></div></div>" +
    '<section class="m-mp-drawer-block">' +
    "<h5>" +
    IC.calendar +
    "Meeting Title</h5><p><b>" +
    D.meetingTitle +
    "</b></p></section>" +
    '<section class="m-mp-drawer-block">' +
    "<h5>" +
    IC.trendingUp +
    "Purpose</h5><p>" +
    D.purpose +
    "</p></section>" +
    '<section class="m-mp-drawer-payout">' +
    '<div class="m-mp-drawer-payout-ic">' +
    IC.dollar +
    "</div>" +
    "<div><small>TOTAL REFERRAL PAYOUT</small><b>$" +
    F.referralPayout.toLocaleString() +
    "</b>" +
    "<p>Card processing fees are included in your total charge (below), not in the referral payout. Charged in two parts — 5% when the intro is sent, 95% when the meeting is booked.</p></div></section>" +
    '<section class="m-mp-drawer-fees">' +
    "<h5>" +
    IC.dollar +
    "Payment breakdown</h5>" +
    "<div><span>Referral payout</span><b>$" +
    F.referralPayout.toFixed(2) +
    "</b></div>" +
    "<div><span>Stripe Processing Fee (2.9% + $0.30)</span><b>$" +
    F.processingFee.toFixed(2) +
    "</b></div>" +
    "<div><span>Application Fee</span><b>$" +
    F.applicationFee.toFixed(2) +
    "</b></div>" +
    '<div class="total"><span>Total</span><b>$' +
    F.total.toFixed(2) +
    "</b></div></section>" +
    '<div class="m-mp-drawer-milestones">' +
    '<div class="m-mp-milestone ok">' +
    IC.checkCircle +
    "<div><small>INTRO SENT (5%)</small><b>$" +
    F.initialCharge.toFixed(2) +
    "</b></div></div>" +
    '<div class="m-mp-milestone pending">' +
    IC.clock +
    "<div><small>ON MEETING BOOKED (95%)</small><b>$" +
    F.remainingCharge.toFixed(2) +
    "</b></div></div></div>" +
    '<section class="m-mp-drawer-activity">' +
    "<h5>" +
    IC.clock +
    "Activity</h5>" +
    "<div><span>Last</span><b>1 day ago</b></div>" +
    '<div class="next"><span>Next</span><b>Await prospect acceptance to schedule a meeting.</b></div></section>' +
    '<section class="m-mp-drawer-dispute">' +
    IC.scale +
    "<div><b>Having Issues?</b><p>If there is a problem with this introduction request, you can file a dispute.</p>" +
    '<button type="button" class="m-mp-drawer-dispute-btn">' +
    IC.scale +
    "File Dispute</button></div></section></div>" +
    '<div class="m-mp-drawer-foot">' +
    "<small>Withdrawing stops the request. Captured charges are refunded where applicable; uncaptured holds are released.</small>" +
    '<button type="button" class="m-mp-drawer-withdraw">' +
    IC.ban +
    "Withdraw</button></div></aside>"
  );
}

export function paymentDetailsModalHtml(): string {
  const D = MP_DETAILS_DEMO;
  const F = MP_TOUR_FEES;

  return (
    '<div class="m-mp-fin-dialog">' +
    financeHero(
      D.prospectName + " — Track your payment status and deductions"
    ) +
    '<div class="m-mp-fin-scroll">' +
    '<section class="m-mp-fin-section">' +
    '<h5><span class="m-mp-fin-sec-ic pri">' +
    IC.pie +
    "</span>Payment Summary</h5>" +
    '<div class="m-mp-fin-grid">' +
    '<div class="m-mp-fin-card">' +
    '<span class="ic pri">' +
    IC.dollar +
    "</span><small>Total Referral Payout</small><b>$" +
    F.total.toFixed(2) +
    "</b><em>Amount committed</em></div>" +
    '<div class="m-mp-fin-card">' +
    '<span class="ic rose">' +
    IC.mail +
    "</span><small>5% Initial</small><b>$" +
    F.initialCharge.toFixed(2) +
    "</b>" +
    statusPill("Payment Captured", "ok") +
    "</div>" +
    '<div class="m-mp-fin-card">' +
    '<span class="ic gn">' +
    IC.calendar +
    "</span><small>95% Remaining</small><b>$" +
    F.remainingCharge.toFixed(2) +
    "</b>" +
    statusPill("Pending", "pending") +
    "</div>" +
    '<div class="m-mp-fin-card">' +
    '<span class="ic warn">' +
    IC.trendingUp +
    "</span><small>Total Charged</small><b>$" +
    F.initialCharge.toFixed(2) +
    "</b><em>Of $" +
    F.total.toFixed(2) +
    "</em></div></div>" +
    '<div class="m-mp-fin-breakdown">' +
    "<div><span>Referral payout</span><b>$" +
    F.referralPayout.toFixed(2) +
    "</b></div>" +
    "<div><span>Stripe Processing Fee (2.9% + $0.30)</span><b>$" +
    F.processingFee.toFixed(2) +
    "</b></div>" +
    "<div><span>Application Fee</span><b>$" +
    F.applicationFee.toFixed(2) +
    "</b></div>" +
    '<div class="total"><span>Total</span><b>$' +
    F.total.toFixed(2) +
    "</b></div></div></section>" +
    '<section class="m-mp-fin-section">' +
    '<h5><span class="m-mp-fin-sec-ic bl">' +
    IC.clock +
    "</span>Payment Timeline</h5>" +
    '<div class="m-mp-fin-table-wrap"><table class="m-mp-fin-table">' +
    "<thead><tr><th>Event</th><th>Description</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>" +
    "<tr><td><span class='ev pri'>" +
    IC.creditCard +
    "Authorization</span></td><td>Payment authorized for introduction request</td><td>11 Jun 2026, 10:57 AM</td><td>$" +
    F.total.toFixed(2) +
    "</td><td>" +
    statusPill("Succeeded", "ok") +
    "</td></tr>" +
    "<tr><td><span class='ev rose'>" +
    IC.mail +
    "Initial Capture</span></td><td>Initial payment captured after intro email sent</td><td>17 Jun 2026, 10:59 AM</td><td>$" +
    F.initialCharge.toFixed(2) +
    "</td><td>" +
    statusPill("Payment Captured", "ok") +
    "</td></tr>" +
    "<tr><td><span class='ev gn'>" +
    IC.calendar +
    "Remaining Capture</span></td><td>Remaining payment pending meeting booking</td><td>Pending</td><td>$" +
    F.remainingCharge.toFixed(2) +
    "</td><td>" +
    statusPill("Pending", "pending") +
    "</td></tr></tbody></table></div></section>" +
    '<section class="m-mp-fin-section receipts">' +
    '<h5><span class="m-mp-fin-sec-ic gn">' +
    IC.receipt +
    "</span>Payment Receipts</h5>" +
    '<div class="m-mp-fin-receipts">' +
    '<div class="m-mp-fin-receipt">' +
    '<span class="ic rose">' +
    IC.mail +
    "</span><div><b>5% Initial Payment</b><small>$" +
    F.initialCharge.toFixed(2) +
    " charged · Email sent</small>" +
    '<a href="#">' +
    IC.externalLink +
    "View Receipt</a></div></div>" +
    '<div class="m-mp-fin-receipt muted">' +
    '<span class="ic gn">' +
    IC.calendar +
    "</span><div><b>95% Meeting Payment</b><small>$" +
    F.remainingCharge.toFixed(2) +
    " · Meeting booked</small><em>Not yet captured</em></div></div></div></section></div></div>"
  );
}

function alertFoot(
  confirmLabel: string,
  confirmId: string,
  opts?: { hot?: boolean; callout?: string }
): string {
  const attrs = opts?.hot
    ? ' id="' +
      confirmId +
      '" class="m-mp-alert-confirm qsd-hot" data-callout="' +
      (opts.callout ?? confirmLabel) +
      '" data-co-side="top"'
    : ' id="' + confirmId + '" class="m-mp-alert-confirm"';
  return (
    '<div class="m-mp-alert-foot">' +
    '<button type="button" class="m-mp-alert-cancel">Cancel</button>' +
    '<button type="button"' +
    attrs +
    ">" +
    confirmLabel +
    "</button></div>"
  );
}

export function acknowledgeMeetingModalHtml(): string {
  return (
    '<div class="m-mp-alert-dialog">' +
    "<h4>Acknowledge Meeting Completion</h4>" +
    "<p>Please acknowledge that your meeting with the Prospect has been successfully completed. This will move the introduction to the peer feedback stage.</p>" +
    alertFoot("Acknowledge Completion", "mpAcknowledgeBtn", {
      hot: true,
      callout: "Click Acknowledge Completion",
    }) +
    "</div>"
  );
}

export function leaveFeedbackModalHtml(): string {
  const D = MP_FEEDBACK_DEMO;
  const stars = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        '<button type="button" class="m-mp-fb-star" data-star="' +
        n +
        '">' +
        IC.star +
        "</button>"
    )
    .join("");

  return (
    '<div class="m-mp-dialog m-mp-dialog-fb">' +
    '<div class="m-mp-fb-head">' +
    "<h4>Leave Peer Feedback</h4>" +
    "<p>Rate your overall experience working with <b>" +
    D.connectorName +
    "</b></p></div>" +
    '<div class="m-mp-fb-body">' +
    "<label>Rating <em>*</em></label>" +
    '<div class="m-mp-fb-stars" id="mpFeedbackStars">' +
    stars +
    "</div>" +
    "<label>Feedback <span>Optional</span></label>" +
    '<textarea class="m-mp-fb-area" id="mpFeedbackText" rows="4" readonly placeholder="Share your experience..."></textarea></div>' +
    '<div class="m-mp-fb-foot">' +
    '<button type="button" class="m-mp-alert-cancel">Cancel</button>' +
    '<button type="button" class="m-mp-alert-confirm qsd-hot" id="mpFeedbackSubmitBtn" data-callout="Click Submit Feedback" data-co-side="top">Submit Feedback</button></div></div>'
  );
}
