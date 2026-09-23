import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SavedCandidateSearch } from "@/lib/api/recruitment-candidate-search";
import { cn } from "@/lib/utils";
import {
  DeleteSavedSearchDialog,
  SavedSearchesList,
} from "./SavedSearchesList";

export interface SavedSearchesCardProps {
  savedSearches: SavedCandidateSearch[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onRun: (saved: SavedCandidateSearch) => void;
  runningId: string | null;
  onToggleFavorite: (saved: SavedCandidateSearch) => void;
  onDelete: (saved: SavedCandidateSearch) => void;
  deleting: boolean;
  defaultOpen?: boolean;
}

export function SavedSearchesCard({
  savedSearches,
  loading,
  error,
  onRetry,
  onRun,
  runningId,
  onToggleFavorite,
  onDelete,
  deleting,
  defaultOpen = true,
}: SavedSearchesCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [pendingDelete, setPendingDelete] =
    useState<SavedCandidateSearch | null>(null);

  const ordered = useMemo(
    () =>
      [...savedSearches].sort(
        (a, b) => Number(b.isFavorite) - Number(a.isFavorite)
      ),
    [savedSearches]
  );

  if (!loading && !error && ordered.length === 0) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border bg-card"
    >
      <div className="flex items-center justify-between gap-3 p-4 md:p-5">
        <div className="min-w-0">
          <p className="text-lg font-semibold">
            Saved searches
            {ordered.length > 0 ? (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                • {ordered.length}
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            Quickly rerun your previous candidate searches.
          </p>
        </div>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={
              open ? "Collapse saved searches" : "Expand saved searches"
            }
            className="shrink-0 transition-all duration-200 hover:bg-brand-amethyst/10 hover:text-brand-amethyst focus-visible:ring-2 focus-visible:ring-brand-amethyst"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open && "rotate-180"
              )}
              aria-hidden
            />
          </Button>
        </CollapsibleTrigger>
      </div>

      {open ? (
        <div className="border-t p-4 md:p-5">
          <SavedSearchesList
            ordered={ordered}
            loading={loading}
            error={error}
            runningId={runningId}
            onRetry={onRetry}
            onRun={onRun}
            onToggleFavorite={onToggleFavorite}
            onDelete={setPendingDelete}
          />
        </div>
      ) : null}

      <DeleteSavedSearchDialog
        pending={pendingDelete}
        deleting={deleting}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        onConfirm={onDelete}
      />
    </Collapsible>
  );
}
