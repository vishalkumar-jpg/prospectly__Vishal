import { Button } from "@/components/ui/button";

interface FooterProps {
  count: number;
  textCounted: boolean;
  loading: boolean;
  failed: boolean;
  onClear: () => void;
  onApply: () => void;
}

export function CommitFooter({
  count,
  textCounted,
  loading,
  failed,
  onClear,
  onApply,
}: FooterProps) {
  const counting = loading && count === 0;
  const noMatches = !counting && !failed && count === 0;

  const label = failed
    ? "Show candidates"
    : counting
      ? "Counting…"
      : noMatches
        ? "No matches — adjust a filter"
        : textCounted
          ? `Show ${count.toLocaleString()} ${count === 1 ? "candidate" : "candidates"}`
          : `Show ${count.toLocaleString()} matching filters`;

  return (
    <div className="mt-auto shrink-0 border-t bg-muted/30 px-5 py-3.5">
      {!failed && !counting && !textCounted && count > 0 ? (
        <p className="mb-2 text-xs text-muted-foreground">
          text ranking may narrow this
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onClear}
          className="shrink-0 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
        >
          Clear
        </Button>
        <Button
          type="button"
          onClick={onApply}
          disabled={noMatches || counting}
          aria-live="polite"
          className="flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all duration-200 hover:shadow-brand-cta-lg disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
