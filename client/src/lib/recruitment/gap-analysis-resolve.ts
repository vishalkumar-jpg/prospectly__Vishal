import type {
  GapAnalysisFallbackSignals,
  GapAnalysisPayload,
} from "@/lib/recruitment/gap-analysis.types";
import { normalizeChipLabels } from "@/lib/recruitment/gap-analysis.utils";

interface InboxCandidateLike {
  source?: string;
  matchedSignals?: string[] | null;
  concerns?: string[] | null;
  gapAnalysis?: GapAnalysisPayload | null;
  matchScore?: string | number | null;
}

function parseMatchScore(
  value: string | number | null | undefined
): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface ApplicationLike {
  gapAnalysis?: GapAnalysisPayload | null;
  matchedSkills?: string[] | null;
  missingSkills?: string[] | null;
}

function hasGapAnalysisContent(
  gapAnalysis?: GapAnalysisPayload | null
): boolean {
  return (gapAnalysis?.dimensions?.length ?? 0) > 0;
}

export function resolveGapAnalysisForApplication(
  gapAnalysis?: GapAnalysisPayload | null
): GapAnalysisPayload | null {
  return gapAnalysis ?? null;
}

export function resolveGapAnalysisForInbox(
  candidate: InboxCandidateLike
): GapAnalysisPayload | null {
  if (!candidate.gapAnalysis || !hasGapAnalysisContent(candidate.gapAnalysis)) {
    return null;
  }

  const resolvedScore = Number.isFinite(candidate.gapAnalysis.matchScore)
    ? candidate.gapAnalysis.matchScore
    : parseMatchScore(candidate.matchScore);

  if (resolvedScore == null) {
    return candidate.gapAnalysis;
  }

  return {
    ...candidate.gapAnalysis,
    matchScore: Math.round(resolvedScore),
  };
}

export function resolveInboxFallbackSignals(
  candidate: InboxCandidateLike
): GapAnalysisFallbackSignals | null {
  if (hasGapAnalysisContent(candidate.gapAnalysis)) {
    return null;
  }

  const strengths = normalizeChipLabels(
    candidate.matchedSignals?.filter(Boolean) ?? []
  );
  const concerns = normalizeChipLabels(
    candidate.concerns?.filter(Boolean) ?? []
  );

  if (strengths.length === 0 && concerns.length === 0) {
    return null;
  }

  return { strengths, concerns };
}

export function resolveApplicationFallbackSignals(
  input: ApplicationLike
): GapAnalysisFallbackSignals | null {
  if (hasGapAnalysisContent(input.gapAnalysis)) {
    return null;
  }

  const strengths = normalizeChipLabels(
    input.matchedSkills?.filter(Boolean) ?? []
  );
  const concerns = normalizeChipLabels(
    input.missingSkills?.filter(Boolean) ?? []
  );

  if (strengths.length === 0 && concerns.length === 0) {
    return null;
  }

  return { strengths, concerns };
}
