import { ArrowRight, Loader2, Search, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { utcDayjs } from "@/lib/dayjs";
import type { SavedCandidateSearch } from "@/lib/api/recruitment-candidate-search";
import { cn } from "@/lib/utils";

function describe(saved: SavedCandidateSearch): string {
  const c = saved.criteria;
  const parts: string[] = [];

  if (c.query) parts.push(`“${c.query}”`);
  if (c.scoreMin != null) parts.push(`${c.scoreMin}%+ match`);
  if (c.countries?.length) parts.push(c.countries.slice(0, 2).join(", "));
  if (c.workModes?.length) parts.push(c.workModes.slice(0, 2).join(", "));

  if (c.experienceMin != null && c.experienceMax != null) {
    parts.push(`${c.experienceMin}–${c.experienceMax} yrs`);
  } else if (c.experienceMin != null) {
    parts.push(`${c.experienceMin}+ yrs`);
  } else if (c.experienceMax != null) {
    parts.push(`up to ${c.experienceMax} yrs`);
  }

  return parts.length > 0 ? parts.join(" · ") : "No filters — everyone";
}

export function SavedSearchCard({
  saved,
  running,
  onRun,
  onToggleFavorite,
  onDelete,
}: {
  saved: SavedCandidateSearch;
  running: boolean;
  onRun: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  const count = saved.resultCountAtSave;

  return (
    <article className="relative flex flex-col gap-1 rounded-lg border bg-card p-3.5 transition-all duration-200 hover:shadow-sm">
      <div className="flex items-start gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
          <Search className="h-4 w-4" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 truncate pt-1.5 text-sm font-semibold">
          {saved.title}
        </p>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={saved.isFavorite}
          aria-label={
            saved.isFavorite
              ? `Remove ${saved.title} from favourites`
              : `Add ${saved.title} to favourites`
          }
          className="shrink-0 rounded-full p-1 transition-all duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst"
        >
          <Star
            className={cn(
              "h-4 w-4",
              saved.isFavorite
                ? "fill-brand-star text-brand-star-deep"
                : "text-muted-foreground"
            )}
            aria-hidden
          />
        </button>
      </div>

      <p className="truncate text-xs text-muted-foreground">
        {describe(saved)}
      </p>
      <p className="text-xs text-muted-foreground">
        {count == null
          ? "Count recorded on next run"
          : `${count.toLocaleString()} candidate${count === 1 ? "" : "s"} when saved`}
      </p>
      <p className="text-xs text-muted-foreground/70">
        Saved {utcDayjs(saved.createdAt).local().format("MMM D, YYYY")}
      </p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onRun}
          disabled={running}
          className="h-auto gap-1 p-0 text-xs text-brand-rose transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
        >
          {running ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : null}
          Run search
          {running ? null : <ArrowRight className="h-3 w-3" aria-hidden />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label={`Delete ${saved.title}`}
          className="h-auto p-1 text-muted-foreground transition-all duration-200 hover:bg-brand-amethyst/10 hover:text-brand-amethyst focus-visible:ring-2 focus-visible:ring-brand-amethyst"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </article>
  );
}
