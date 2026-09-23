import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeSearchNoticesProps {
  error: unknown;
  totalCandidates: number;
  indexedCandidates: number;
  degraded: boolean;
  truncated: boolean;
  plannerUnavailable: boolean;
  unknownExperienceCount: number;
  /**
   * The board is showing a candidate the recruiter named, so resume coverage no
   * longer decides who appears — reporting on it would be a false alarm.
   */
  nameFiltered: boolean;
  onRetry: () => void;
  onClear: () => void;
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-amber-600">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/**
 * Says nothing when the search worked. The result count, the matched
 * requirements and the clear action were removed as noise on every search —
 * the board itself already shows what matched, and each card carries its own
 * relevance badge.
 *
 * What survives is only what the recruiter cannot infer from the board: a
 * failed search, and the cases where results are quietly incomplete or ranked
 * by a weaker signal than usual.
 */
export function ResumeSearchNotices({
  error,
  totalCandidates,
  indexedCandidates,
  degraded,
  truncated,
  plannerUnavailable,
  unknownExperienceCount,
  nameFiltered,
  onRetry,
  onClear,
}: ResumeSearchNoticesProps) {
  if (error) {
    return (
      <div
        className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5"
        aria-live="polite"
      >
        <span className="text-sm text-destructive">
          Couldn&apos;t run the resume search.
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>
    );
  }

  // Coverage and the result cap describe how the resume half chose candidates.
  // Under a name filter it did not choose them, so both go quiet; degraded
  // ranking and a failed plan still matter, because they shape the chips on the
  // named candidate's own card.
  const unindexed = nameFiltered
    ? 0
    : Math.max(0, totalCandidates - indexedCandidates);
  const showTruncated = truncated && !nameFiltered;
  const hasWarning =
    degraded ||
    showTruncated ||
    plannerUnavailable ||
    unindexed > 0 ||
    unknownExperienceCount > 0;

  if (!hasWarning) return null;

  return (
    <div
      className="mb-3 space-y-1 rounded-xl border border-border bg-card px-4 py-2.5"
      aria-live="polite"
    >
      {degraded ? (
        <Warning>
          AI ranking is temporarily unavailable — showing keyword matches only.
        </Warning>
      ) : null}

      {plannerUnavailable ? (
        <Warning>
          Couldn&apos;t read specific requirements from your search — showing
          candidates ranked by overall relevance instead.
        </Warning>
      ) : null}

      {unknownExperienceCount > 0 ? (
        <Warning>
          {unknownExperienceCount}{" "}
          {unknownExperienceCount === 1 ? "resume has" : "resumes have"} no
          years of experience on file, so the experience requirement
          couldn&apos;t be checked for{" "}
          {unknownExperienceCount === 1 ? "it" : "them"}.
        </Warning>
      ) : null}

      {unindexed > 0 ? (
        <Warning>
          {unindexed} of {totalCandidates} resumes are not yet AI-indexed —
          those candidates were matched by keywords only.
        </Warning>
      ) : null}

      {showTruncated ? (
        <Warning>
          Showing the top 50 matches only — narrow your search to see the rest.
        </Warning>
      ) : null}
    </div>
  );
}
