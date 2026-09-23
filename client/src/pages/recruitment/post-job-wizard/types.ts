import type { SalaryCurrencyCode } from "@/lib/salary-currency";
import type {
  AssessmentQuestionType,
  AssessmentOption,
  AssessmentCorrectAnswer,
} from "@/lib/api/recruitment";

export type CreationMethod = "manual" | "url" | "pdf";

/**
 * A wizard-local assessment question. The authoring modal edits `questionText`,
 * `questionType` (Yes/No or Text), and `isRequired`. For Yes/No questions the
 * Approve/Decline options are stamped by the server; Text questions carry no
 * options/correctAnswer. `options`/`correctAnswer` are carried opaquely so edit
 * round-trips losslessly (`multi_choice` is not authorable in the UI yet).
 */
export interface WizardAssessmentQuestion {
  /** Stable local id for React keys + drag-and-drop (not persisted). */
  clientId: string;
  /** Existing server row id (edit flow). Absent for newly added questions. */
  serverId?: string;
  sourceBankQuestionId?: string;
  questionText: string;
  isRequired: boolean;
  /** Promote this inline question into the recruiter's bank on save. */
  saveToBank?: boolean;
  /** "single_choice" (Yes/No) or "text" — chosen in the authoring modal. */
  questionType?: AssessmentQuestionType;
  // Carried opaquely; not edited directly in the UI:
  options?: AssessmentOption[];
  correctAnswer?: AssessmentCorrectAnswer;
  points?: number;
}

export type SalaryPeriod = "yearly" | "monthly" | "weekly" | "hourly";

export interface JobFormData {
  creationMethod: CreationMethod;
  sourceUrl: string;
  industry: string;
  department: string;
  title: string;
  experienceLevel: string;
  workType: string;
  /** Optional — "" when the recruiter did not state the terms. */
  employmentType: string;
  location: string;
  /** ISO 3166-1 alpha-2 country codes (required, multi-select). */
  countries: string[];
  companyName: string;
  companyWebsite: string;
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
  salaryRangeMin: number;
  salaryRangeMax: number;
  salaryCurrency: SalaryCurrencyCode;
  salaryPeriod: SalaryPeriod;
  salaryRangeNotes: string;
  /**
   * Flat referral fee. The Stripe/application fee and the publish charge are
   * computed server-side — never trusted from the client.
   */
  flatReferralAmount: number;
  /**
   * Success Fees opt-in. When false, `successFeeAmount` and `probationPeriodDays`
   * are stripped from the create payload so the server stores NULL — even if the
   * recruiter typed values before unchecking the box.
   */
  hasSuccessFee: boolean;
  successFeeAmount: number;
  probationPeriodDays: number;
  /**
   * Connector payout timing — maps directly to the persisted server fields.
   * Each connector type independently either pays on hire (`waits` = false) or
   * after its own waiting period (`waits` = true, counted in days from the hire
   * date). Internal timing may be locked to an org admin default. Days are `0`
   * when that type pays on hire. Independent of the candidate probation period.
   */
  intPayoutWaits: boolean;
  extPayoutWaits: boolean;
  intConnectorPayoutWaitDays: number;
  extConnectorPayoutWaitDays: number;
  hasPaymentMethod: boolean;
  /**
   * Opt-in to emailing members of selected organisations about this job.
   * When false, `organisationIds` is ignored and omitted from the create payload.
   */
  notifyUsers: boolean;
  organisationIds: string[];
  /** Assessment step: whether this job has screening questions. */
  hasAssessment: boolean;
  assessmentQuestions: WizardAssessmentQuestion[];
}

export type UpdateJobFormData = (
  updates: Partial<JobFormData> | ((prev: JobFormData) => Partial<JobFormData>)
) => void;

export const initialFormData: JobFormData = {
  creationMethod: "manual",
  sourceUrl: "",
  industry: "",
  department: "",
  title: "",
  experienceLevel: "",
  workType: "",
  employmentType: "",
  location: "",
  countries: [],
  companyName: "",
  companyWebsite: "",
  requiredSkills: [],
  preferredSkills: [],
  description: "",
  requirements: "",
  responsibilities: "",
  benefits: "",
  salaryRangeMin: 0,
  salaryRangeMax: 0,
  salaryCurrency: "USD",
  salaryPeriod: "yearly",
  salaryRangeNotes: "",
  flatReferralAmount: 0,
  hasSuccessFee: false,
  successFeeAmount: 0,
  probationPeriodDays: 0,
  intPayoutWaits: false,
  extPayoutWaits: false,
  intConnectorPayoutWaitDays: 0,
  extConnectorPayoutWaitDays: 0,
  hasPaymentMethod: false,
  notifyUsers: false,
  organisationIds: [],
  hasAssessment: false,
  assessmentQuestions: [],
};
