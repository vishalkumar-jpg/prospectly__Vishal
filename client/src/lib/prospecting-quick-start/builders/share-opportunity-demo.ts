import { PROSPECTING_DEMO } from "../demo-entities";

const { prospect, prospect2 } = PROSPECTING_DEMO;

export const OPP_BROWSE_DEALS = [
  {
    id: "demo-marketplace-1",
    name: `${prospect.firstName} ${prospect.lastName}`,
    title: prospect.title,
    company: prospect.company,
    meetingTitle: "Explore NovaTech partnership fit",
    meetingDescription: "Warm intro requested for partnership discussion.",
    bounty: 750,
    interested: 3,
    views: 18,
    hotShare: true,
  },
  {
    id: "demo-marketplace-2",
    name: `${prospect2.firstName} ${prospect2.lastName}`,
    title: prospect2.title,
    company: prospect2.company,
    meetingTitle: "Pinnacle SaaS product demo",
    meetingDescription: "Looking for connector with SaaS buyer network.",
    bounty: 500,
    interested: 1,
    views: 9,
    hotShare: false,
  },
  {
    id: "demo-marketplace-3",
    name: "Rachel Moore",
    title: "Director of Operations",
    company: "Office Beacon",
    meetingTitle: "Ops automation discovery",
    meetingDescription: "Intro to Office Beacon for workflow automation.",
    bounty: 400,
    interested: 2,
    views: 11,
    hotShare: false,
  },
] as const;

export const OPP_SHARE_DEMO = {
  totalPayout: 750,
  sharerShare: 375,
  shareUrl: "https://prospectly.com/opportunities/demo-marketplace-1?ref=you",
};
