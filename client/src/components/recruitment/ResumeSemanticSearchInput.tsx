import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RESUME_SEARCH_MIN_QUERY_LENGTH } from "@/lib/recruitment/resume-search.utils";

interface ResumeSemanticSearchInputProps {
  value: string;
  onSubmit: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
  className?: string;
}

/**
 * Submit-on-Enter rather than search-as-you-type: each run costs an embedding
 * call, and these queries are sentence-length, so partial phrases would be both
 * expensive and meaningless.
 */
export function ResumeSemanticSearchInput({
  value,
  onSubmit,
  onClear,
  isSearching,
  className,
}: ResumeSemanticSearchInputProps) {
  const [draft, setDraft] = useState(value);

  // Re-sync on browser back/forward, which rewrites the URL param.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const trimmed = draft.trim();
  const canSubmit =
    trimmed.length >= RESUME_SEARCH_MIN_QUERY_LENGTH && !isSearching;

  /**
   * Exactly one button occupies the right edge, so the placeholder gets the
   * width the two of them used to reserve between them. They are never both
   * useful anyway: the arrow means "run this", the cross means "drop what is
   * running", and the draft is either new or it isn't.
   */
  const isDirty = trimmed !== value.trim();
  const showClear =
    !isSearching && value.trim().length > 0 && !(isDirty && canSubmit);

  const handleClear = () => {
    setDraft("");
    onClear();
  };

  const handleChange = (next: string) => {
    setDraft(next);
    // Emptying the box is the same intent as pressing the cross — the board is
    // otherwise left showing results for a query that is no longer on screen.
    // Guarded on `value` so typing in an already-clear box writes no URL.
    if (!next.trim() && value.trim()) onClear();
  };

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(trimmed);
      }}
    >
      <Sparkles
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-amethyst"
        aria-hidden
      />
      <Input
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Search resumes by skill, job title or years of experience"
        aria-label="AI resume search"
        className="rounded-xl border-border bg-muted pl-10 pr-11 focus-visible:border-brand-amethyst/30 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-brand-amethyst/20 focus-visible:ring-offset-0"
      />

      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
        {showClear ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={handleClear}
            aria-label="Clear resume search"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  disabled={!canSubmit}
                  className="h-8 w-8 rounded-lg text-brand-amethyst hover:bg-brand-amethyst/10"
                  aria-label="Search resumes"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {trimmed.length < RESUME_SEARCH_MIN_QUERY_LENGTH
                ? `Enter at least ${RESUME_SEARCH_MIN_QUERY_LENGTH} characters`
                : "Search resumes with AI"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </form>
  );
}
