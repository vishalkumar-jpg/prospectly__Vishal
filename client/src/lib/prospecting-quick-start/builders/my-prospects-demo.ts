export type MpStageId =
  | "awaiting_connector"
  | "awaiting_intro"
  | "intro_sent"
  | "meeting_booked"
  | "meeting_completed"
  | "peer_feedback";

/** One request moving through the pipeline for the whole tour. */
export const MP_TOUR_REQUEST = {
  id: "mp-tour-req",
  meetingTitle: "Explore NovaTech partnership fit",
  bounty: 750,
  prospectName: "Sarah Chen",
  prospectTitle: "VP of Sales",
  prospectCompany: "NovaTech Solutions",
  connectorName: "Marcus Reed",
  connectorCompany: "Bridge Partners",
  connectorTitle: "Managing Partner",
  connectorIndustry: "Professional Services",
  connectorTrust: 4.8,
  purpose: "Assess partnership fit for enterprise sales motion.",
} as const;

/** Fee totals matching real requester UI for Sarah Chen ($750 bounty). */
export const MP_TOUR_FEES = {
  referralPayout: 750,
  processingFee: 37.5,
  applicationFee: 22.05,
  total: 809.55,
  initialCharge: 38,
  remainingCharge: 713,
} as const;

export type MpPipelineScene =
  | "overview"
  | "awaiting_intro"
  | "intro_sent"
  | "view_details"
  | "view_finance"
  | "meeting_booked"
  | "confirm_meeting"
  | "leave_feedback"
  | "journey_complete";

export type MpHotAction =
  | "details"
  | "finance"
  | "join"
  | "confirm"
  | "feedback";

export type MpPipelineCard = {
  id: string;
  stage: MpStageId;
  meetingTitle: string;
  bounty: number;
  prospectName: string;
  prospectTitle: string;
  prospectCompany: string;
  connectorName?: string;
  pendingConnectors?: number;
  showMarket?: boolean;
  showJoin?: boolean;
  showConfirm?: boolean;
  showFeedback?: boolean;
  purpose: string;
};

export const MP_PIPELINE_STAGES: {
  id: MpStageId;
  title: string;
  color: string;
}[] = [
  { id: "awaiting_connector", title: "Awaiting Connector", color: "am" },
  { id: "awaiting_intro", title: "Awaiting Intro", color: "cy" },
  { id: "intro_sent", title: "Intro Sent", color: "bl" },
  { id: "meeting_booked", title: "Meeting Booked", color: "gn" },
  { id: "meeting_completed", title: "Meeting Completed", color: "vi" },
  { id: "peer_feedback", title: "Peer Feedback", color: "tl" },
];

const SCENE_STAGE: Record<MpPipelineScene, MpStageId> = {
  overview: "awaiting_connector",
  awaiting_intro: "awaiting_intro",
  intro_sent: "intro_sent",
  view_details: "intro_sent",
  view_finance: "intro_sent",
  meeting_booked: "meeting_booked",
  confirm_meeting: "meeting_completed",
  leave_feedback: "peer_feedback",
  journey_complete: "peer_feedback",
};

/** Explains who moves the card and how — shown above the pipeline board in the tour. */
export const MP_SCENE_HINT: Partial<
  Record<
    MpPipelineScene,
    {
      stage: MpStageId;
      title: string;
      body: string;
    }
  >
> = {
  overview: {
    stage: "awaiting_connector",
    title: "Stage 1 — Awaiting Connector",
    body: "Your card starts here after you request an intro. Prospectly emails your selected connectors — they review and accept from <b>Incoming Requests</b>. You do not move the card yourself.",
  },
  awaiting_intro: {
    stage: "awaiting_intro",
    title: "Stage 2 — Awaiting Intro",
    body: "<b>Marcus Reed accepted</b> in his connector inbox. Prospectly emailed you and moved your card here automatically. Marcus is now preparing the introduction email to Sarah.",
  },
  intro_sent: {
    stage: "intro_sent",
    title: "Stage 3 — Intro Sent",
    body: "Marcus sent the intro email to Sarah with a <b>meeting booking link</b>. Prospectly notified you by email; your card moved here and the <b>5% initial payment</b> was captured. Click <b>Details</b> on your card, then <b>Finance</b>, then <b>Continue</b>.",
  },
  meeting_booked: {
    stage: "meeting_booked",
    title: "Stage 4 — Meeting Booked",
    body: "Sarah chose a time from the link in Marcus's email. Prospectly confirmed the meeting with all parties — your card moved here and a <b>Join</b> button appears on your card.",
  },
};

export const MP_SCENE_HOT: Partial<
  Record<
    MpPipelineScene,
    {
      action: MpHotAction;
      btnId: string;
      callout: string;
      calloutSide?: "left" | "right" | "top";
    }
  >
> = {
  intro_sent: {
    action: "details",
    btnId: "mpDetailsBtn",
    callout: "Click Details",
    calloutSide: "right",
  },
  view_details: {
    action: "details",
    btnId: "mpDetailsBtn",
    callout: "Click Details",
    calloutSide: "right",
  },
  view_finance: {
    action: "finance",
    btnId: "mpFinanceBtn",
    callout: "Click Finance",
    calloutSide: "right",
  },
  confirm_meeting: {
    action: "confirm",
    btnId: "mpConfirmBtn",
    callout: "Click Confirm",
    calloutSide: "left",
  },
  leave_feedback: {
    action: "feedback",
    btnId: "mpFeedbackBtn",
    callout: "Click Feedback",
    calloutSide: "left",
  },
};

export function buildTourCard(scene: MpPipelineScene): MpPipelineCard {
  const stage = SCENE_STAGE[scene];
  const R = MP_TOUR_REQUEST;
  return {
    id: R.id,
    stage,
    meetingTitle: R.meetingTitle,
    bounty: R.bounty,
    prospectName: R.prospectName,
    prospectTitle: R.prospectTitle,
    prospectCompany: R.prospectCompany,
    purpose: R.purpose,
    pendingConnectors: stage === "awaiting_connector" ? 2 : undefined,
    showMarket: stage === "awaiting_connector",
    connectorName: stage === "awaiting_connector" ? undefined : R.connectorName,
    showJoin: stage === "meeting_booked",
    showConfirm: stage === "meeting_completed",
    showFeedback: stage === "peer_feedback",
  };
}

export const MP_DETAILS_DEMO = MP_TOUR_REQUEST;
export const MP_FINANCE_DEMO = MP_TOUR_REQUEST;
export const MP_ACK_DEMO = MP_TOUR_REQUEST;
export const MP_FEEDBACK_DEMO = MP_TOUR_REQUEST;
