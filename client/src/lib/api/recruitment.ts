/**
 * Recruitment API Module
 *
 * Handles recruitment master data and job creation endpoints.
 */

import { getCountriesQueryValue } from "@/lib/recruitment/country-filter.utils";
import { request } from "./core";
import type { InterviewOutcome } from "@/pages/recruitment/job-kanban/types";
import { connectorPipelineApi } from "./connector-pipeline";
import { recruitmentCandidateSearchApi } from "./recruitment-candidate-search";
import { recruitmentResumeSearchApi } from "./recruitment-resume-search";
import { recruitmentConnectorUploadApi } from "./recruitment-connector-upload";

export type { ConnectorCandidateResumeUrlResponse } from "./connector-pipeline";
export type {
  CandidateSearchCoverage,
  CandidateSearchCountResponse,
  CandidateSearchFacets,
  CandidateSearchResponse,
  CandidateSearchRow,
  FacetValue,
  FitResult,
  FitSignal,
  FitSignalKind,
  FitSignalState,
} from "./recruitment-candidate-search";
export type {
  ResumeSearchConditionState,
  ResumeSearchMatch,
  ResumeSearchMatchedTerm,
  ResumeSearchMatchKind,
  ResumeSearchResponse,
} from "./recruitment-resume-search";
export type {
  ConnectorUploadFilePayload,
  ConnectorReplaceResumePayload,
  ConnectorReplaceResumeResponse,
  ConnectorUploadPayload,
  ConnectorUploadResponse,
  RetryUploadJobResponse,
  DismissUploadJobResponse,
} from "./recruitment-connector-upload";

export interface Industry {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface Department {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface RecruitmentStage {
  id: number;
  stageKey: string;
  label: string;
  stageOrder: number;
}

/** Aggregate state of the bulk job-post notification, if one was dispatched. */
export interface JobNotificationState {
  status: string;
  sentCount: number;
  totalRecipients: number;
  sendCount: number;
}

/** Whether the current user owns a job or collaborates on it. */
export type RecruitmentAccessRole = "owner" | "collaborator";

export interface JobLifecycleNotificationSelection {
  sendNotifications: boolean;
  candidateStageKeys: string[];
}

export interface JobLifecycleNotificationPrefs {
  lastClose?: JobLifecycleNotificationSelection;
  lastReopen?: JobLifecycleNotificationSelection;
}

export interface RecruitmentJobListItem {
  id: string;
  /** "owner" for jobs the user created, "collaborator" for shared jobs. */
  accessRole: RecruitmentAccessRole;
  title: string;
  companyName: string;
  description: string;
  location: string;
  workType: string;
  status: string;
  salaryRangeMin: string;
  salaryRangeMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
  bountyAmount: string;
  totalAmount: string;
  hasSuccessFee: boolean;
  successFeeAmount: string | null;
  probationPeriodDays: number | null;
  intPayoutWaits: boolean | null;
  extPayoutWaits: boolean | null;
  intConnectorPayoutWaitDays: number | null;
  extConnectorPayoutWaitDays: number | null;
  flatReferralAmount: string | null;
  flatDepositFeePercent: string | null;
  flatDepositAmount: string | null;
  experienceLevel: string;
  createdAt: string;
  closedAt?: string;
  closedReason?: string | null;
  viewCount: number;
  activeCandidateCount: number;
  /** Null when no notification has been dispatched for this job. */
  notification: JobNotificationState | null;
  notificationSnapshot?: JobLifecycleNotificationPrefs | null;
}

export interface JobsListResponse {
  jobs: RecruitmentJobListItem[];
  pagination: {
    page: number;
    limit: number;
    totalJobs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface JobsListParams {
  status?: string;
  search?: string;
  countries?: string[];
  page?: number;
  limit?: number;
}

export interface JobStatsResponse {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
}

export type AssessmentQuestionType = "single_choice" | "multi_choice" | "text";

export interface AssessmentOption {
  id: string;
  label: string;
  orderIndex: number;
  value?: number;
}

export interface AssessmentCorrectAnswer {
  optionIds?: string[];
  text?: string;
}

/** A reusable bank question owned by the current recruiter. */
export interface AssessmentBankQuestion {
  id: string;
  questionText: string;
  questionType: AssessmentQuestionType;
  options: AssessmentOption[] | null;
  correctAnswer: AssessmentCorrectAnswer | null;
  points: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentBankListResponse {
  questions: AssessmentBankQuestion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface AssessmentBankListParams {
  search?: string;
  page?: number;
  limit?: number;
}

/** A per-job assessment question as returned in the full job detail. */
export interface JobAssessmentQuestion {
  id: string;
  sourceBankQuestionId: string | null;
  questionText: string;
  questionType: AssessmentQuestionType;
  options: AssessmentOption[] | null;
  correctAnswer: AssessmentCorrectAnswer | null;
  points: number | null;
  orderIndex: number;
  isRequired: boolean;
}

/** A per-job assessment question sent inside create/update job payloads. */
export interface JobAssessmentQuestionPayload {
  id?: string;
  sourceBankQuestionId?: string;
  questionText: string;
  questionType?: AssessmentQuestionType;
  options?: AssessmentOption[];
  correctAnswer?: AssessmentCorrectAnswer;
  points?: number;
  orderIndex?: number;
  isRequired?: boolean;
  saveToBank?: boolean;
}

/**
 * Candidate-facing assessment question — the answer key (`correctAnswer`) is
 * never sent to candidates, so it is intentionally absent here.
 */
export interface CandidateAssessmentQuestion {
  id: string;
  questionText: string;
  questionType: AssessmentQuestionType;
  options: AssessmentOption[] | null;
  points: number | null;
  orderIndex: number;
  isRequired: boolean;
}

/** A candidate's answer to one assessment question, sent on apply. */
export interface CandidateAssessmentResponseInput {
  jobQuestionId: string;
  answer: {
    selectedOptionIds?: string[];
    text?: string;
  };
}

/**
 * A candidate's stored answer as shown in the recruiter Candidate Detail popup.
 * Recruiter-facing, so it includes the answer key (`correctAnswer`).
 */
export interface CandidateAssessmentResponse {
  id: string;
  jobQuestionId: string | null;
  questionText: string;
  questionType: AssessmentQuestionType;
  options: AssessmentOption[] | null;
  correctAnswer: AssessmentCorrectAnswer | null;
  answer: {
    selectedOptionIds?: string[];
    selectedLabels?: string[];
    text?: string;
  };
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  orderIndex: number;
}

export interface CreateRecruitmentJobPayload {
  title: string;
  description: string;
  companyName: string;
  requirements: string;
  experienceLevel: string;
  industryId: number;
  departmentId: number;
  salaryRangeMin: number;
  salaryRangeMax: number;
  salaryCurrency?: string;
  salaryRangeNotes?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  workType?: string;
  /** Contractual terms. Omitted when the recruiter left it blank. */
  employmentType?: string;
  location?: string;
  /** ISO 3166-1 alpha-2 country codes (required on create). */
  countries: string[];
  responsibilities?: string;
  benefits?: string;
  salaryPeriod?: string;
  creationMethod?: string;
  sourceUrl?: string;
  companyWebsite?: string;
  /** Required for the Flat Referral Model; fees/publish charge computed server-side. */
  flatReferralAmount?: number;
  hasSuccessFee?: boolean;
  successFeeAmount?: number;
  probationPeriodDays?: number;
  /** Connector payout timing — independent of the success fee (Connector Payout step). */
  intPayoutWaits?: boolean;
  extPayoutWaits?: boolean;
  intConnectorPayoutWaitDays?: number;
  extConnectorPayoutWaitDays?: number;
  /** When true, emails members of `organisationIds` about this job. */
  notifyUsers?: boolean;
  organisationIds?: string[];
  /** Whether this job carries assessment/screening questions. */
  hasAssessment?: boolean;
  /** Optional per-job assessment questions (ordered). */
  assessmentQuestions?: JobAssessmentQuestionPayload[];
}

export interface OrganisationOption {
  id: string;
  name: string;
  memberCount: number;
}

export interface OrganisationsListResponse {
  organisations: OrganisationOption[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface OrganisationsListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface NotifyPreviewResponse {
  jobId: string;
  recipientCount: number;
}

export interface RecruitmentJobDetail {
  id: string;
  title: string;
  description: string;
  companyName: string;
  requirements: string;
  experienceLevel: string;
  industryId: number;
  departmentId: number;
  salaryRangeMin: string;
  salaryRangeMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
  salaryRangeNotes: string | null;
  bountyAmount: string;
  providerFee: string;
  processingFee: string;
  totalAmount: string;
  hasSuccessFee: boolean;
  successFeeAmount: string | null;
  probationPeriodDays: number | null;
  intPayoutWaits: boolean | null;
  extPayoutWaits: boolean | null;
  intConnectorPayoutWaitDays: number | null;
  extConnectorPayoutWaitDays: number | null;
  flatReferralAmount: string | null;
  flatDepositFeePercent: string | null;
  flatDepositAmount: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  workType: string | null;
  /** Contractual terms. Null on postings created before the field existed. */
  employmentType: string | null;
  location: string | null;
  /** ISO 3166-1 alpha-2 country codes. */
  countries: string[];
  responsibilities: string | null;
  benefits: string | null;
  companyWebsite: string | null;
  status: string;
  creationMethod: string;
  sourceUrl: string | null;
  requesterId: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedReason?: string | null;
  /** Caller's role on this job. */
  accessRole: RecruitmentAccessRole;
  /** Permission strings the caller holds — gates action buttons in the UI. */
  permissions: string[];
  /** Assessment/screening questions, ordered by the recruiter's sequence. */
  assessmentQuestions: JobAssessmentQuestion[];
}

/** Subset returned by GET /recruitment/jobs/:id?view=pipeline (Kanban header). */
export interface RecruitmentJobPipelineDetail {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  workType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  salaryRangeMin: string;
  salaryRangeMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
  bountyAmount: string;
  /** Drives kanban classification UI gating (Hire/Release/Edit dialogs + Hired-stage CTAs). */
  hasSuccessFee: boolean;
  status: string;
  closedAt?: string;
  closedReason?: string | null;
  /** Caller's role on this job. */
  accessRole: RecruitmentAccessRole;
  /** Permission strings the caller holds — gates action buttons in the UI. */
  permissions: string[];
}

export interface JobCollaborator {
  id: string;
  userId: string;
  roleId: string;
  roleName: string | null;
  status: string;
  invitedBy: string | null;
  notifiedAt: string | null;
  createdAt: string;
  fullName: string | null;
  email: string;
  profilePhotoUrl: string | null;
}

export interface JobCollaboratorsResponse {
  collaborators: JobCollaborator[];
}

export interface EligibleCollaboratorMember {
  id: string;
  fullName: string | null;
  email: string;
  profilePhotoUrl: string | null;
  jobTitle: string | null;
}

export interface EligibleCollaboratorsResponse {
  members: EligibleCollaboratorMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkAddCollaboratorsPayload {
  userIds: string[];
  roleId?: string;
  notify?: boolean;
}

export interface BulkAddCollaboratorsResult {
  added: number;
  skipped: { userId: string; reason: string }[];
}

export interface CollaborationRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface CollaborationRolesResponse {
  roles: CollaborationRole[];
}

export interface UpdateRecruitmentJobPayload {
  title?: string;
  companyName?: string;
  location?: string;
  /** ISO 3166-1 alpha-2 country codes. */
  countries?: string[];
  workType?: string;
  employmentType?: string;
  experienceLevel?: string;
  industryId?: number;
  departmentId?: number;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  companyWebsite?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  salaryRangeMin?: number;
  salaryRangeMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  salaryRangeNotes?: string;
  /**
   * New Flat Referral Fee. When provided, the server recomputes the flat pricing
   * snapshot and applies it job-wide. Rejected (400) on closed jobs.
   */
  flatReferralAmount?: number;
  /**
   * Enable a Success Fee on a job that launched without one (`false → true`).
   * Disabling an existing Success Fee is rejected (400).
   */
  hasSuccessFee?: boolean;
  /**
   * New Success Fee amount (paid 100% to the candidate). Required when enabling;
   * when the fee already exists this re-prices every un-released candidate bonus
   * to the latest value at release. Rejected (400) on closed jobs.
   */
  successFeeAmount?: number;
  /** Probation window (days from hire) before a candidate bonus can be released. */
  probationPeriodDays?: number;
  /** Connector payout timing — editable on open jobs; internal re-enforced server-side. */
  intPayoutWaits?: boolean;
  extPayoutWaits?: boolean;
  intConnectorPayoutWaitDays?: number;
  extConnectorPayoutWaitDays?: number;
  /** Whether this job carries assessment/screening questions. */
  hasAssessment?: boolean;
  /**
   * Full desired set of per-job assessment questions (ordered). When provided,
   * the server diff-syncs. Omit to leave the job's assessment untouched.
   */
  assessmentQuestions?: JobAssessmentQuestionPayload[];
}

export interface CloseRecruitmentJobPayload {
  reason: string;
  sendNotifications?: boolean;
  candidateStageKeys?: string[];
}

export interface ReopenRecruitmentJobPayload {
  sendNotifications?: boolean;
  candidateStageKeys?: string[];
}

/** Response from PATCH /recruitment/jobs/:id/reopen */
export interface ReopenRecruitmentJobResponse {
  id: string;
  status: string;
  closedAt: string | null;
  closedReason?: string | null;
  updatedAt: string;
}

export interface MarketplaceJobListItem {
  id: string;
  title: string;
  companyName: string;
  description: string;
  requirements: string | null;
  location: string | null;
  workType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  salaryRangeMin: string;
  salaryRangeMax: string;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryRangeNotes: string | null;
  bountyAmount: string;
  connectorPayout: string;
  sharerPayout: string;
  requiredSkills: string[] | null;
  preferredSkills: string[] | null;
  responsibilities: string | null;
  benefits: string | null;
  departmentName: string | null;
  industryName: string | null;
  createdAt: string;
  viewCount: number;
}

export interface MarketplaceJobsListResponse {
  jobs: MarketplaceJobListItem[];
  pagination: {
    page: number;
    limit: number;
    totalJobs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface MarketplaceJobsListParams {
  search?: string;
  countries?: string[];
  page?: number;
  limit?: number;
}

export interface FlatReferralFeeParams {
  flatFee: number;
}

export interface FlatReferralFeeResponse {
  flatReferralAmount: number;
  stripeFee: number;
  applicationFee: number;
  total: number;
}

export interface JobShareResponse {
  shareId: string;
  sharerCode: string;
  platform: string;
  shareUrl: string;
}

export interface JobShareItem {
  id: string;
  sharerCode: string;
  platform: string;
  createdAt: string;
  clicksCount: number;
  job: {
    id: string;
    title: string;
    companyName: string;
    bountyAmount: string;
    status: string;
  };
}

export interface MyJobSharesResponse {
  shares: JobShareItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicJobData {
  id: string;
  title: string;
  companyName: string;
  companyWebsite: string | null;
  description: string;
  requirements: string | null;
  responsibilities: string | null;
  benefits: string | null;
  location: string | null;
  workType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  salaryRangeMin: string;
  salaryRangeMax: string;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryRangeNotes: string | null;
  bountyAmount: string;
  hasSuccessFee: boolean;
  successFeeAmount: string | null;
  probationPeriodDays: number | null;
  requiredSkills: string[] | null;
  preferredSkills: string[] | null;
  status: string;
  closedAt: string | null;
  createdAt: string;
  departmentName: string | null;
  industryName: string | null;
  connectorPayout: string;
  sharerPayout: string;
  hasAssessment?: boolean;
  assessmentQuestions?: CandidateAssessmentQuestion[];
}

export interface ApplyToJobPayload {
  jobId: string;
  sharerCode: string;
  /** ISO 3166-1 alpha-2 payout country. Required. */
  country: string;
  linkedinUrl?: string;
  resume: {
    fileName: string;
    filePath: string;
    mimeType: string;
    fileType: string;
    size: number;
    module: string;
  };
  assessmentResponses?: CandidateAssessmentResponseInput[];
}

export interface ApplyToJobResponse {
  id: string;
  anonymousLabel: string;
  message: string;
}

export interface CheckApplicationResponse {
  hasApplied: boolean;
  /** Profile LI, else contact LI from a prior apply — for public apply prefill. */
  suggestedLinkedinUrl?: string | null;
}

export interface JobCandidateItem {
  id: string;
  anonymousLabel: string;
  stage: string;
  stageLabel: string;
  stageOrder: number;
  stageUpdatedAt: string;
  createdAt: string;
  sharerCode: string | null;
  /** AI match score (0–100) from pool match / evaluation when available */
  matchScore?: number | null;
  /** Why the candidate is in Not Qualified (score/screening); null otherwise. */
  notQualifiedReason?: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  /** From resume extraction when available */
  totalYearsExp?: number | null;
  skills?: string[];
  revealedName: string | null;
  revealedEmail: string | null;
  revealedLinkedIn: string | null;
  interview?: {
    scheduledAt: string;
    meetingLink: string | null;
    notes: string | null;
  } | null;
  interviewOutcome?: InterviewOutcome | null;
  /** Drives "Edit Classification" CTA visibility on the kanban card. */
  hasPendingConnectorPayouts?: boolean;
  /** Drives "Release Payout" CTA visibility on the kanban card. */
  hasPendingCandidatePayout?: boolean;
  /** When true, candidate row is in onboarding_pending — show "Awaiting candidate Stripe Connect setup" badge instead of CTA. */
  candidatePayoutOnboardingPending?: boolean;
  /** Any connector payout row exists (any status) — keeps the connector button as a "details" view after release. */
  hasConnectorPayout?: boolean;
  /** Any candidate payout row exists (any status) — keeps the candidate button as a "details" view after release. */
  hasCandidatePayout?: boolean;
  /** A connector payout failed (recoverable) — show "Payout Failed" badge + "Retry Payout". */
  hasFailedConnectorPayout?: boolean;
  /** A candidate payout failed (recoverable) — show "Payout Failed" badge + "Retry Payout". */
  hasFailedCandidatePayout?: boolean;
  /** A connector payout needs manual review (non-recoverable) — badge only, no retry. */
  hasManualReviewConnectorPayout?: boolean;
  /** A candidate payout needs manual review (non-recoverable) — badge only, no retry. */
  hasManualReviewCandidatePayout?: boolean;
  /**
   * Rejected only: true when stage history includes a recruiter happy-path stage
   * so Move Back has at least one selectable target (not screening-only rejects).
   */
  canReinstate?: boolean;
}

export interface MarkInterviewOutcomePayload {
  outcome: InterviewOutcome;
  comment?: string;
  completedComment?: string;
}

export interface ConnectorClassificationInput {
  connectorUserId: string;
  classificationType: "internal" | "external";
  isActiveEmployee?: boolean;
}

export interface HireCandidatePayload {
  hireDate: string; // ISO date
  classifications: ConnectorClassificationInput[];
}

export interface UpdateClassificationPayload {
  classifications: ConnectorClassificationInput[];
}

// Which payout type a release/cancel action targets.
export type PayoutScope = "connector" | "candidate";

// Recruiter-selectable reasons when cancelling the CANDIDATE bonus.
// Mirrors the server's RECRUITER_SELECTABLE_CANCELLATION_REASONS.
export type RecruiterCancellationReason =
  | "candidate_failed_probation"
  | "candidate_left_voluntarily"
  | "position_unavailable"
  | "performance_issues"
  | "other";

// Recruiter-selectable reasons when cancelling a CONNECTOR payout.
// Mirrors the server's RECRUITER_SELECTABLE_CONNECTOR_CANCELLATION_REASONS.
export type ConnectorCancellationReason =
  | "invalid_duplicate_referral"
  | "connector_unresponsive"
  | "policy_violation"
  | "other";

export type PayoutCancellationReason =
  | RecruiterCancellationReason
  | ConnectorCancellationReason
  | "not_retained"
  | "inactive_employee"
  | null;

export interface ReleasePayoutPayload {
  // Connector payouts and the candidate bonus are released/cancelled separately.
  scope: PayoutScope;
  retained: boolean;
  classifications?: ConnectorClassificationInput[];
  // Required when retained=false. Server validates both fields are present and
  // that the reason matches `scope`.
  cancellationReason?:
    | RecruiterCancellationReason
    | ConnectorCancellationReason;
  cancellationNotes?: string;
}

// Per-row state for the Release / Edit dialogs.
// `pending` means the recruiter still has a decision to make on this row;
// any other status renders as a read-only status pill.
export type PayoutRowStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "cancelled"
  | "failed"
  | "manual_review"
  | "onboarding_pending";

/** Client-safe failure reason — the server never sends raw error text. */
export type PayoutFailureReason =
  | "transfer_failed"
  | "recipient_setup_incomplete"
  | "needs_review";

export interface PayoutRowState {
  id: string;
  status: PayoutRowStatus;
  /** Client-safe failure reason; null unless the row failed/needs review. */
  failureReason: PayoutFailureReason | null;
  recipientAmount: string;
  outboundPaymentId: string | null;
  cancellationReason: PayoutCancellationReason;
  /** Free-form notes written by the recruiter when cancelling. Null for system-cancelled rows. */
  cancellationNotes: string | null;
  /** Server-evaluated gate. False → disable the Release button for this row. */
  canReleaseNow: boolean;
  /**
   * When this row's gating window ends, or null when paid on hire / already
   * elapsed. Connector rows → per-type connector wait; candidate row → probation.
   */
  waitEndsAt: string | null;
  /**
   * Extra amount HR will be charged at release to cover a Flat Referral Fee
   * raised after this candidate was hired (so the connector is paid the latest
   * fee). A 2-decimal dollar string; null for candidate-bonus rows, non-flat
   * jobs, and unchanged/lowered fees. Display-only — the server recomputes and
   * charges the real amount at release.
   */
  connectorTopUp: string | null;
  /**
   * Extra amount HR will be charged at release to cover a Success Fee raised (or
   * enabled) after this candidate was charged, so the candidate is paid the latest
   * fee. A 2-decimal dollar string; null for connector rows, unchanged/lowered
   * fees, and frozen rows. Display-only — the server recomputes it at release.
   */
  candidateTopUp: string | null;
  /** When the Stripe transfer completed (null until paid). Drives "Released <date>". */
  completedAt: string | null;
  /** Last action timestamp — used as "Cancelled on <date>" for cancelled rows. */
  updatedAt: string | null;
}

export interface PayoutStateConnector {
  connectorUserId: string;
  name: string;
  role: "primary" | "claimer" | "sharer";
  classificationType: "internal" | "external" | null;
  isActiveEmployee: boolean | null;
  avatar: string | null;
  jobTitle: string | null;
  company: string | null;
  linkedinUrl: string | null;
  payout: PayoutRowState | null;
}

/**
 * Top-ups already collected for this candidate — set once the Pay step of the
 * two-step release has succeeded. A fee can be raised repeatedly before the
 * payout is released, so `amount` is the SUM of every top-up taken and `paidAt`
 * is the most recent one. It does not mean nothing more is owed: the rows'
 * `connectorTopUp` / `candidateTopUp` carry any outstanding shortfall.
 */
export interface PayoutTopUpFunded {
  amount: string;
  paidAt: string | null;
}

export interface CandidatePayoutState {
  candidateId: string;
  candidateLabel: string;
  hireDate: string | null;
  probationPeriodDays: number | null;
  probationEndsAt: string | null;
  intConnectorPayoutWaitDays: number | null;
  extConnectorPayoutWaitDays: number | null;
  intPayoutWaits: boolean;
  extPayoutWaits: boolean;
  connectors: PayoutStateConnector[];
  candidatePayout: PayoutRowState | null;
  /** Total connector fee top-ups collected, or null when none have been. */
  connectorTopUpFunded: PayoutTopUpFunded | null;
  /** Total candidate success-fee top-ups collected, or null. */
  candidateTopUpFunded: PayoutTopUpFunded | null;
}

/** Response of the Pay step — POST /recruitment/payout/:candidateId/fund. */
export interface FundPayoutPayload {
  scope: PayoutScope;
}

export interface FundPayoutTopUpResponse {
  candidateId: string;
  scope: PayoutScope;
  /** False on an idempotent replay or when nothing was owed. */
  charged: boolean;
  amount: string | null;
  paidAt: string | null;
}

export interface JobCandidatesResponse {
  candidates: JobCandidateItem[];
}

export interface JobCandidatesParams {
  search?: string;
  stage?: string;
}

export interface MyApplicationsParams {
  page?: number;
  limit?: number;
  status?: string;
}

/** The candidate's own bonus (success-fee payout) for an application, if any. */
export interface ApplicationBonus {
  id: string;
  amount: string | null;
  currency: string;
  status: string;
  processingStatus: string;
}

export interface MyApplicationItem {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  description: string;
  location: string;
  workType: string;
  employmentType?: string | null;
  experienceLevel: string;
  salaryRange: { min: number; max: number; currency?: string };
  salaryPeriod: string;
  salaryCurrency?: string;
  status: string;
  appliedAt: string;
  lastUpdatedAt: string;
  timeline: Array<{ status: string; date: string; note: string }>;
  interviewMeetingDate: string | null;
  interviewMeetingDuration: number | null;
  interviewMeetingPlatform: string | null;
  interviewMeetingLink: string | null;
  // Skill matching properties
  matchScore?: string;
  matchedSkills?: string[] | null;
  missingSkills?: string[] | null;
  analysisAt?: string;
  analysisStatus?: "pending" | "completed" | "failed";
  evaluationRetryCount: number;
  bonus?: ApplicationBonus | null;
  gapAnalysis?:
    | import("@/lib/recruitment/gap-analysis.types").GapAnalysisPayload
    | null;
}

export interface MyApplicationsResponse {
  applications: MyApplicationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Job Pool Matches types
export interface JobPoolUploadJobItem {
  type: "upload_job";
  uploadJobId: string;
  fileName: string;
  status: "queued" | "processing" | "failed";
  failureReason: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobPoolMatchLinkedUploadJob {
  uploadJobId: string;
  fileName: string;
  retryCount: number;
  failureReason: string | null;
}

export interface JobPoolMatchCandidate {
  type?: "pool_match";
  matchId: string;
  contactId: number;
  candidateName: string;
  candidateEmail: string | null;
  candidateTitle: string | null;
  candidateCompany: string | null;
  matchScore: string;
  status: string;
  source: string;
  failureReason: string | null;
  cosineSimilarity: string | null;
  llmScore: string | null;
  matchedSignals: string[];
  concerns: string[];
  consentDeclineReason: string | null;
  consentDeclineNotes: string | null;
  connectorDeclineReason: string | null;
  connectorDeclinedAt: string | null;
  consentRespondedAt: string | null;
  matchedAt: string;
  isClaimedByOther: boolean;
  linkedUploadJob?: JobPoolMatchLinkedUploadJob | null;
  resumeFileName?: string | null;
  gapAnalysis?:
    | import("@/lib/recruitment/gap-analysis.types").GapAnalysisPayload
    | null;
}

export interface JobPoolMatchJob {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobLocation: string | null;
  bountyAmount: string;
  jobDescription: string;
  jobRequiredSkills: string[] | null;
  jobPreferredSkills: string[] | null;
  jobSalaryRangeMin: string;
  jobSalaryRangeMax: string;
  jobSalaryCurrency: string | null;
  jobSalaryPeriod: string | null;
  jobPostedAt: string;
  // Inbox is jobs-only; candidate detail loads lazily via the per-job board.
  candidateCount: number;
  myReferCount?: number;
  hasSharedLink?: boolean;
  connectorPayout?: string;
  sharerPayout?: string;
}

export interface JobPoolMatchesResponse {
  jobs: JobPoolMatchJob[];
  pagination: {
    page: number;
    limit: number;
    totalJobs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface JobPoolMatchesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ClosedJobPoolMatchJob extends Omit<
  JobPoolMatchJob,
  "candidateCount"
> {
  candidates: JobPoolMatchCandidate[];
  closedAt: string;
  closedReason: string | null;
}

export interface ClosedJobPoolMatchesResponse {
  jobs: ClosedJobPoolMatchJob[];
  pagination: {
    page: number;
    limit: number;
    totalJobs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface RetryCandidateEvaluationResponse {
  candidateId: string;
  message: string;
}

// Consent types
export interface ConsentPageData {
  status:
    | "pending"
    | "expired"
    | "invalid"
    | "declined"
    | "accepted"
    | "superseded";
  closedAt?: string | null;
  closedReason?: string | null;
  job?: {
    id: string;
    title: string;
    companyName: string;
    companyWebsite: string | null;
    description: string;
    requirements: string | null;
    responsibilities: string | null;
    benefits: string | null;
    location: string | null;
    workType: string | null;
    experienceLevel: string | null;
    salaryRangeMin: string;
    salaryRangeMax: string;
    salaryCurrency: string | null;
    salaryPeriod: string | null;
    salaryRangeNotes: string | null;
    requiredSkills: string[] | null;
    preferredSkills: string[] | null;
    hasSuccessFee: boolean;
    successFeeAmount: string | null;
    probationPeriodDays: number | null;
    industryName: string | null;
    departmentName: string | null;
    createdAt: string;
  };
  connectorName?: string;
  jobClosed?: boolean;
  source?: "ai_matched" | "connector_uploaded";
  contactHasLinkedin?: boolean;
  /** Resume-extracted LinkedIn for autofill; candidate confirms on apply. */
  suggestedLinkedinUrl?: string | null;
  hasAssessment?: boolean;
  assessmentQuestions?: CandidateAssessmentQuestion[];
}

export interface ConsentApplyPayload {
  token: string;
  /** ISO 3166-1 alpha-2 payout country. Required. */
  country: string;
  linkedinUrl?: string;
  resumeMediaId?: string;
  resume?: {
    fileName: string;
    filePath: string;
    mimeType: string;
    fileType: string;
    size: number;
    module: string;
  };
  assessmentResponses?: CandidateAssessmentResponseInput[];
}

export interface DeclineConsentPayload {
  token: string;
  reason: string;
  notes?: string;
}

// Connector Pipeline types
export interface ConnectorPipelineCandidate {
  id: string;
  candidateName: string;
  candidateEmail: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  stage: string;
  stageUpdatedAt: string;
  jobTitle: string;
  jobCompany: string;
  bountyAmount: number;
  matchScore: number | null;
  consentSentAt: string | null;
  consentAcceptedAt: string | null;
  consentDeclinedReason: string | null;
  rejectionReason: string | null;
  notQualifiedReason: string | null;
  interviewScheduledAt: string | null;
  interviewCompletedAt: string | null;
  inviteSentAt?: string | null;
  source?: "consent" | "direct_application";
  isSplit?: boolean;
  matchId?: string | null;
  contactId?: number | null;
  poolSource?: string | null;
  resumeFileName?: string | null;
  matchedAt?: string | null;
  matchedSignals?: string[];
  concerns?: string[];
  gapAnalysis?: unknown;
  // Connector-side view of THIS connector's payout row for the candidate.
  // Null when no payout row exists yet (e.g. pre-Hired stages).
  payoutStatus: string | null;
  payoutCancellationReason: PayoutCancellationReason;
  payoutCancellationNotes: string | null;
}

// Per-job board: pre-referral pool candidates + referred candidates.
export interface ConnectorJobBoardResponse {
  jobTitle: string;
  jobCompany: string;
  jobLocation: string | null;
  bountyAmount: string;
  jobSalaryRangeMin: string;
  jobSalaryRangeMax: string;
  jobSalaryCurrency: string | null;
  jobSalaryPeriod: string | null;
  myReferCount?: number;
  hasSharedLink?: boolean;
  connectorPayout?: string;
  sharerPayout?: string;
  poolItems: Array<JobPoolMatchCandidate | JobPoolUploadJobItem>;
  referred: ConnectorPipelineCandidate[];
}

export interface CandidatePipelineStep {
  step: string;
  label: string;
  status: "completed" | "current" | "pending" | "skipped";
  completedAt: string | null;
}

export interface CandidateTransactionSummary {
  bountyAmount: string;
  providerFee: string;
  processingFee: string;
  totalAmount: string;
  /** Full flat referral fee incl. fees (server-computed). */
  fullReferralAmount: string;
  /** Deposit portion already paid at shortlist (server-computed; "0.00" if none). */
  flatDepositApplied: string;
  /** Fee top-up captured after hire when the fee was raised (server-computed; "0.00" if none). */
  flatTopUpApplied: string;
  chargeAmount: string | null;
  receiptUrl: string | null;
  status: string;
  authorizedAt: string | null;
  capturedAt: string | null;
  cancelledAt: string | null;
}

export interface CandidateConnectorRecord {
  connectorUserId: string;
  role: "primary" | "claimer" | "sharer" | string;
  sharePercent: string;
  classificationType: "internal" | "external" | null;
  isActiveEmployee: boolean | null;
  name: string;
  email: string | null;
  avatar: string | null;
  jobTitle: string | null;
  company: string | null;
  linkedinUrl: string | null;
}

export interface CandidateDetailResponse {
  id: string;
  anonymousLabel: string;
  stage: string;
  stageLabel: string;
  stageOrder: number;
  stageUpdatedAt: string;
  createdAt: string;
  hireDate: string | null;
  connectors: CandidateConnectorRecord[];
  skills: string[];
  currentTitle: string | null;
  currentCompany: string | null;
  /** Server-decided: whether the caller may see the candidate's full details. */
  detailsRevealed: boolean;
  revealedName: string | null;
  revealedEmail: string | null;
  revealedLinkedIn: string | null;
  /**
   * Whether the caller may view the original resume. The URL itself is minted
   * on demand (short-lived presigned GET) via `getResumeUrl`, never embedded here.
   */
  hasResume: boolean;
  resumeFileName: string | null;
  referrer: {
    name: string;
    avatar: string | null;
  } | null;
  interview: {
    scheduledAt: string;
    meetingLink: string | null;
    notes: string | null;
  } | null;
  pipelineSteps: CandidatePipelineStep[];
  rejection?: {
    category: string | null;
    note: string | null;
    rejectedAt: string;
    rejectedBy: {
      name: string;
      email: string | null;
      avatar: string | null;
    } | null;
  } | null;
  transaction: CandidateTransactionSummary | null;
  // Resume profile data
  resumeJobTitle: string | null;
  totalYearsExp: number | null;
  aiSummary: string | null;
  resumeMetadata: {
    projects?: Array<{
      name: string;
      role: string;
      toolsUsed?: string | string[];
      skillsUsed?: string | string[];
      description?: string;
      isHighlighted?: boolean;
      durationMonths?: number;
    }>;
    education?: Array<{
      year?: number;
      field?: string;
      degree?: string;
      institution?: string;
    }>;
    languages?: Array<
      | string
      | {
          language?: string;
          proficiency?: string;
        }
    >;
    jobHistory?: Array<{
      title: string;
      company: string;
      endDate?: string;
      isCurrent?: boolean;
      startDate?: string;
    }>;
    certifications?: Array<
      | string
      | {
          name?: string;
          issuer?: string | null;
          year?: number | string;
        }
    >;
    domainExpertise?: string[];
    tools?: string[];
    technologies?: string[];
    /** Legacy extraction shape */
    toolsTechnologies?: string[];
  } | null;
  // Skill matching / evaluation
  matchScore?: number | null;
  matchedSkills?: string[] | null;
  missingSkills?: string[] | null;
  analysisAt?: string | null;
  analysisStatus?: "pending" | "completed" | "failed" | null;
  analysisNote?: string | null;
  gapAnalysis?:
    | import("@/lib/recruitment/gap-analysis.types").GapAnalysisPayload
    | null;
  /** Candidate's screening answers; empty/absent when the job has no assessment. */
  assessmentResponses?: CandidateAssessmentResponse[];
}

export type ResumeMetadata = NonNullable<
  CandidateDetailResponse["resumeMetadata"]
>;

export interface CandidateResumeUrlResponse {
  /** Short-lived presigned S3 GET URL for the original resume. */
  url: string;
  fileName: string | null;
  /** URL lifetime in seconds (matches server TTL). */
  expiresIn: number;
}

export interface RejectCandidatePayload {
  category: string;
  note?: string;
}

/** One selectable row in the "Move Back to Stage" dropdown. */
export interface ReinstateStageOption {
  stageKey: string;
  label: string;
  /** False when the stage was reached but is a dead end — render it disabled. */
  available: boolean;
  /** Why the option is disabled; shown next to it. */
  unavailableReason: string | null;
}

/**
 * Server-derived allow-list for moving a rejected candidate back. The list only
 * ever contains stages this candidate ACTUALLY held, capped at the stage they
 * were rejected from. Never build this list on the client.
 */
export interface ReinstateOptionsResponse {
  candidateId: string;
  currentStageKey: string | null;
  rejectedFromStageKey: string | null;
  options: ReinstateStageOption[];
}

export interface ReinstateCandidatePayload {
  targetStageKey: string;
}

export interface ReinstateCandidateResponse {
  candidateId: string;
  stageKey: string;
  stageLabel: string;
  message: string;
}

/** Flat-referral display amounts, computed server-side. */
export interface FlatBreakdown {
  flatReferralFee: number;
  fullChargeWithFees: number;
  thisCandidateAlreadyCharged: boolean;
  /** The referral fee leg only — NOT the full card charge. */
  amountDueAtHire: number;
  successFeeAmount: number;
  successFeeAlreadyCharged: boolean;
  /** The success fee leg — a second, separate Stripe charge at hire. */
  successFeeDueAtHire: number;
  /** What the card is actually charged: referral + success fee. Use for display. */
  totalDueAtHire: number;
}

export interface ShortlistBreakdownResponse {
  jobTitle: string;
  candidateLabel: string;
  bountyAmount: number;
  providerFee: number;
  processingFee: number;
  totalAmount: number;
  paymentMethod: { brand: string; last4: string } | null;
  probationPeriodDays: number | null;
  flat: FlatBreakdown;
}

export interface ExtractedJobData {
  title: string;
  companyName: string;
  industry: string;
  department: string;
  experienceLevel: string;
  workType: string;
  /** Contractual terms — "" when the document did not state them. */
  employmentType: string;
  location: string;
  description: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
  requiredSkills: string[];
  preferredSkills: string[];
  salaryRangeMin: number;
  salaryRangeMax: number;
}

// Marketplace-split origin lookup for the post-welcome popup decision.
export interface ConnectorOriginForMeResponse {
  hasOrigin: boolean;
  jobId?: string;
  jobTitle?: string;
  jobStatus?: string;
}

// Overloaded getJob function for proper type narrowing
function getJob(
  jobId: string,
  params: { view: "pipeline" }
): Promise<RecruitmentJobPipelineDetail>;
function getJob(
  jobId: string,
  params?: { view?: "full" }
): Promise<RecruitmentJobDetail>;
function getJob(
  jobId: string,
  params?: { view?: "full" | "pipeline" }
): Promise<RecruitmentJobPipelineDetail | RecruitmentJobDetail> {
  const searchParams = new URLSearchParams();
  if (params?.view === "pipeline") {
    searchParams.set("view", "pipeline");
  }
  const qs = searchParams.toString();
  const path = `/recruitment/jobs/${jobId}${qs ? `?${qs}` : ""}`;
  return params?.view === "pipeline"
    ? request<RecruitmentJobPipelineDetail>(path)
    : request<RecruitmentJobDetail>(path);
}

export const recruitmentApi = {
  getMyApplications: (params?: MyApplicationsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    return request<MyApplicationsResponse>(
      `/recruitment/my-applications${qs ? `?${qs}` : ""}`
    );
  },

  retryCandidateEvaluation: (candidateId: string) =>
    request<RetryCandidateEvaluationResponse>(
      `/recruitment/my-applications/${candidateId}/retry-evaluation`,
      { method: "POST" }
    ),

  getRecruitmentStages: () =>
    request<RecruitmentStage[]>("/recruitment/master-data/recruitment-stages"),

  getIndustries: (search?: string) =>
    request<Industry[]>(
      `/recruitment/master-data/industries${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),

  getDepartments: (search?: string) =>
    request<Department[]>(
      `/recruitment/master-data/departments${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),

  createJob: (payload: CreateRecruitmentJobPayload) =>
    request("/recruitment/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getJobs: (params?: JobsListParams) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    const countries = params?.countries
      ? getCountriesQueryValue(params.countries)
      : null;
    if (countries) {
      searchParams.set("countries", countries);
    }
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return request<JobsListResponse>(`/recruitment/jobs${qs ? `?${qs}` : ""}`);
  },

  getJob,

  updateJob: (jobId: string, payload: UpdateRecruitmentJobPayload) =>
    request(`/recruitment/jobs/${jobId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  closeJob: (jobId: string, payload: CloseRecruitmentJobPayload) =>
    request(`/recruitment/jobs/${jobId}/close`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  reopenJob: (jobId: string, payload?: ReopenRecruitmentJobPayload) =>
    request<ReopenRecruitmentJobResponse>(`/recruitment/jobs/${jobId}/reopen`, {
      method: "PATCH",
      body: JSON.stringify(payload ?? {}),
    }),

  getJobStats: () => request<JobStatsResponse>("/recruitment/jobs/stats"),

  // ── Assessment question bank (per-recruiter) ──────────────────────────────
  listAssessmentBank: (params?: AssessmentBankListParams) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return request<AssessmentBankListResponse>(
      `/recruitment/assessment-bank${qs ? `?${qs}` : ""}`
    );
  },

  /** Case-insensitive check: does this text already exist in the user's bank? */
  assessmentBankQuestionExists: (questionText: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set("questionText", questionText);
    return request<{ exists: boolean }>(
      `/recruitment/assessment-bank/exists?${searchParams.toString()}`
    );
  },

  getJobCollaborators: (jobId: string) =>
    request<JobCollaboratorsResponse>(
      `/recruitment/jobs/${jobId}/collaborators`
    ),

  getCollaborationRoles: (jobId: string) =>
    request<CollaborationRolesResponse>(
      `/recruitment/jobs/${jobId}/collaborators/roles`
    ),

  getEligibleCollaborators: (
    jobId: string,
    params?: { search?: string; page?: number; limit?: number }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return request<EligibleCollaboratorsResponse>(
      `/recruitment/jobs/${jobId}/collaborators/eligible${qs ? `?${qs}` : ""}`
    );
  },

  bulkAddJobCollaborators: (
    jobId: string,
    payload: BulkAddCollaboratorsPayload
  ) =>
    request<BulkAddCollaboratorsResult>(
      `/recruitment/jobs/${jobId}/collaborators/bulk`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  removeJobCollaborator: (jobId: string, collaboratorUserId: string) =>
    request(`/recruitment/jobs/${jobId}/collaborators/${collaboratorUserId}`, {
      method: "DELETE",
    }),

  getOrganisations: (params?: OrganisationsListParams) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return request<OrganisationsListResponse>(
      `/recruitment/organisations${qs ? `?${qs}` : ""}`
    );
  },

  getNotifyPreview: (jobId: string, organisationIds: string[]) => {
    const qs = new URLSearchParams({
      organisationIds: organisationIds.join(","),
    }).toString();
    return request<NotifyPreviewResponse>(
      `/recruitment/jobs/${jobId}/notify/preview?${qs}`
    );
  },

  sendJobNotification: (jobId: string, organisationIds: string[]) =>
    request(`/recruitment/jobs/${jobId}/notify`, {
      method: "POST",
      body: JSON.stringify({ organisationIds }),
    }),

  getMarketplaceJobs: (params?: MarketplaceJobsListParams) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    const countries = params?.countries
      ? getCountriesQueryValue(params.countries)
      : null;
    if (countries) {
      searchParams.set("countries", countries);
    }
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return request<MarketplaceJobsListResponse>(
      `/recruitment/marketplace${qs ? `?${qs}` : ""}`
    );
  },

  getFlatReferralFee: (params: FlatReferralFeeParams) => {
    const searchParams = new URLSearchParams({
      flatFee: String(params.flatFee),
    });
    return request<FlatReferralFeeResponse>(
      `/recruitment/interview-cost/flat-referral/calculate?${searchParams.toString()}`
    );
  },

  shareJob: (data: { jobId: string; platform: string }) =>
    request<JobShareResponse>("/recruitment/marketplace/share", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyJobShares: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return request<MyJobSharesResponse>(
      `/recruitment/marketplace/my-job-shares${qs ? `?${qs}` : ""}`
    );
  },

  getPublicJob: (jobId: string, ref?: string, includeClosed?: boolean) => {
    const params = new URLSearchParams();
    if (ref) params.set("ref", ref);
    if (includeClosed) params.set("includeClosed", "true");
    const qs = params.toString();
    return request<PublicJobData>(
      `/recruitment/jobs/public/${jobId}${qs ? `?${qs}` : ""}`
    );
  },

  applyToJob: (payload: ApplyToJobPayload) =>
    request<ApplyToJobResponse>("/recruitment/candidates/apply", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  checkApplication: (jobId: string) =>
    request<CheckApplicationResponse>(
      `/recruitment/candidates/check?jobId=${encodeURIComponent(jobId)}`
    ),

  getJobCandidates: (jobId: string, params?: JobCandidatesParams) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.stage) searchParams.set("stage", params.stage);
    const qs = searchParams.toString();
    return request<JobCandidatesResponse>(
      `/recruitment/candidates/job/${jobId}${qs ? `?${qs}` : ""}`
    );
  },

  getJobPoolMatches: (params?: JobPoolMatchesParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return request<JobPoolMatchesResponse>(
      `/recruitment/job-pool-matches${qs ? `?${qs}` : ""}`
    );
  },

  getClosedJobPoolMatches: (params?: JobPoolMatchesParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return request<ClosedJobPoolMatchesResponse>(
      `/recruitment/job-pool-matches/closed${qs ? `?${qs}` : ""}`
    );
  },

  approveJobPoolMatch: (matchId: string) =>
    request(`/recruitment/job-pool-matches/${matchId}/approve`, {
      method: "PATCH",
    }),

  declineJobPoolMatch: (matchId: string, reason?: string) =>
    request(`/recruitment/job-pool-matches/${matchId}/decline`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),

  getPoolMatchResumeUrl: (matchId: string) =>
    request<{ url: string; fileName: string | null; expiresIn: number }>(
      `/recruitment/job-pool-matches/${matchId}/resume`
    ),

  sendConsent: (matchId: string) =>
    request(`/recruitment/consent/${matchId}/send`, {
      method: "PATCH",
    }),

  resendConsent: (matchId: string) =>
    request(`/recruitment/consent/${matchId}/resend`, {
      method: "PATCH",
    }),

  getConsentEmail: (matchId: string) =>
    request<{ email: string; matchId: string }>(
      `/recruitment/consent/${matchId}/consent-email`
    ),

  updateConsentEmail: (matchId: string, email: string) =>
    request<{
      message: string;
      candidateName: string;
      email: string;
      matchId: string;
      linkedExistingContact: boolean;
    }>(`/recruitment/consent/${matchId}/consent-email`, {
      method: "PATCH",
      body: JSON.stringify({ email }),
    }),

  verifyConsentToken: (token: string) =>
    request<ConsentPageData>(`/recruitment/consent/verify/${token}`),

  declineConsent: (payload: DeclineConsentPayload) =>
    request("/recruitment/consent/decline", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  consentApply: (payload: ConsentApplyPayload) =>
    request<ApplyToJobResponse>("/recruitment/consent/apply", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCandidateDetail: (candidateId: string) =>
    request<CandidateDetailResponse>(`/recruitment/candidates/${candidateId}`),

  // Mints a fresh short-lived presigned URL for the candidate's resume. Fetched
  // on demand (not cached in the detail payload) so the URL never goes stale.
  getResumeUrl: (candidateId: string) =>
    request<CandidateResumeUrlResponse>(
      `/recruitment/candidates/${candidateId}/resume`
    ),

  rejectCandidate: (candidateId: string, payload: RejectCandidatePayload) =>
    request(`/recruitment/candidate-workflow/${candidateId}/reject`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // Reinstate — move a REJECTED candidate back to an earlier stage. Purely a
  // stage move: the server performs no charge and no refund.
  getReinstateOptions: (candidateId: string) =>
    request<ReinstateOptionsResponse>(
      `/recruitment/candidate-workflow/${candidateId}/reinstate-options`
    ),

  reinstateCandidate: (
    candidateId: string,
    payload: ReinstateCandidatePayload
  ) =>
    request<ReinstateCandidateResponse>(
      `/recruitment/candidate-workflow/${candidateId}/reinstate`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    ),

  getShortlistBreakdown: (candidateId: string) =>
    request<ShortlistBreakdownResponse>(
      `/recruitment/interview-cost/shortlist-breakdown/${candidateId}`
    ),

  shortlistCandidate: (candidateId: string) =>
    request(`/recruitment/candidate-workflow/${candidateId}/shortlist`, {
      method: "PATCH",
    }),

  ...connectorPipelineApi,

  ...recruitmentResumeSearchApi,
  ...recruitmentCandidateSearchApi,

  sendInterviewInvite: (
    candidateId: string,
    payload?: {
      interviewNotes?: string;
      availability?: { startTime: string; endTime: string; timezone: string };
    }
  ) =>
    request(
      `/recruitment/candidate-workflow/${candidateId}/send-interview-invite`,
      {
        method: "PATCH",
        body: JSON.stringify(payload ?? {}),
      }
    ),

  getInterviewBookingAvailability: (candidateId: string, token: string) =>
    request(
      `/recruitment/interview-booking/${candidateId}/${token}/availability`,
      { skipAutoRefresh: true }
    ),

  extractJobFromFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<ExtractedJobData>("/recruitment/job-extraction/extract", {
      method: "POST",
      body: formData,
    });
  },

  extractJobFromUrl: (url: string) =>
    request<ExtractedJobData>("/recruitment/job-extraction/extract-url", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  generateJobDescription: (data: {
    title: string;
    industryName?: string;
    departmentName?: string;
    experienceLevel: string;
    workType: string;
    location: string;
    requiredSkills: string[];
    preferredSkills: string[];
  }) =>
    request<
      Pick<
        ExtractedJobData,
        "description" | "requirements" | "responsibilities" | "benefits"
      >
    >("/recruitment/job-extraction/generate-with-ai", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  confirmInterviewBooking: (
    candidateId: string,
    token: string,
    payload: {
      selectedSlot: { start: string; end: string };
      timezone: string;
      requesterTimezone: string;
    }
  ) =>
    request(`/recruitment/interview-booking/${candidateId}/${token}/confirm`, {
      method: "POST",
      body: JSON.stringify(payload),
      skipAutoRefresh: true,
    }),

  markInterviewOutcome: (
    candidateId: string,
    payload: MarkInterviewOutcomePayload
  ) =>
    request(`/recruitment/payout/${candidateId}/interview-outcome`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  hireCandidate: (candidateId: string, payload: HireCandidatePayload) =>
    request(`/recruitment/candidate-workflow/${candidateId}/hire`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateCandidateClassification: (
    candidateId: string,
    payload: UpdateClassificationPayload
  ) =>
    request(`/recruitment/candidate-workflow/${candidateId}/classification`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  /**
   * Pay step of the two-step release: collects the post-hire fee top-up ONLY —
   * no payout is sent. Safe to call twice (the server is idempotent per
   * candidate); `charged: false` means a previous call already collected it.
   */
  fundCandidatePayoutTopUp: (candidateId: string, payload: FundPayoutPayload) =>
    request<FundPayoutTopUpResponse>(
      `/recruitment/payout/${candidateId}/fund`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  releaseCandidatePayouts: (
    candidateId: string,
    payload: ReleasePayoutPayload
  ) =>
    request(`/recruitment/payout/${candidateId}/release`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Drives both Release Payout + Edit Classification dialogs. Returns
  // per-connector + candidate-row payout state plus probation eligibility.
  getCandidatePayoutState: (candidateId: string) =>
    request<CandidatePayoutState>(`/recruitment/payout/${candidateId}/state`),

  ...recruitmentConnectorUploadApi,

  // Marketplace-split origin lookup for the post-welcome popup
  getConnectorOriginForMe: () =>
    request<ConnectorOriginForMeResponse>("/recruitment/connector-origins/me", {
      method: "GET",
    }),
};
