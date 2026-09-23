import type { CandidatePipelineStep } from "@/lib/api/recruitment";

const TERMINAL_PIPELINE_STEPS = new Set(["hired", "rejected"]);

/** Hired / Rejected render only when the candidate is actually in that stage. */
export function resolveVisiblePipelineSteps(
  steps: CandidatePipelineStep[],
  currentStage: string
): CandidatePipelineStep[] {
  const withoutTerminal = steps.filter(
    (s) => !TERMINAL_PIPELINE_STEPS.has(s.step)
  );
  if (!TERMINAL_PIPELINE_STEPS.has(currentStage)) {
    return withoutTerminal;
  }

  const existing = steps.find((s) => s.step === currentStage);
  const terminal: CandidatePipelineStep = existing ?? {
    step: currentStage,
    label: currentStage === "hired" ? "Hired" : "Rejected",
    status: "current",
    completedAt: null,
  };

  const prior = withoutTerminal.map((s) => {
    if (s.status === "current") {
      return { ...s, status: "completed" as const };
    }
    if (currentStage === "hired" && s.status === "pending") {
      return { ...s, status: "completed" as const };
    }
    return s;
  });

  return [...prior, { ...terminal, status: "current" }];
}

export function getPipelineStepColor(
  status: CandidatePipelineStep["status"],
  step: string
) {
  if (status === "current" && step === "hired") {
    return {
      bg: "bg-emerald-500",
      ring: "ring-emerald-500/30 ring-4",
      text: "text-white",
      line: "bg-emerald-500",
    };
  }
  if (status === "current" && step === "rejected") {
    return {
      bg: "bg-slate-500",
      ring: "ring-slate-400/30 ring-4",
      text: "text-white",
      line: "bg-slate-400",
    };
  }

  switch (status) {
    case "completed":
      return {
        bg: "bg-brand-success",
        ring: "ring-brand-success/20",
        text: "text-white",
        line: "bg-brand-success",
      };
    case "current":
      return {
        bg: "bg-brand-amethyst",
        ring: "ring-brand-amethyst/30 ring-4 animate-pulse",
        text: "text-white",
        line: "bg-border",
      };
    case "pending":
      return {
        bg: "bg-muted",
        ring: "",
        text: "text-muted-foreground",
        line: "bg-border",
      };
    case "skipped":
      return {
        bg: "bg-muted/50",
        ring: "",
        text: "text-muted-foreground/50",
        line: "bg-border/50",
      };
  }
}

export function currentPipelineBadgeClass(step: string) {
  if (step === "hired") {
    return "bg-emerald-500/15 text-emerald-700";
  }
  if (step === "rejected") {
    return "bg-slate-500/15 text-slate-600";
  }
  return "bg-brand-amethyst/15 text-brand-amethyst";
}
