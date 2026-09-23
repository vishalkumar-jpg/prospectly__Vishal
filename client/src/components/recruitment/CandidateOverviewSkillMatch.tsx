import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, Target, TrendingDown, TrendingUp } from "lucide-react";

const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";
const CHIP_BASE =
  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-default";
const MISSING_SKILLS_PREVIEW = 8;

interface CandidateOverviewSkillMatchProps {
  matchScore?: number | null;
  matchedSkills?: string[] | null;
  missingSkills?: string[] | null;
  analysisStatus?: "pending" | "completed" | "failed" | null;
  analysisNote?: string | null;
}

function SkillChips({
  skills,
  chipClass,
  previewLimit,
}: {
  skills: string[];
  chipClass: string;
  previewLimit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasLimit = previewLimit != null && skills.length > previewLimit;
  const visible =
    hasLimit && !expanded ? skills.slice(0, previewLimit) : skills;
  const hiddenCount = hasLimit ? skills.length - previewLimit! : 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((skill) => (
        <span key={skill} className={cn(CHIP_BASE, chipClass)}>
          {skill}
        </span>
      ))}
      {hasLimit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Show less" : `+ Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}

function SkillSubsection({
  label,
  icon: Icon,
  iconClass,
  countPillClass,
  chipClass,
  skills,
  previewLimit,
  withDivider,
}: {
  label: string;
  icon: typeof TrendingUp;
  iconClass: string;
  countPillClass: string;
  chipClass: string;
  skills: string[];
  previewLimit?: number;
  withDivider?: boolean;
}) {
  return (
    <div className={cn(withDivider && "border-t border-border/60 pt-4")}>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClass)} />
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            countPillClass
          )}
        >
          {skills.length}
        </span>
      </div>
      <SkillChips
        skills={skills}
        chipClass={chipClass}
        previewLimit={previewLimit}
      />
    </div>
  );
}

function matchScoreBadgeClass(score: number) {
  if (score >= 80) {
    return "border-brand-success/30 text-brand-success bg-brand-success/10";
  }
  if (score >= 50) {
    return "border-brand-warning/30 text-brand-warning bg-brand-warning/10";
  }
  return "border-brand-destructive/30 text-brand-destructive bg-brand-destructive/10";
}

export function CandidateOverviewSkillMatch({
  matchScore,
  matchedSkills,
  missingSkills,
  analysisStatus,
  analysisNote,
}: CandidateOverviewSkillMatchProps) {
  const matched = matchedSkills?.filter(Boolean) ?? [];
  const missing = missingSkills?.filter(Boolean) ?? [];
  const score =
    matchScore != null && Number.isFinite(matchScore) ? matchScore : null;
  const isPending =
    analysisStatus === "pending" ||
    (!analysisStatus && matched.length === 0 && missing.length === 0);
  const isFailed = analysisStatus === "failed";
  const hasSkills = matched.length > 0 || missing.length > 0;

  if (!hasSkills && !isPending && !isFailed) return null;

  if (isPending && !hasSkills) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-brand-amethyst/15 bg-brand-amethyst/5 p-4 shadow-sm">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-amethyst" />
        <p className="text-sm text-muted-foreground">
          Skill analysis in progress…
        </p>
      </div>
    );
  }

  if (isFailed && !hasSkills) {
    return (
      <div className="rounded-xl border border-brand-destructive/20 bg-brand-destructive/5 p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Skill analysis could not be completed.
          {analysisNote ? ` ${analysisNote}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <p className={cn(SECTION_LABEL, "flex items-center gap-1.5")}>
          <Target className="h-3 w-3" /> Skill Match Analysis
        </p>
        {score != null && (
          <Badge
            variant="outline"
            className={cn(
              "ml-auto text-xs font-medium",
              matchScoreBadgeClass(score)
            )}
          >
            {Math.round(score)}% Match
          </Badge>
        )}
      </div>

      {matched.length > 0 && (
        <SkillSubsection
          label="Matched Skills"
          icon={TrendingUp}
          iconClass="text-brand-success"
          countPillClass="bg-brand-success/10 text-brand-success"
          chipClass="border border-brand-success/20 bg-brand-success/10 text-brand-success"
          skills={matched}
        />
      )}

      {missing.length > 0 && (
        <SkillSubsection
          label="Missing Skills"
          icon={TrendingDown}
          iconClass="text-brand-destructive"
          countPillClass="bg-brand-destructive/10 text-brand-destructive"
          chipClass="border border-brand-destructive/20 bg-brand-destructive/10 text-brand-destructive"
          skills={missing}
          previewLimit={MISSING_SKILLS_PREVIEW}
          withDivider={matched.length > 0}
        />
      )}
    </div>
  );
}
