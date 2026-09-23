export const FIND_PROSPECT_DEMO = {
  prospectName: "Sarah Chen",
  firstName: "Sarah",
  lastName: "Chen",
  title: "VP of Sales",
  company: "NovaTech Solutions",
  location: "San Francisco, CA, USA",
  linkedin: "linkedin.com/in/sarah-chen",
  email: "sarah.chen@novatech.example.com",
  website: "novatech.example.com",
  industry: "ENTERPRISE SOFTWARE",
  companyType: "PRIVATE",
  employees: "201-500",
  bounty: 750,
  connectorCount: 4,
  meetingTitle: "Explore NovaTech partnership fit",
  meetingDescription:
    "Looking for a warm intro to discuss co-selling and integration opportunities for mid-market sales teams. Key topics include API integrations, partner enablement, and joint go-to-market planning.",
  additionalContext:
    "Met their team at SaaStr — strong product fit for our partnership program. We share several mutual customers in the fintech space.",
  companyDescription:
    "NovaTech builds AI-powered sales enablement tools for mid-market teams. The platform helps revenue leaders automate outreach, enrich CRM data, and coach reps with real-time insights.",
  headline: "VP of Sales at NovaTech Solutions",
  seniority: "Director",
  departments: ["Sales", "Business Development"],
  functions: ["Sales"],
  employment: [
    {
      title: "VP of Sales",
      company: "NovaTech Solutions",
      range: "Jan 2021 — Present",
      current: true,
    },
    {
      title: "Director of Enterprise Sales",
      company: "CloudReach Inc",
      range: "Mar 2017 — Dec 2020",
      current: false,
    },
  ],
  orgRevenue: "12M",
  orgFounded: "2018",
  companyLinkedin: "linkedin.com/company/novatech-demo",
} as const;

export type DemoProspectCard = {
  id: string;
  name: string;
  initials: string;
  title: string;
  company: string;
  industry?: string;
  companyType?: string;
  location: string;
  employees: string;
  bounty: number;
  description: string;
  companyLinkedin?: string;
  website?: string;
  avatarClass?: string;
  dim?: boolean;
  hot?: boolean;
};

export const DEMO_PROSPECT_CARDS: DemoProspectCard[] = [
  {
    id: "sarah",
    name: "Sarah Chen",
    initials: "SC",
    title: "VP of Sales",
    company: "NovaTech Solutions",
    industry: "ENTERPRISE SOFTWARE",
    location: "San Francisco, CA, USA",
    employees: "201-500",
    bounty: 750,
    description: FIND_PROSPECT_DEMO.companyDescription,
    companyLinkedin: "linkedin.com/company/novatech-demo",
    website: "novatech.example.com",
    avatarClass: "grad-emerald",
    hot: true,
  },
  {
    id: "david",
    name: "David Kim",
    initials: "DK",
    title: "Chief Revenue Officer",
    company: "Pinnacle SaaS",
    industry: "SAAS",
    location: "Austin, TX, USA",
    employees: "51-200",
    bounty: 501,
    description:
      "Pinnacle SaaS delivers revenue intelligence for B2B go-to-market teams, helping leaders forecast pipeline and improve conversion rates.",
    companyLinkedin: "linkedin.com/company/pinnacle-demo",
    website: "pinnacle.example.com",
    avatarClass: "grad-violet",
    dim: true,
  },
  {
    id: "mia",
    name: "Rachel Moore",
    initials: "RM",
    title: "Director of Operations",
    company: "Office Beacon",
    industry: "BUSINESS SERVICES",
    location: "Chicago, IL, USA",
    employees: "11-50",
    bounty: 401,
    description:
      "Office Beacon provides virtual assistant and back-office services for growing firms, specializing in insurance operations and workflow automation.",
    companyLinkedin: "linkedin.com/company/office-beacon-demo",
    website: "officebeacon.example.com",
    avatarClass: "grad-rose",
    dim: true,
  },
  {
    id: "james",
    name: "James Okafor",
    initials: "JO",
    title: "Managing Director",
    company: "Summit Capital",
    industry: "FINANCIAL SERVICES",
    location: "New York, NY, USA",
    employees: "11-50",
    bounty: 601,
    description:
      "Summit Capital partners with growth-stage B2B software companies, connecting founders with strategic investors and enterprise buyers.",
    companyLinkedin: "linkedin.com/company/summit-capital-demo",
    website: "summitcap.example.com",
    avatarClass: "grad-blue",
    dim: true,
  },
];
