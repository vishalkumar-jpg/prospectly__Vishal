import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeSearchEmptyStateProps {
  query: string;
  /**
   * True when the query did name someone on this board, but the other filters
   * or a hidden stage column leave nothing to show — a different problem from
   * finding nobody, and one the recruiter fixes somewhere else.
   */
  matchedButFiltered: boolean;
  /**
   * Whether this board hides identities until a reveal stage. False on the
   * connector board, where the connector sourced these people and sees every
   * name — telling them a name search "only finds revealed candidates" there
   * would be advice about a rule that does not apply to them.
   */
  anonymised?: boolean;
  onClear: () => void;
}

/**
 * Replaces the whole column strip rather than leaving every stage showing its
 * own "no candidates" message, which reads as a broken board.
 */
export function ResumeSearchEmptyState({
  query,
  matchedButFiltered,
  anonymised = true,
  onClear,
}: ResumeSearchEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="text-lg font-semibold">
          {matchedButFiltered
            ? "That candidate is hidden by your filters"
            : `No candidates match “${query}”`}
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          {matchedButFiltered
            ? "Clear the match score or stage filters to see them."
            : "Try fewer or broader terms — “kubernetes” rather than “production kubernetes operator experience”."}
        </p>
        {matchedButFiltered || !anonymised ? null : (
          // Searching a name that belongs to a still-anonymous candidate is a
          // dead end by design, and silence about it looks like a bug.
          <p className="max-w-md text-xs text-muted-foreground">
            Searching by name only finds candidates whose details have been
            revealed. Anonymous candidates are found by their candidate number.
          </p>
        )}
      </div>
      <Button
        onClick={onClear}
        className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
      >
        Clear resume search
      </Button>
    </div>
  );
}
