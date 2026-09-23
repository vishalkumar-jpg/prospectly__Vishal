import { FileText, X } from "lucide-react";

import {
  originSkillCount,
  type CandidateSearchCriteria,
} from "@/lib/recruitment/candidate-search.criteria";

export interface JdOriginBannerProps {
  criteria: CandidateSearchCriteria;
  /**
   * Drops the description and everything it contributed. The handler must apply
   * `clearOrigin(criteria)` — that is the only path that clears `bonus[]`, which
   * has no chip of its own and would otherwise keep scoring against terms the
   * recruiter can no longer see.
   */
  onRemove: () => void;
}

/**
 * Says what the results are being matched against, above them (§12).
 *
 * The skill line is counted from the criteria, not from the description, so a
 * recruiter who removes one bad extraction reads "2 of 3 must-haves" rather than
 * a stale "3" — the banner can never claim more than the criteria carry.
 */
export function JdOriginBanner({ criteria, onRemove }: JdOriginBannerProps) {
  const { origin } = criteria;
  const { applied, total } = originSkillCount(criteria);
  if (!origin) return null;

  const skills =
    total === 0
      ? "no must-have skills"
      : applied === total
        ? `${total} must-have skill${total === 1 ? "" : "s"}`
        : `${applied} of ${total} must-haves`;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <FileText
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <p className="min-w-0 flex-1 truncate text-sm">
        Matched against <span className="font-semibold">{origin.title}</span>
        <span className="text-muted-foreground">
          {" "}
          — {skills} read from the description
        </span>
      </p>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove the ${origin.title} job description`}
        className="shrink-0 rounded-full p-1 transition-all duration-200 hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
