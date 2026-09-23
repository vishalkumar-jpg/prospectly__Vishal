import { RECRUITER_PIPELINE } from "./candidates-query.helpers";

export type PipelineStepStatus =
  | "completed"
  | "current"
  | "pending"
  | "skipped";

export interface RecruiterPipelineStep {
  step: string;
  label: string;
  status: PipelineStepStatus;
  completedAt: string | null;
}

type StageHistoryEntry = {
  stageKey: string | null;
  createdAt: Date | null;
};

/**
 * Build the recruiter / candidate detail pipeline tracker.
 *
 * After reinstate, stage history still contains later stages the candidate
 * once reached. Those must NOT render as ✅ completed while the candidate
 * sits earlier on the happy path — only stages at or before the current
 * position count. Rejected keeps historical progress (freeze at last reached).
 */
export function buildRecruiterPipelineSteps(params: {
  stageHistoryRows: StageHistoryEntry[];
  currentStageKey: string;
  candidateCreatedAt: Date | null;
}): RecruiterPipelineStep[] {
  const { stageHistoryRows, currentStageKey, candidateCreatedAt } = params;

  const completedStageKeys = new Set(
    stageHistoryRows.filter((h) => h.stageKey).map((h) => h.stageKey as string)
  );
  const stageHistoryMap = new Map(
    stageHistoryRows
      .filter((h) => h.stageKey)
      .map((h) => [h.stageKey as string, h.createdAt])
  );

  const isRejected = currentStageKey === "rejected";
  const isHired = currentStageKey === "hired";
  const isNotQualified = currentStageKey === "not_qualified";
  const wasNotQualified =
    isNotQualified || completedStageKeys.has("not_qualified");

  const currentPipelineIndex = RECRUITER_PIPELINE.findIndex(
    (p) => p.key === currentStageKey
  );
  const onHappyPath = currentPipelineIndex >= 0;

  /** History counts as completed only up to the live position (reinstate-safe). */
  const historyStillCompleted = (stageKey: string, pipelineIndex: number) => {
    if (!completedStageKeys.has(stageKey)) return false;
    // Happy path (incl. after move-back): ignore history ahead of current.
    if (onHappyPath) return pipelineIndex < currentPipelineIndex;
    // Rejected / off-pipeline: keep how far they got before the terminal move.
    return true;
  };

  const happyPathSteps: RecruiterPipelineStep[] = RECRUITER_PIPELINE.map(
    (stage, pipelineIndex) => {
      const inReviewAt = stageHistoryMap.get("in_review");

      if (stage.key === "in_review" && !inReviewAt && wasNotQualified) {
        return {
          step: stage.key,
          label: stage.label,
          status: "skipped" as const,
          completedAt: null,
        };
      }

      // Current stage wins over history (history always has a row for it).
      if (stage.key === currentStageKey) {
        return {
          step: stage.key,
          label: stage.label,
          status: "current",
          completedAt: null,
        };
      }

      if (stage.key === "in_review") {
        const completedAt = inReviewAt || candidateCreatedAt;
        return {
          step: stage.key,
          label: stage.label,
          status: "completed",
          completedAt: completedAt ? completedAt.toISOString() : null,
        };
      }

      if (historyStillCompleted(stage.key, pipelineIndex)) {
        return {
          step: stage.key,
          label: stage.label,
          status: "completed",
          completedAt: stageHistoryMap.get(stage.key)?.toISOString() || null,
        };
      }

      if (isHired) {
        return {
          step: stage.key,
          label: stage.label,
          status: "completed",
          completedAt: stageHistoryMap.get(stage.key)?.toISOString() || null,
        };
      }

      if (isRejected) {
        return {
          step: stage.key,
          label: stage.label,
          status: "skipped",
          completedAt: null,
        };
      }

      if (onHappyPath && pipelineIndex < currentPipelineIndex) {
        return {
          step: stage.key,
          label: stage.label,
          status: "completed",
          completedAt: null,
        };
      }

      return {
        step: stage.key,
        label: stage.label,
        status: "pending",
        completedAt: null,
      };
    }
  );

  const notQualifiedStep: RecruiterPipelineStep = {
    step: "not_qualified",
    label: "Not Qualified",
    status: isNotQualified ? "current" : "completed",
    completedAt: isNotQualified
      ? null
      : (stageHistoryMap.get("not_qualified")?.toISOString() ?? null),
  };

  const terminalStep = buildTerminalOutcomeStep(
    currentStageKey,
    stageHistoryMap
  );
  const stepsWithOutcome = terminalStep
    ? [...happyPathSteps, terminalStep]
    : happyPathSteps;

  if (isNotQualified) {
    return [
      notQualifiedStep,
      ...RECRUITER_PIPELINE.map((stage) => ({
        step: stage.key,
        label: stage.label,
        status: "pending" as const,
        completedAt: null,
      })),
    ];
  }
  if (wasNotQualified) {
    return [notQualifiedStep, ...stepsWithOutcome];
  }
  return stepsWithOutcome;
}

function buildTerminalOutcomeStep(
  currentStageKey: string,
  stageHistoryMap: Map<string, Date | null>
): RecruiterPipelineStep | null {
  if (currentStageKey === "hired") {
    return {
      step: "hired",
      label: "Hired",
      status: "current",
      completedAt: stageHistoryMap.get("hired")?.toISOString() ?? null,
    };
  }
  if (currentStageKey === "rejected") {
    return {
      step: "rejected",
      label: "Rejected",
      status: "current",
      completedAt: stageHistoryMap.get("rejected")?.toISOString() ?? null,
    };
  }
  return null;
}
