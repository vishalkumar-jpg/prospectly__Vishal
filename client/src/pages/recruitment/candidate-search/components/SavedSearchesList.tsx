import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SavedCandidateSearch } from "@/lib/api/recruitment-candidate-search";
import { SavedSearchCard } from "./SavedSearchCard";

export function SavedSearchesList({
  ordered,
  loading,
  error,
  runningId,
  onRetry,
  onRun,
  onToggleFavorite,
  onDelete,
}: {
  ordered: SavedCandidateSearch[];
  loading: boolean;
  error: unknown;
  runningId: string | null;
  onRetry: () => void;
  onRun: (saved: SavedCandidateSearch) => void;
  onToggleFavorite: (saved: SavedCandidateSearch) => void;
  onDelete: (saved: SavedCandidateSearch) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-[148px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
          We couldn't load your saved searches.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map((saved) => (
        <SavedSearchCard
          key={saved.id}
          saved={saved}
          running={runningId === saved.id}
          onRun={() => onRun(saved)}
          onToggleFavorite={() => onToggleFavorite(saved)}
          onDelete={() => onDelete(saved)}
        />
      ))}
    </div>
  );
}

export function DeleteSavedSearchDialog({
  pending,
  deleting,
  onOpenChange,
  onConfirm,
}: {
  pending: SavedCandidateSearch | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (saved: SavedCandidateSearch) => void;
}) {
  return (
    <AlertDialog
      open={pending !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{pending?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the saved search only. The candidates it matched are
            not affected, and this cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={() => {
              if (pending) onConfirm(pending);
              onOpenChange(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting…" : "Delete search"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
