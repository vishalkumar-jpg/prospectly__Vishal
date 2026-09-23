import {
  RECRUITMENT_EMPLOYMENT_TYPES,
  RECRUITMENT_EMPLOYMENT_TYPE_LABELS,
  type RecruitmentEmploymentType,
} from "@/lib/recruitment/employment-types";

/** Salary is informational job data (no payment) — allow large CTCs, e.g. Indian LPA packages. */
export const SALARY_MAX_CAP = 999_999_999;
/** Stripe per-PaymentIntent ceiling for real charges (Interview Cost, Flat Referral Fee). */
export const PAYMENT_MAX_CAP = 999_999;
export const SUCCESS_FEE_MAX = 999_999;
export const PROBATION_MAX_DAYS = 365;
export const CONNECTOR_PAYOUT_WAIT_MAX_DAYS = 365;
export const SALARY_NOTES_MAX = 255;
/** Integer-only inputs: salary min/max, probation days, connector wait days. */
export const BLOCKED_KEYS = ["-", "e", "E", "+", "."];
/** Fee/payout inputs that accept cents — same as BLOCKED_KEYS minus the decimal point. */
export const BLOCKED_KEYS_DECIMAL = ["-", "e", "E", "+"];

export const EXPERIENCE_LEVELS = [
  { value: "intern", label: "Intern", years: "0 years" },
  { value: "junior", label: "Junior", years: "0-2 years" },
  { value: "mid", label: "Mid-Level", years: "2-5 years" },
  { value: "senior", label: "Senior", years: "5-8 years" },
  { value: "lead", label: "Lead / Staff", years: "8-12 years" },
  { value: "executive", label: "Executive", years: "12+ years" },
];

const EMPLOYMENT_TYPE_DESCRIPTIONS: Record<RecruitmentEmploymentType, string> =
  {
    full_time: "Permanent, full hours",
    part_time: "Permanent, reduced hours",
    contract: "Fixed term, contracted",
    temporary: "Short term or seasonal",
    internship: "Trainee or apprentice",
    freelance: "Project based, independent",
  };

export const WORK_TYPES = [
  { value: "remote", label: "Remote", description: "Work from anywhere" },
  { value: "hybrid", label: "Hybrid", description: "Mix of remote and office" },
  { value: "onsite", label: "On-site", description: "Work from office" },
];

/**
 * Values mirror server recruitment-jobs.ts so the wizard, DTO and
 * candidate-search facet stay aligned. Descriptions are wizard-only.
 */
export const EMPLOYMENT_TYPES = RECRUITMENT_EMPLOYMENT_TYPES.map((value) => ({
  value,
  label: RECRUITMENT_EMPLOYMENT_TYPE_LABELS[value],
  description: EMPLOYMENT_TYPE_DESCRIPTIONS[value],
}));

export const SKILL_SUGGESTIONS: Record<string, string[]> = {
  engineering: [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Python",
    "AWS",
    "Docker",
    "Kubernetes",
    "PostgreSQL",
    "MongoDB",
    "Git",
    "CI/CD",
    "REST APIs",
    "GraphQL",
    "Microservices",
  ],
  product: [
    "Product Strategy",
    "Roadmapping",
    "User Research",
    "A/B Testing",
    "Agile/Scrum",
    "JIRA",
    "Data Analysis",
    "Stakeholder Management",
    "PRD Writing",
    "Competitive Analysis",
  ],
  design: [
    "Figma",
    "UI Design",
    "UX Design",
    "Prototyping",
    "User Research",
    "Design Systems",
    "Adobe Creative Suite",
    "Interaction Design",
    "Wireframing",
    "Usability Testing",
  ],
  marketing: [
    "Digital Marketing",
    "SEO",
    "SEM",
    "Content Marketing",
    "Social Media",
    "Email Marketing",
    "Analytics",
    "Google Ads",
    "Marketing Automation",
    "Brand Strategy",
  ],
  sales: [
    "B2B Sales",
    "CRM (Salesforce)",
    "Lead Generation",
    "Negotiation",
    "Account Management",
    "Sales Strategy",
    "Cold Calling",
    "Pipeline Management",
    "Contract Negotiation",
  ],
  data: [
    "SQL",
    "Python",
    "Data Visualization",
    "Machine Learning",
    "Statistics",
    "Tableau",
    "Power BI",
    "ETL",
    "Data Modeling",
    "Big Data",
  ],
  default: [
    "Communication",
    "Problem Solving",
    "Team Collaboration",
    "Time Management",
    "Leadership",
    "Analytical Thinking",
  ],
};

interface StepDef {
  logical: string;
  title: string;
  description: string;
  readOnly?: boolean;
}

/** Canonical create-flow step order; ids are derived by position. */
const CREATE_STEP_ORDER: StepDef[] = [
  { logical: "method", title: "Method", description: "Choose creation method" },
  { logical: "details", title: "Job Details", description: "Define the role" },
  { logical: "skills", title: "Skills", description: "Required skills" },
  {
    logical: "description",
    title: "Description",
    description: "Job description",
  },
  {
    logical: "assessment",
    title: "Assessment",
    description: "Screening questions (optional)",
  },
  {
    logical: "budget",
    title: "Budget & Pricing Model",
    description: "Pricing model & salary",
  },
  {
    logical: "connectorPayout",
    title: "Connector Payout",
    description: "When connectors get paid",
  },
  {
    logical: "successFees",
    title: "Success Fees",
    description: "Optional candidate bonus",
  },
  { logical: "payment", title: "Payment", description: "Add credit card" },
  { logical: "notify", title: "Notify", description: "Notify organizations" },
  { logical: "confirm", title: "Confirm", description: "Review & Post" },
];

export const getSteps = () =>
  CREATE_STEP_ORDER.map((s, i) => ({
    id: i + 1,
    title: s.title,
    description: s.description,
  }));

export const getStepId = (logicalStep: string): number => {
  const i = CREATE_STEP_ORDER.findIndex((s) => s.logical === logicalStep);
  return i === -1 ? -1 : i + 1;
};

export const getLogicalStep = (stepId: number): string =>
  CREATE_STEP_ORDER[stepId - 1]?.logical ?? "method";

export interface EditWizardStep {
  id: number;
  title: string;
  description: string;
  readOnly?: boolean;
}

/** Canonical edit-flow step order; ids are derived by position. */
const EDIT_STEP_ORDER: StepDef[] = [
  {
    logical: "details",
    title: "Job Details",
    description: "Edit role details",
  },
  {
    logical: "skills",
    title: "Skills",
    description: "Required skills",
  },
  {
    logical: "description",
    title: "Description",
    description: "Edit description",
  },
  {
    logical: "assessment",
    title: "Assessment",
    description: "Screening questions",
  },
  {
    logical: "budget",
    title: "Budget & Pricing Model",
    description: "Pricing model & salary",
    // Step stays navigable; pricing fees remain locked in BudgetStep.
    // Salary fields are editable on update.
  },
  {
    logical: "connectorPayout",
    title: "Connector Payout",
    description: "When connectors get paid",
  },
  {
    logical: "successFees",
    title: "Success Fees",
    description: "Candidate bonus",
  },
];

export const getEditSteps = (): EditWizardStep[] =>
  EDIT_STEP_ORDER.map((s, i) => ({
    id: i + 1,
    title: s.title,
    description: s.description,
    readOnly: s.readOnly,
  }));

export const getEditLogicalStep = (stepId: number): string =>
  EDIT_STEP_ORDER[stepId - 1]?.logical ?? "details";

export const getEditStepId = (logicalStep: string): number => {
  const i = EDIT_STEP_ORDER.findIndex((s) => s.logical === logicalStep);
  return i === -1 ? -1 : i + 1;
};
