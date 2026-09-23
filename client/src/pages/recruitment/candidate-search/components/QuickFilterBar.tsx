import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CandidateSearchFacets } from "@/lib/api/recruitment-candidate-search";
import type { QuickFilterField } from "@/hooks/useCandidateSearchCriteria";
import type { CandidateSearchCriteria } from "@/lib/recruitment/candidate-search.criteria";

/** The prototype's three fixed shortcuts, then the top skills (§9.6). */
const TOP_SKILL_COUNT = 4;
const REMOTE_WORK_MODE = "remote";
const QUICK_EXPERIENCE_YEARS = 5;

interface QuickFilter {
  label: string;
  field: QuickFilterField;
  value: string | number;
  on: boolean;
}

export interface QuickFilterBarProps {
  applied: CandidateSearchCriteria;
  facets?: CandidateSearchFacets;
  /**
   * Resolved by the page from the in-scope stages. Null while master data is in
   * flight — the chip renders disabled rather than toggling an unknown stage.
   */
  interviewStageId: number | null;
  /** `toggleQuickFilter` from `useCandidateSearchCriteria` — same fields as the
   *  drawer edits, which is why the two can never disagree (§7.1). */
  onToggle: (field: QuickFilterField, value: string | number) => void;
}

/**
 * Everyday narrowing, applied immediately. Unlike the drawer there is no draft
 * step: one click is the whole interaction, and the facet change re-queries at
 * the cost of the SQL alone (§7.2).
 */
export function QuickFilterBar({
  applied,
  facets,
  interviewStageId,
  onToggle,
}: QuickFilterBarProps) {
  const filters = useMemo<QuickFilter[]>(() => {
    const fixed: QuickFilter[] = [
      {
        label: "Remote",
        field: "workModes",
        value: REMOTE_WORK_MODE,
        on: applied.workModes.includes(REMOTE_WORK_MODE),
      },
      {
        label: "5+ yrs",
        field: "experienceMin",
        value: QUICK_EXPERIENCE_YEARS,
        on: applied.experienceMin === QUICK_EXPERIENCE_YEARS,
      },
    ];

    if (interviewStageId !== null) {
      fixed.splice(1, 0, {
        label: "In interview",
        field: "stageIds",
        value: interviewStageId,
        on: applied.stageIds.includes(interviewStageId),
      });
    }

    // `/facets` returns values ordered by frequency, so the top four are the
    // first four — no client-side counting of a list we did not fully fetch.
    const skills = (facets?.skills ?? [])
      .slice(0, TOP_SKILL_COUNT)
      .map<QuickFilter>((skill) => ({
        label: skill.label,
        field: "skills",
        value: skill.value,
        on: applied.skills.includes(skill.value),
      }));

    return [...fixed, ...skills];
  }, [
    applied.experienceMin,
    applied.skills,
    applied.stageIds,
    applied.workModes,
    facets,
    interviewStageId,
  ]);

  return (
    <div className="mt-3 flex items-center gap-2 overflow-x-auto md:flex-wrap md:overflow-visible">
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
        Quick filters
      </span>
      {filters.map((filter) => (
        <button
          key={`${filter.field}:${filter.value}`}
          type="button"
          aria-pressed={filter.on}
          onClick={() => onToggle(filter.field, filter.value)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst",
            filter.on
              ? "border-transparent bg-brand-gradient text-brand-foreground shadow-brand-cta"
              : "border-border bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
