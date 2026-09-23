import { AlertTriangle, Check, Minus, X } from "lucide-react";
import { PercentProgressBar } from "@/components/ui/percent-progress-bar";
import { cn } from "@/lib/utils";
import type {
  GapChip,
  GapDimension,
  GapDimensionDetail,
  ScoreBreakdownDimension,
} from "@/lib/recruitment/gap-analysis.types";
import {
  badgeStatusClass,
  barFillClass,
  filterDetailFactsAgainstDimension,
  gapChipPillClass,
  normalizeGapChips,
} from "@/lib/recruitment/gap-analysis.utils";

function GapChipPills({ chips }: { chips: GapChip[] }) {
  const normalized = normalizeGapChips(chips);
  if (normalized.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {normalized.map((chip) => (
        <span key={`${chip.status}-${chip.label}`} className={gapChipPillClass(chip.status)}>
          {chip.label}
        </span>
      ))}
    </div>
  );
}

function SkillChips({
  chips,
  title,
  titleClass,
}: {
  chips: GapChip[];
  title: string;
  titleClass: string;
}) {
  const normalized = normalizeGapChips(chips);
  if (normalized.length === 0) return null;

  const strong = normalized.filter((c) => c.status === "ok").length;
  const partial = normalized.filter((c) => c.status === "partial").length;

  return (
    <div>
      <p
        className={cn(
          "mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
          titleClass
        )}
      >
        {title}
        {title === "Matched" && (strong > 0 || partial > 0) && (
          <span className="ml-auto font-normal normal-case tracking-normal text-muted-foreground">
            {strong > 0 ? `${strong} strong` : ""}
            {strong > 0 && partial > 0 ? " · " : ""}
            {partial > 0 ? `${partial} partial` : ""}
          </span>
        )}
        {title === "Missing" && (
          <span className="ml-auto font-normal normal-case tracking-normal text-muted-foreground">
            {normalized.length} not evidenced
          </span>
        )}
      </p>
      <GapChipPills chips={chips} />
    </div>
  );
}

function ExperienceBody({ detail }: { detail: Extract<GapDimensionDetail, { type: "experience" }> }) {
  return (
    <div className="space-y-3">
      {detail.bars.map((bar) => (
        <div key={bar.label}>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-medium text-muted-foreground">{bar.label}</span>
            <span
              className={cn(
                "font-medium",
                bar.valueStatus === "ok" && "text-brand-success",
                bar.valueStatus === "partial" && "text-brand-warning",
                bar.valueStatus === "gap" && "text-brand-destructive"
              )}
            >
              {bar.value}
            </span>
          </div>
          <PercentProgressBar
            value={bar.fillPercent}
            markerPercent={bar.reqMarkPercent}
            indicatorClassName={barFillClass(bar.fillStatus)}
          />
        </div>
      ))}
      {detail.note && (
        <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-warning" />
          <span>{detail.note}</span>
        </p>
      )}
    </div>
  );
}

function VsBody({
  detail,
  extraFacts,
}: {
  detail: Extract<GapDimensionDetail, { type: "vs" }>;
  extraFacts: GapChip[];
}) {
  return (
    <div>
      <div className="mt-1 grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-border sm:grid-cols-[1fr_auto_1fr]">
        <div
          className={cn(
            "p-3.5 max-sm:p-2.5",
            detail.left.isRequirement && "bg-brand-amethyst/10"
          )}
        >
          <p
            className={cn(
              "mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide",
              detail.left.isRequirement
                ? "text-brand-amethyst"
                : "text-muted-foreground"
            )}
          >
            {detail.left.kicker}
          </p>
          <p className="text-sm font-medium leading-snug max-sm:text-xs">
            {detail.left.title}
          </p>
          {detail.left.subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">
              {detail.left.subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center border-y border-border bg-background px-2 py-2 max-sm:py-1.5 sm:border-x sm:border-y-0 sm:px-2 sm:py-0">
          <span
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full text-brand-foreground",
              detail.compareStatus === "ok" && "bg-brand-success",
              detail.compareStatus === "partial" && "bg-brand-warning",
              detail.compareStatus === "gap" && "bg-brand-destructive"
            )}
          >
            {detail.compareStatus === "partial" ? (
              <Minus className="h-3.5 w-3.5" strokeWidth={3} />
            ) : detail.compareStatus === "ok" ? (
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            ) : (
              <X className="h-3.5 w-3.5" strokeWidth={3} />
            )}
          </span>
        </div>
        <div className="border-t border-border p-3.5 max-sm:p-2.5 sm:border-t-0">
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            {detail.right.kicker}
          </p>
          <p className="text-sm font-medium leading-snug max-sm:text-xs">
            {detail.right.title}
          </p>
          {detail.right.subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">
              {detail.right.subtitle}
            </p>
          )}
        </div>
      </div>
      {extraFacts.length > 0 && (
        <div className="mt-3">
          <GapChipPills chips={extraFacts} />
        </div>
      )}
    </div>
  );
}

function FactsBody({ facts }: { facts: GapChip[] }) {
  return <GapChipPills chips={facts} />;
}

/**
 * Only shown where points were actually lost — a fully-met dimension's reason
 * is just a confirmation and would be noise.
 */
function PointsLostNote({ breakdown }: { breakdown: ScoreBreakdownDimension }) {
  if (breakdown.pointsLost <= 0) return null;

  return (
    <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-warning" />
      <span>
        <span className="font-medium text-foreground">
          {breakdown.pointsLost} of {breakdown.weight} points lost
        </span>
        {breakdown.reason ? ` — ${breakdown.reason}` : ""}
      </span>
    </p>
  );
}

export function GapAnalysisSectionBody({
  dimension,
  breakdown,
}: {
  dimension: GapDimension;
  breakdown?: ScoreBreakdownDimension;
}) {
  const extraFacts = filterDetailFactsAgainstDimension(dimension);

  return (
    <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-1 max-sm:px-3 max-sm:pb-3">
      {breakdown && <PointsLostNote breakdown={breakdown} />}
      <SkillChips
        chips={dimension.matched}
        title="Matched"
        titleClass="text-brand-success"
      />
      <SkillChips
        chips={dimension.gaps}
        title="Missing"
        titleClass="text-brand-destructive"
      />
      {dimension.detail?.type === "experience" && (
        <ExperienceBody detail={dimension.detail} />
      )}
      {dimension.detail?.type === "vs" && (
        <VsBody detail={dimension.detail} extraFacts={extraFacts} />
      )}
      {dimension.detail?.type === "facts" && extraFacts.length > 0 && (
        <FactsBody facts={extraFacts} />
      )}
    </div>
  );
}

export function GapAnalysisStatusBadge({
  label,
  status,
  className,
}: {
  label: string;
  status: GapChip["status"];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-[9rem] shrink-0 truncate rounded-full px-2.5 py-1 text-xs font-medium sm:max-w-[11rem]",
        badgeStatusClass(status),
        className
      )}
    >
      {label}
    </span>
  );
}
