import type {
  CandidateGapAnalysisResult,
  GapAnalysisStored,
} from "./candidate-evaluation-gap-analysis.schema";
import type { ScoreBreakdown } from "./gap-analysis-score-breakdown.types";
import {
  currentCompanyFromResumeMetadata,
  formatExperienceSummary,
  locationFromResumeMetadata,
} from "../candidates/services/candidates-query.helpers";

export function toGapAnalysisStored(
  result: CandidateGapAnalysisResult
): GapAnalysisStored {
  return {
    verdict: result.verdict,
    verdictStatus: result.verdictStatus,
    dimensions: result.dimensions,
    // Persisted with the analysis, so a re-evaluation regenerates it rather
    // than dropping it — the limitation the backfill-only phase lived with.
    scoreBreakdown: result.scoreBreakdown,
  };
}

export function extractLegacySkillsFromDimensions(
  dimensions: CandidateGapAnalysisResult["dimensions"]
): { matchedSkills: string[]; missingSkills: string[] } {
  const skills = dimensions.find((d) => d.key === "skillsMatch");
  if (!skills) {
    return { matchedSkills: [], missingSkills: [] };
  }
  return {
    matchedSkills: skills.matched.map((c) => c.label),
    missingSkills: skills.gaps.map((c) => c.label),
  };
}

export interface GapAnalysisAssemblyContext {
  candidateName: string;
  candidateCompany: string;
  processedAt?: string;
  experienceSummary?: string;
  location?: string;
}

export interface GapAnalysisAssemblyInput {
  candidateName: string;
  resumeMetadata?: unknown;
  resumeTotalYearsExp?: unknown;
  userCompany?: string | null;
  contactCompany?: string | null;
  userLocation?: string | null;
  processedAt?: string;
}

export function resolveGapAnalysisAssemblyContext(
  input: GapAnalysisAssemblyInput
): GapAnalysisAssemblyContext {
  const resumeCompany = currentCompanyFromResumeMetadata(input.resumeMetadata);
  const resumeLocation = locationFromResumeMetadata(input.resumeMetadata);

  return {
    candidateName: input.candidateName,
    candidateCompany:
      resumeCompany ||
      input.userCompany?.trim() ||
      input.contactCompany?.trim() ||
      "",
    processedAt: input.processedAt,
    experienceSummary: formatExperienceSummary(input.resumeTotalYearsExp),
    location: resumeLocation || input.userLocation?.trim() || undefined,
  };
}

export interface ClientGapAnalysisPayload {
  matchScore: number;
  verdict: string;
  verdictStatus: "ok" | "partial" | "gap";
  candidate: {
    name: string;
    company: string;
    processedAt?: string;
    experienceSummary?: string;
    location?: string;
    initials?: string;
  };
  dimensions: CandidateGapAnalysisResult["dimensions"];
  /** Absent on rows that were never annotated with the attribution model. */
  scoreBreakdown?: ScoreBreakdown;
}

export function assembleGapAnalysisPayload(
  stored: GapAnalysisStored | null | undefined,
  matchScore: number | null | undefined,
  context: GapAnalysisAssemblyContext
): ClientGapAnalysisPayload | null {
  if (!stored?.dimensions?.length || matchScore == null) {
    return null;
  }

  const initials = context.candidateName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    matchScore: Math.round(matchScore),
    verdict: stored.verdict,
    verdictStatus: stored.verdictStatus,
    candidate: {
      name: context.candidateName,
      company: context.candidateCompany,
      processedAt: context.processedAt,
      experienceSummary: context.experienceSummary,
      location: context.location,
      initials,
    },
    dimensions: stored.dimensions,
    scoreBreakdown: stored.scoreBreakdown,
  };
}

/**
 * The blob is jsonb, so the breakdown is structurally checked rather than
 * blind-cast. Anything malformed is dropped instead of reaching the UI.
 */
function parseScoreBreakdown(value: unknown): ScoreBreakdown | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.dimensions) || obj.dimensions.length === 0) {
    return undefined;
  }
  if (typeof obj.totalScore !== "number" || !Number.isFinite(obj.totalScore)) {
    return undefined;
  }
  return value as ScoreBreakdown;
}

export function parseGapAnalysisStored(
  value: unknown
): GapAnalysisStored | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.dimensions) || typeof obj.verdict !== "string") {
    return null;
  }
  return {
    verdict: obj.verdict,
    verdictStatus:
      (obj.verdictStatus as GapAnalysisStored["verdictStatus"]) ?? "partial",
    dimensions: obj.dimensions as GapAnalysisStored["dimensions"],
    scoreBreakdown: parseScoreBreakdown(obj.scoreBreakdown),
  };
}
