import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { XCircle, DollarSign, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanCandidate } from "./types";

const REJECTION_CATEGORIES = [
  "Not a fit",
  "Position filled",
  "Insufficient experience",
  "Overqualified",
  "Cultural mismatch",
  "Salary expectations",
  "Other",
] as const;

const MIN_NOTE_LENGTH = 50;

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: KanbanCandidate | null;
  onConfirm: (
    category: string,
    note: string,
    options?: { onSuccess?: () => void }
  ) => void;
  isPending?: boolean;
}

export default function RejectDialog({
  open,
  onOpenChange,
  candidate,
  onConfirm,
  isPending,
}: RejectDialogProps) {
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState({ category: false, note: false });

  const trimmedNote = note.trim();
  const noteError =
    touched.note && trimmedNote.length < MIN_NOTE_LENGTH
      ? `Minimum ${MIN_NOTE_LENGTH} characters required (${trimmedNote.length}/${MIN_NOTE_LENGTH})`
      : "";
  const categoryError =
    touched.category && !category ? "Please select a reason" : "";
  const isValid = !!category && trimmedNote.length >= MIN_NOTE_LENGTH;

  if (!candidate) return null;

  const handleClose = (value: boolean) => {
    if (!value) {
      setCategory("");
      setNote("");
      setTouched({ category: false, note: false });
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg max-sm:rounded-none"
        mobileFullscreen
        hideCloseButton
      >
        {/* Brand hero header */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-6 py-5 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm">
              <XCircle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
              Reject Candidate
            </DialogTitle>
          </div>
          <DialogDescription className="relative mt-2 text-[13px] leading-relaxed text-white/90">
            Reject{" "}
            <b className="font-extrabold text-white">{candidate.anonymousId}</b>{" "}
            from this position.
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {candidate.stage === "shortlisted" && (
            <div className="flex items-start gap-3 rounded-2xl border border-brand-warning/20 bg-brand-warning/10 p-4 text-[12.5px] leading-relaxed text-brand-warning">
              <DollarSign className="mt-px h-[18px] w-[18px] shrink-0" />
              <p>
                The authorized payment for this candidate will be{" "}
                <b className="font-extrabold">automatically released</b> and you
                will not be charged.
              </p>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-[13px] font-bold">
              Reason <span className="text-brand-destructive">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(val) => {
                setCategory(val);
                setTouched((t) => ({ ...t, category: true }));
              }}
              onOpenChange={(o) => {
                if (!o) {
                  setTouched((t) => ({ ...t, category: true }));
                }
              }}
            >
              <SelectTrigger
                className={cn(categoryError && "border-brand-destructive")}
              >
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryError && (
              <p className="mt-1 text-xs text-brand-destructive">
                {categoryError}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Label className="text-[13px] font-bold">
                Additional Notes{" "}
                <span className="text-brand-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                (minimum {MIN_NOTE_LENGTH} characters)
              </span>
            </div>
            <Textarea
              placeholder="Provide additional context..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, note: true }))}
              rows={3}
              maxLength={500}
              className={cn(noteError && "border-brand-destructive")}
            />
            <div className="mt-1 flex items-center justify-between">
              {noteError ? (
                <p className="text-xs text-brand-destructive">{noteError}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">{note.length}/500</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-border bg-background px-6 py-4 max-sm:[&>button]:flex-1">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!isValid || isPending}
            onClick={() => {
              if (!isValid) {
                setTouched({ category: true, note: true });
                return;
              }
              onConfirm(category, trimmedNote, {
                onSuccess: () => {
                  setCategory("");
                  setNote("");
                  setTouched({ category: false, note: false });
                },
              });
            }}
          >
            {isPending ? "Rejecting..." : "Reject Candidate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
