import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/utils/dateFormatter";
import { cn } from "@/lib/utils";
import {
  Eye,
  ThumbsUp,
  Calendar,
  CheckCircle2,
  Check,
  Circle,
  Layers,
  Ban,
  Sparkles,
  Mail,
  UserCheck,
  Send,
  Trophy,
  XCircle,
} from "lucide-react";
import type { CandidatePipelineStep } from "@/lib/api/recruitment";
import {
  currentPipelineBadgeClass,
  getPipelineStepColor,
  resolveVisiblePipelineSteps,
} from "./candidate-pipeline-tracker.utils";

const STEP_ICONS: Record<string, React.ElementType> = {
  not_qualified: Ban,
  in_review: Eye,
  shortlisted: ThumbsUp,
  interview_scheduled: Calendar,
  interview_completed: CheckCircle2,
  interview_invite_sent: Send,
  qualified: Sparkles,
  consent_pending: Mail,
  consent_accepted: UserCheck,
  consent_declined: XCircle,
  hired: Trophy,
  rejected: XCircle,
};

interface CandidatePipelineTrackerProps {
  steps: CandidatePipelineStep[];
  currentStage: string;
}

export default function CandidatePipelineTracker({
  steps,
  currentStage,
}: CandidatePipelineTrackerProps) {
  const visibleSteps = resolveVisiblePipelineSteps(steps, currentStage);
  const completedCount = visibleSteps.filter(
    (s) => s.status === "completed"
  ).length;
  const totalSteps = visibleSteps.length;
  const progressPercent =
    totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;
  const currentStageLabel =
    visibleSteps.find((s) => s.step === currentStage)?.label ?? "";
  return (
    <Card className="border-brand-amethyst/20 bg-gradient-to-br from-brand-amethyst/5 to-brand-rose/5">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-brand-amethyst/15 flex items-center justify-center">
              <Layers className="h-4 w-4 text-brand-amethyst" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Candidate Pipeline</h4>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {totalSteps} completed
              </p>
            </div>
          </div>
          <Badge className="bg-brand-amethyst/15 text-brand-amethyst border-brand-amethyst/30 hover:bg-brand-amethyst/20">
            {Math.round(progressPercent)}%
          </Badge>
        </div>

        {/* Full-width Pipeline */}
        <div className="pb-1">
          <div className="relative">
            {/* Horizontal connecting line through icon centers */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-border min-w-full" />

            {/* Scrollable container for mobile */}
            <div className="overflow-x-auto scrollbar-hide touch-pan-x md:overflow-visible snap-x snap-mandatory md:snap-none">
              <div className="flex items-start gap-3 md:gap-3 relative min-w-max md:min-w-0">
                {visibleSteps.map((step) => {
                  const Icon = STEP_ICONS[step.step] || Circle;
                  const colors = getPipelineStepColor(step.status, step.step);

                  return (
                    <div
                      key={step.step}
                      className="flex flex-col items-center min-w-[100px] flex-shrink-0 md:flex-1 md:min-w-0 snap-center"
                    >
                      {/* Icon with background to cover connecting line */}
                      <div className="relative px-2">
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                            colors.bg,
                            colors.ring
                          )}
                        >
                          {step.status === "completed" ? (
                            <Check className={`h-4 w-4 ${colors.text}`} />
                          ) : (
                            <Icon className={`h-4 w-4 ${colors.text}`} />
                          )}
                        </div>
                      </div>

                      {/* Step Label - centered below icon */}
                      <div className="text-center mt-2 max-w-full">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              "text-xs font-medium leading-tight break-words",
                              {
                                "text-muted-foreground/50 line-through":
                                  step.status === "skipped",
                                "text-muted-foreground":
                                  step.status === "pending",
                                "text-foreground":
                                  step.status !== "skipped" &&
                                  step.status !== "pending",
                              }
                            )}
                          >
                            {step.label}
                          </span>
                          {step.status === "current" && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "hidden px-1 py-0 text-[9px] md:inline-flex",
                                currentPipelineBadgeClass(step.step)
                              )}
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Timestamp - completed + current (e.g. Consent Declined) */}
                      {(step.status === "completed" ||
                        step.status === "current") &&
                        step.completedAt && (
                          <p
                            className="text-[10px] text-muted-foreground mt-0.5 text-center leading-tight"
                            title={formatDateTime(step.completedAt)}
                          >
                            {formatDateTime(step.completedAt)}
                          </p>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Current Stage Badge */}
        {currentStageLabel && (
          <div className="md:hidden flex justify-center">
            <Badge
              variant="secondary"
              className={cn(
                "px-2 py-1 text-[10px]",
                currentPipelineBadgeClass(currentStage)
              )}
            >
              Current Stage: {currentStageLabel}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
