import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Matches `varchar(60)` on `recruitment_saved_searches.title`. */
const MAX_TITLE = 60;

export interface SaveSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefilled for a rename; empty for a new save. */
  initialTitle?: string;
  saving: boolean;
  onSubmit: (title: string) => void;
  /** Summary of what is being saved — "3 filters · 42 candidates". */
  summary?: ReactNode;
}

/**
 * Naming a search is not destructive, so `Dialog`, not `AlertDialog` (§7).
 *
 * The title is the only editable field: the criteria being saved are the ones
 * on screen, and letting them be edited here would mean saving a search the
 * recruiter never actually ran.
 */
export function SaveSearchDialog({
  open,
  onOpenChange,
  initialTitle = "",
  saving,
  onSubmit,
  summary,
}: SaveSearchDialogProps) {
  const [title, setTitle] = useState(initialTitle);

  // Re-seed on open so a cancelled edit does not persist into the next one.
  useEffect(() => {
    if (open) setTitle(initialTitle);
  }, [open, initialTitle]);

  const trimmed = title.trim();
  const canSave = trimmed.length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSave) onSubmit(trimmed);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {initialTitle ? "Rename saved search" : "Save this search"}
            </DialogTitle>
            <DialogDescription>
              {initialTitle
                ? "Give this search a name you'll recognise later."
                : "Save the current filters so you can rerun them in one click."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="saved-search-title" className="text-sm">
              Name
            </Label>
            <Input
              id="saved-search-title"
              value={title}
              autoFocus
              maxLength={MAX_TITLE}
              placeholder="e.g. Senior Accountants — India"
              onChange={(event) => setTitle(event.target.value)}
              className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
            />
            {summary ? (
              <p className="text-xs text-muted-foreground">{summary}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={!canSave}>
              {saving ? "Saving…" : "Save search"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
