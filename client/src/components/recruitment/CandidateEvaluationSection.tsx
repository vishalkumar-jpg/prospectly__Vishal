import { CandidateApplication } from "@/lib/types/recruitment";
import { CandidateGapAnalysisSummary } from "@/components/recruitment/gap-analysis/CandidateGapAnalysisSummary";
import {
  resolveApplicationFallbackSignals,
  resolveGapAnalysisForApplication,
} from "@/lib/recruitment/gap-analysis-resolve";

interface CandidateEvaluationSectionProps {
  application: CandidateApplication;
}

export function CandidateEvaluationSection({
  application,
}: CandidateEvaluationSectionProps) {
  if (application.analysisStatus !== "completed") {
    return null;
  }

  const gapData = resolveGapAnalysisForApplication(application.gapAnalysis);
  const fallbackSignals = resolveApplicationFallbackSignals(application);

  if (!gapData && !fallbackSignals) {
    return null;
  }

  return (
    <CandidateGapAnalysisSummary
      data={gapData}
      fallbackSignals={fallbackSignals}
      legacyMatchScore={application.matchScore}
    />
  );
}
