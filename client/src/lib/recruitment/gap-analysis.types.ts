export type GapDimensionKey =
  | "skillsMatch"
  | "experienceMatch"
  | "educationMatch"
  | "domainKnowledge"
  | "workEligibility"
  | "employmentTypeCompatibility";

export type GapChipStatus = "ok" | "partial" | "gap";

export type GapBadgeStatus = "ok" | "partial" | "gap";

export interface GapChip {
  label: string;
  status: GapChipStatus;
}

export interface GapDimensionBadge {
  label: string;
  status: GapBadgeStatus;
}

export interface ExperienceBarRow {
  label: string;
  value: string;
  valueStatus: GapChipStatus;
  fillPercent: number;
  fillStatus: GapChipStatus;
  reqMarkPercent?: number;
}

export interface ExperienceDetail {
  type: "experience";
  bars: ExperienceBarRow[];
  note?: string;
}

export interface VsSide {
  kicker: string;
  title: string;
  subtitle?: string;
  isRequirement?: boolean;
}

export interface VsCompareDetail {
  type: "vs";
  left: VsSide;
  right: VsSide;
  compareStatus: GapBadgeStatus;
  facts?: GapChip[];
}

export interface FactsDetail {
  type: "facts";
  facts: GapChip[];
}

export type GapDimensionDetail =
  | ExperienceDetail
  | VsCompareDetail
  | FactsDetail;

export interface GapDimension {
  key: GapDimensionKey;
  title: string;
  subtitle: string;
  badge: GapDimensionBadge;
  matched: GapChip[];
  gaps: GapChip[];
  detail?: GapDimensionDetail;
}

export interface GapAnalysisCandidate {
  name: string;
  company: string;
  processedAt?: string;
  experienceSummary?: string;
  location?: string;
  initials?: string;
}

export type ScoreBreakdownReconciliation = "exact" | "rescaled";

export interface ScoreBreakdownDimension {
  key: GapDimensionKey;
  /** Fixed weight for this dimension in the attribution model. */
  weight: number;
  pointsEarned: number;
  pointsLost: number;
  reason: string;
}

/**
 * Explains how the overall match score is distributed across the six
 * dimensions. Absent on rows that were never annotated.
 */
export interface ScoreBreakdown {
  version: string;
  source: string;
  generatedAt: string;
  model: string;
  totalScore: number;
  lostPoints: number;
  reconciled: ScoreBreakdownReconciliation;
  dimensions: ScoreBreakdownDimension[];
  topReasons: string[];
}

export interface GapAnalysisPayload {
  matchScore: number;
  verdict: string;
  verdictStatus: GapBadgeStatus;
  candidate: GapAnalysisCandidate;
  dimensions: GapDimension[];
  scoreBreakdown?: ScoreBreakdown | null;
}

export interface GapAnalysisFallbackSignals {
  strengths: string[];
  concerns: string[];
}
