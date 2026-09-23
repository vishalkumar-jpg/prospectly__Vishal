import { IC } from "../icons";
import {
  FR_INBOX_CARDS,
  FR_INTRO_DEMO,
  IR_PIPELINE_CARDS,
  IR_PIPELINE_STAGES,
  type IrPipelineStageId,
} from "./fulfill-request-demo";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function irTabsBar(active: "inbox" | "pipeline"): string {
  const tab = (
    id: string,
    label: string,
    icon: string,
    count: number,
    on: boolean
  ) =>
    '<button type="button" class="m-ir-tab' +
    (on ? " on" : "") +
    '">' +
    icon +
    "<span>" +
    label +
    '</span><span class="m-ir-tab-badge' +
    (on ? " on" : "") +
    '">' +
    count +
    "</span></button>";

  return (
    '<div class="m-ir-tabs-bar">' +
    '<div class="m-ir-tabs">' +
    tab("inbox", "Inbox", IC.inbox, 2, active === "inbox") +
    tab("pipeline", "Pipeline", IC.gitBranch, 5, active === "pipeline") +
    tab("archive", "Archive", IC.archive, 4, false) +
    tab("unfulfilled", "Unfulfilled", IC.ban, 1, false) +
    "</div></div>"
  );
}

function inboxPersonBox(
  kind: "requester" | "prospect",
  name: string,
  title: string,
  company: string,
  trustScore?: number,
  industry?: string
): string {
  const isReq = kind === "requester";
  return (
    '<div class="m-ir-person ' +
    kind +
    '">' +
    '<div class="m-ir-person-head">' +
    "<span>" +
    (isReq ? "Requester" : "Prospect") +
    "</span>" +
    (isReq && trustScore != null
      ? '<span class="m-ir-trust">' +
        IC.shield +
        " TRUST " +
        trustScore +
        "</span>"
      : "") +
    "</div>" +
    '<div class="m-ir-person-body">' +
    '<div class="m-ir-av">' +
    initials(name) +
    "</div>" +
    "<div><b>" +
    name +
    "</b><span>" +
    title +
    "</span></div></div>" +
    (isReq && industry
      ? '<div class="m-ir-person-meta">' +
        IC.briefcase +
        "<span>" +
        industry +
        '</span></div><div class="m-ir-org"><small>Organizations this person belongs to</small><span>' +
        company +
        ' <em class="ok">' +
        IC.checkCircle +
        "</em></span></div>" +
        '<button type="button" class="m-ir-mini-btn">' +
        IC.messageSquare +
        "Reviews</button>"
      : '<div class="m-ir-org"><small>Organizations this person belongs to</small><span>' +
        company +
        "</span></div>" +
        '<div class="m-ir-link-btns">' +
        '<button type="button" class="m-ir-mini-btn">' +
        IC.linkedin +
        "LinkedIn</button>" +
        '<button type="button" class="m-ir-mini-btn">' +
        IC.globe +
        "Company Website</button></div>") +
    "</div>"
  );
}

function inboxCard(card: (typeof FR_INBOX_CARDS)[number]): string {
  const acceptAttrs = card.hotAccept
    ? ' id="irAcceptBtn" class="m-ir-accept qsd-hot" data-callout="Click Accept" data-co-side="top"'
    : ' class="m-ir-accept"';
  return (
    '<div class="m-ir-inbox-card">' +
    '<div class="m-ir-inbox-top">' +
    '<div class="m-ir-pending">' +
    IC.clock +
    " Pending</div>" +
    '<div class="m-ir-received">' +
    IC.calendar +
    " Received " +
    card.received +
    "</div>" +
    '<div class="m-ir-payout"><small>REFERRAL PAYOUT</small><b>$ ' +
    card.bounty.toLocaleString() +
    "</b></div></div>" +
    "<h3>" +
    card.meetingTitle +
    "</h3>" +
    "<p>" +
    card.meetingDescription +
    "</p>" +
    '<div class="m-ir-people">' +
    inboxPersonBox(
      "requester",
      card.requesterName,
      card.requesterTitle,
      card.requesterCompany,
      card.trustScore,
      card.requesterIndustry
    ) +
    inboxPersonBox(
      "prospect",
      card.prospectName,
      card.prospectTitle,
      card.prospectCompany
    ) +
    "</div>" +
    (card.additionalContext
      ? '<div class="m-ir-context">' +
        IC.info +
        "<span><b>Additional Context:</b> " +
        card.additionalContext +
        "</span></div>"
      : "") +
    '<div class="m-ir-inbox-actions">' +
    '<button type="button"' +
    acceptAttrs +
    ">" +
    IC.handshake +
    "Accept</button>" +
    '<button type="button" class="m-ir-decline">' +
    IC.ban +
    "Decline</button></div></div>"
  );
}

function pageHead(): string {
  return '<div class="m-ir-head"><h1>Incoming Requests — earn by introducing people.</h1></div>';
}

export function incomingRequestsInboxHtml(): string {
  return (
    '<div class="m-ir-page">' +
    pageHead() +
    irTabsBar("inbox") +
    '<div class="m-ir-inbox-grid">' +
    FR_INBOX_CARDS.map(inboxCard).join("") +
    "</div></div>"
  );
}

function introPersonCard(
  kind: "req" | "con",
  label: string,
  name: string
): string {
  const avClass = kind === "req" ? "m-ir-av-grad" : "m-ir-av grn";
  return (
    '<div class="m-ir-intro-person-card ' +
    kind +
    '">' +
    '<div class="m-ir-intro-person-head ' +
    kind +
    '"><span class="m-ir-intro-dot"></span><span>' +
    label +
    "</span></div>" +
    '<div class="m-ir-intro-person-body">' +
    '<span class="' +
    avClass +
    '">' +
    initials(name) +
    "</span><b>" +
    name +
    "</b></div></div>"
  );
}

function introStatCell(
  icon: string,
  tone: "grn" | "pur" | "sky",
  label: string,
  value: string
): string {
  return (
    '<div class="m-ir-intro-stat">' +
    '<span class="m-ir-stat-ic ' +
    tone +
    '">' +
    icon +
    "</span><div><span>" +
    label +
    "</span><b>" +
    value +
    "</b></div></div>"
  );
}

function introDetailBlock(
  icon: string,
  tone: "sky" | "pur",
  title: string,
  text: string
): string {
  return (
    '<section class="m-ir-intro-block">' +
    '<div class="m-ir-block-head"><span class="m-ir-block-ic ' +
    tone +
    '">' +
    icon +
    "</span><b>" +
    title +
    "</b></div><p>" +
    text +
    "</p></section>"
  );
}

function makeIntroDialog(tab: "review" | "draft"): string {
  const D = FR_INTRO_DEMO;
  const reviewOn = tab === "review";
  const draftOn = tab === "draft";
  return (
    '<div class="m-ir-intro-dialog">' +
    '<div class="m-ir-intro-hero">' +
    '<div class="m-ir-intro-hero-text">' +
    '<span class="m-ir-hero-ic">' +
    IC.users +
    "</span><div><b>Make Introduction</b><span>Review and facilitate the connection between " +
    D.requesterName +
    " and " +
    D.contactName +
    "</span></div></div></div>" +
    '<div class="m-ir-intro-tabs-wrap"><div class="m-ir-intro-tabs-list">' +
    '<button type="button" class="m-ir-intro-tab' +
    (reviewOn ? " on" : " off") +
    '">' +
    IC.user +
    "Review Request</button>" +
    '<button type="button" class="m-ir-intro-tab' +
    (draftOn ? " on" : " off") +
    '">' +
    IC.mail +
    "Draft Email</button></div></div>" +
    (reviewOn
      ? '<div class="m-ir-intro-scroll">' +
        '<div class="m-ir-intro-people">' +
        introPersonCard("req", "Requester", D.requesterName) +
        introPersonCard("con", "Your Contact", D.contactName) +
        "</div>" +
        '<div class="m-ir-intro-stats">' +
        introStatCell(
          IC.dollar,
          "grn",
          "Referral Payout Offered",
          "$" + D.bounty.toLocaleString()
        ) +
        introStatCell(IC.clock, "pur", "Proposed Duration", D.duration) +
        introStatCell(IC.video, "sky", "Meeting Type", "Virtual") +
        "</div>" +
        introDetailBlock(IC.calendar, "sky", "Meeting Title", D.meetingTitle) +
        introDetailBlock(IC.mail, "pur", "Meeting Purpose", D.meetingPurpose) +
        introDetailBlock(
          IC.mail,
          "pur",
          "Additional Context",
          D.additionalContext
        ) +
        "</div>" +
        '<div class="m-ir-intro-foot review">' +
        '<button type="button" class="m-ir-accept-req qsd-hot" id="irAcceptRequestBtn" data-callout="Click Accept Request" data-co-side="top">' +
        IC.handshake +
        "Accept Request</button>" +
        '<button type="button" class="m-ir-cancel">Cancel</button></div>'
      : '<div class="m-ir-intro-scroll draft">' +
        '<label>Email Subject</label><input class="m-ir-email-in" readonly value="' +
        D.emailSubject +
        '" />' +
        '<label>Email Body</label><textarea class="m-ir-email-area" readonly rows="10">' +
        D.emailBody +
        "</textarea>" +
        '<div class="m-ir-email-foot"><small>' +
        IC.lock +
        " Automatic footer (included in all emails)</small><p><em>P.S. This introduction was facilitated through Prospectly, where professionals exchange warm introductions. Your connector thought you would be a great fit for the network.</em></p></div></div>" +
        '<div class="m-ir-intro-foot draft">' +
        '<button type="button" class="m-ir-cancel">Cancel</button>' +
        '<button type="button" class="m-ir-send-intro qsd-hot" id="irSendIntroBtn" data-callout="Click Send Introduction" data-co-side="top">' +
        IC.send +
        "Send Introduction</button></div>") +
    "</div>"
  );
}

function modalScene(dialog: string): string {
  return (
    '<div class="m-ir-scene">' +
    '<div class="m-ir-backdrop">' +
    incomingRequestsInboxHtml() +
    "</div>" +
    '<div class="m-ir-overlay m-ir-overlay-dialog">' +
    dialog +
    "</div></div>"
  );
}

export function incomingRequestsWithReviewModal(): string {
  return modalScene(makeIntroDialog("review"));
}

export function incomingRequestsWithDraftModal(): string {
  return modalScene(makeIntroDialog("draft"));
}

function pipelineCard(card: (typeof IR_PIPELINE_CARDS)[number]): string {
  const tint =
    IR_PIPELINE_STAGES.find((s) => s.id === card.stage)?.color ?? "bl";
  const btns = [
    '<button type="button" class="m-ir-pipe-btn">' +
      IC.eye +
      "Details</button>",
  ];
  if (card.showEmail)
    btns.push(
      '<button type="button" class="m-ir-pipe-btn">' +
        IC.mail +
        "Email</button>"
    );
  if (card.showFinance)
    btns.push(
      '<button type="button" class="m-ir-pipe-btn">' +
        IC.receipt +
        "Finance</button>"
    );
  const footer = card.showUnsuccessful
    ? '<button type="button" class="m-ir-pipe-unsuccess">' +
      IC.ban +
      "Unsuccessful</button>"
    : card.showFeedback
      ? '<button type="button" class="m-ir-pipe-feedback">' +
        IC.messageSquare +
        "Feedback</button>"
      : "";
  return (
    '<div class="m-ir-pipe-card">' +
    '<div class="m-ir-pipe-top"><b>' +
    card.meetingTitle +
    '</b><span class="m-ir-pipe-amt">$' +
    card.bounty.toLocaleString() +
    "</span></div>" +
    '<div class="m-ir-pipe-person"><div class="m-ir-av m-ir-av-' +
    tint +
    '">' +
    initials(card.targetName) +
    "</div><div><b>" +
    card.targetName +
    '</b><span class="m-ir-pipe-req">' +
    IC.handshake +
    " Requester: " +
    card.requesterName +
    "</span></div></div>" +
    '<div class="m-ir-pipe-actions">' +
    btns.join("") +
    "</div>" +
    footer +
    "</div>"
  );
}

function pipelineColumn(
  stageId: IrPipelineStageId,
  title: string,
  color: string
): string {
  const cards = IR_PIPELINE_CARDS.filter((c) => c.stage === stageId);
  return (
    '<div class="m-ir-pipe-col">' +
    '<div class="m-ir-pipe-col-head m-ir-head-' +
    color +
    '"><span class="m-ir-dot"></span>' +
    title +
    '<span class="m-ir-count">' +
    cards.length +
    "</span></div>" +
    '<div class="m-ir-pipe-col-body">' +
    cards.map(pipelineCard).join("") +
    "</div></div>"
  );
}

export function incomingRequestsPipelineHtml(): string {
  const board = IR_PIPELINE_STAGES.map((s) =>
    pipelineColumn(s.id, s.title, s.color)
  ).join("");
  return (
    '<div class="m-ir-page">' +
    pageHead() +
    irTabsBar("pipeline") +
    '<div class="m-ir-pipe-board">' +
    board +
    "</div>" +
    '<div class="m-ir-foot m-wiz-foot">' +
    '<button type="button" class="m-ir-continue qsd-hot continue" id="irContinueBtn" data-callout="Click Continue" data-co-side="top">Continue</button></div></div>'
  );
}
