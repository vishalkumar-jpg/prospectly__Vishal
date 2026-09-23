import { forwardRef, type ReactNode } from "react";
import {
  CornerDownLeft,
  FileText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AllFiltersButtonProps extends ButtonProps {
  /** Active filter groups. Zero hides the badge entirely (§9.6). */
  count: number;
}

/**
 * Split out and ref-forwarding so the drawer can wrap it in `SheetTrigger
 * asChild`. Radix only returns focus to the trigger when the trigger *is* the
 * Radix trigger (§9.9), so a detached button that merely calls `open()` would
 * silently drop focus to the body on close.
 */
export const AllFiltersButton = forwardRef<
  HTMLButtonElement,
  AllFiltersButtonProps
>(({ count, className, ...props }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="outline"
    className={`shrink-0 gap-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst ${className ?? ""}`}
    {...props}
  >
    <SlidersHorizontal className="h-4 w-4" aria-hidden />
    All filters
    {count > 0 ? (
      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
        {count}
      </Badge>
    ) : null}
  </Button>
));
AllFiltersButton.displayName = "AllFiltersButton";

/**
 * The page header's way into the same drawer. Outline: the page's single filled
 * button is the Search submit, and a second one here would compete with it.
 *
 * Ref-forwarding for the same reason as `AllFiltersButton` — Radix only returns
 * focus to a trigger that *is* the Radix trigger.
 */
export const AdvancedSearchButton = forwardRef<
  HTMLButtonElement,
  AllFiltersButtonProps
>(({ count, className, ...props }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="outline"
    className={cn(
      "shrink-0 gap-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst",
      className
    )}
    {...props}
  >
    <SlidersHorizontal className="h-4 w-4" aria-hidden />
    Advanced Search
    {count > 0 ? (
      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
        {count}
      </Badge>
    ) : null}
  </Button>
));
AdvancedSearchButton.displayName = "AdvancedSearchButton";

/**
 * Sits beside All filters. Outline, not filled: the page keeps exactly one
 * primary button and that is the drawer's commit (§9.8).
 */
export const MatchJdButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { active?: boolean }
>(({ active, className, ...props }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="outline"
    className={cn(
      "h-11 gap-2 whitespace-nowrap transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst",
      active && "border-brand-rose/40 bg-brand-rose/5 text-brand-rose",
      className
    )}
    {...props}
  >
    <FileText className="h-4 w-4" aria-hidden />
    Match a JD
  </Button>
));

MatchJdButton.displayName = "MatchJdButton";

export interface SearchBarProps {
  /** The pending query from `useCandidateSearchCriteria` — never local state. */
  value: string;
  onChange: (value: string) => void;
  /** Runs the ranked search. Wired to Enter and blur; idle is the hook's job. */
  onSubmit: () => void;
  /** What the results on screen actually answer. */
  appliedQuery: string | null;
  activeFilterCount: number;
  onOpenFilters?: () => void;
  /** The drawer passes its own `SheetTrigger`-wrapped `AllFiltersButton`. */
  filtersTrigger?: ReactNode;
  /**
   * The JD sheet passes its own trigger, the same way. Outline variant: the
   * page's single filled button stays the drawer's commit (§9.8).
   */
  jdTrigger?: ReactNode;
  /** The quick-filter row lives inside this card (§2.2). */
  children?: ReactNode;
}

/**
 * Free-text box plus the All-filters trigger.
 *
 * §7.2 — typing updates the pending query and nothing else. The ranked search
 * fires on Enter, on blur, or after 500 ms idle, and the hook dedupes all three
 * onto one request. The reference implementation re-queried per `input` event;
 * in production that is an embedding bill per keystroke.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  appliedQuery,
  activeFilterCount,
  onOpenFilters,
  filtersTrigger,
  jdTrigger,
  children,
}: SearchBarProps) {
  const trimmed = value.trim();
  const isUnsubmitted = trimmed !== (appliedQuery ?? "");

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={value}
            autoComplete="off"
            aria-label="Search candidates"
            placeholder="Search names, titles, companies, skills…"
            className="pl-9 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
            onChange={(event) => onChange(event.target.value)}
            onBlur={onSubmit}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              onSubmit();
            }}
          />
        </div>

        {jdTrigger}

        {filtersTrigger ?? (
          <AllFiltersButton
            count={activeFilterCount}
            onClick={onOpenFilters}
            className="w-full sm:w-auto"
          />
        )}
      </div>

      {/* Stale results are never presented as though they answered this text. */}
      {isUnsubmitted && trimmed ? (
        <p
          aria-live="polite"
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <CornerDownLeft className="h-3 w-3" aria-hidden />
          Press Enter to rank by “{trimmed}”
        </p>
      ) : null}

      {children}
    </section>
  );
}
