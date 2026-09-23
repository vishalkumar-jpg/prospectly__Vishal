import { PROSPECTING_DEMO } from "../demo-entities";

const { requester, prospect, prospect2 } = PROSPECTING_DEMO;

export const FR_INBOX_CARDS = [
  {
    id: "demo-inbox-1",
    meetingTitle: "Explore NovaTech partnership fit",
    meetingDescription:
      "Alex is looking for a warm intro to Sarah to discuss co-selling opportunities.",
    additionalContext: "Met Alex at SaaStr — strong fit for our network.",
    bounty: 750,
    received: "15 Jun 2026, 10:25 PM",
    requesterName: requester.name,
    requesterTitle: requester.title,
    requesterCompany: requester.company,
    requesterIndustry: "Software",
    trustScore: 92,
    prospectName: `${prospect.firstName} ${prospect.lastName}`,
    prospectTitle: prospect.title,
    prospectCompany: prospect.company,
    hotAccept: true,
  },
  {
    id: "demo-inbox-2",
    meetingTitle: "Insurance VA workflow review",
    meetingDescription:
      "Requester wants intro to Rachel about virtual assistant services for insurance ops.",
    bounty: 400,
    received: "13 Jun 2026, 4:10 PM",
    requesterName: "Jordan Lee",
    requesterTitle: "COO",
    requesterCompany: "Summit Insurance Group",
    requesterIndustry: "Insurance",
    trustScore: 88,
    prospectName: "Rachel Moore",
    prospectTitle: "Director of Operations",
    prospectCompany: "Office Beacon",
    hotAccept: false,
  },
] as const;

export type IrPipelineStageId =
  | "intro_sent"
  | "meeting_booked"
  | "meeting_completed"
  | "peer_feedback";

export const IR_PIPELINE_STAGES: {
  id: IrPipelineStageId;
  title: string;
  color: string;
}[] = [
  { id: "intro_sent", title: "Intro Sent", color: "bl" },
  { id: "meeting_booked", title: "Meeting Booked", color: "gn" },
  { id: "meeting_completed", title: "Meeting Completed", color: "vi" },
  { id: "peer_feedback", title: "Peer Feedback", color: "tl" },
];

export const IR_PIPELINE_CARDS = [
  {
    stage: "intro_sent" as const,
    meetingTitle: "Pinnacle SaaS product demo",
    bounty: 500,
    targetName: `${prospect2.firstName} ${prospect2.lastName}`,
    requesterName: requester.name,
    showEmail: true,
    showUnsuccessful: true,
  },
  {
    stage: "meeting_booked" as const,
    meetingTitle: "Insurance VA workflow review",
    bounty: 400,
    targetName: "Rachel Moore",
    requesterName: "Jordan Lee",
    showFinance: true,
    showUnsuccessful: true,
  },
  {
    stage: "meeting_completed" as const,
    meetingTitle: "Healthcare data partnership",
    bounty: 850,
    targetName: "Elena Voss",
    requesterName: "Priya Sharma",
    showFinance: true,
  },
  {
    stage: "peer_feedback" as const,
    meetingTitle: "Investor network intro",
    bounty: 950,
    targetName: "James Okafor",
    requesterName: "Taylor Brooks",
    showFinance: true,
    showFeedback: true,
  },
];

export const FR_INTRO_DEMO = {
  requesterName: requester.name,
  contactName: `${prospect.firstName} ${prospect.lastName}`,
  bounty: 750,
  duration: "30min",
  meetingTitle: "Explore NovaTech partnership fit",
  meetingPurpose:
    "Alex is looking for a warm intro to Sarah to discuss co-selling opportunities.",
  additionalContext: "Met Alex at SaaStr — strong fit for our network.",
  emailSubject: `Introduction: ${prospect.firstName} ${prospect.lastName} <> ${requester.name}`,
  emailBody: `Hi ${prospect.firstName},

I hope this email finds you well! I wanted to introduce you to Alex, who I think you'd find interesting to connect with.

Alex is interested in discussing co-selling opportunities and I thought you two would have great synergy given your respective expertise.

Would you be open to a 30-minute virtual meeting to explore potential opportunities?

Alex, meet ${prospect.firstName}. ${prospect.firstName}, meet Alex.

I'll let you both take it from here!

Best regards,
Your Name`,
};
