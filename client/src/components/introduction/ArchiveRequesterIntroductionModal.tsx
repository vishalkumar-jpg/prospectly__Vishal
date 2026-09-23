import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, AlertTriangle, Archive, Loader2, X } from "lucide-react";
import { useArchiveRequesterIntroduction } from "@/hooks/useArchiveRequesterIntroduction";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import { REQUESTER_ARCHIVE_REASON_OPTIONS } from "@/constants/requester-archive-reasons";

interface ArchiveRequesterIntroductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  introductionId: string;
  prospectName: string;
  onSuccess: () => void;
}

export function ArchiveRequesterIntroductionModal({
  isOpen,
  onClose,
  introductionId,
  prospectName,
  onSuccess,
}: ArchiveRequesterIntroductionModalProps) {
  const [archiveReason, setArchiveReason] = useState<string>("");
  const [archiveNotes, setArchiveNotes] = useState<string>("");
  const { toast } = useToast();
  const { mutate: archiveIntro, isPending } = useArchiveRequesterIntroduction();

  const notesTrimmedLength = archiveNotes.trim().length;
  const isNotesValid = notesTrimmedLength >= 10 && notesTrimmedLength <= 255;
  const canSubmit = Boolean(archiveReason) && isNotesValid;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    archiveIntro(
      {
        requestId: introductionId,
        archiveReason,
        archiveNotes: archiveNotes.trim(),
      },
      {
        onSuccess: (response) => {
          toast({
            title: "Introduction withdrawn",
            description:
              response?.message ?? "Your request has been withdrawn.",
          });
          handleClose();
          onSuccess();
        },
        onError: (error) => {
          const message =
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Failed to withdraw this introduction.";
          toast({
            title: "Could not withdraw",
            description: message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleClose = () => {
    setArchiveReason("");
    setArchiveNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        mobileFullscreen
        hideCloseButton
      >
        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-brand-destructive to-brand-destructive/80 p-6 text-brand-foreground">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose
            className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-brand-foreground/15 text-brand-foreground transition-colors hover:bg-brand-foreground/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/60"
            disabled={isPending}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-foreground/20 backdrop-blur">
              <Archive className="h-5 w-5" />
            </div>
            <div className="min-w-0 pr-10">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-brand-foreground">
                Withdraw this introduction
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-relaxed text-brand-foreground/90">
                You are about to withdraw your request for an introduction to{" "}
                <span className="font-semibold text-brand-foreground">
                  {prospectName}
                </span>
                . This cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* Refund warning */}
          <div className="flex items-start gap-2 rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning" />
            <p className="text-[13px] leading-relaxed text-foreground/80">
              Uncaptured authorizations for the remaining balance will be
              released (voided). If the <strong>5% initial</strong> charge was
              already captured, we submit a <strong>refund</strong> for the
              referral payout portion of that charge (card processing fees are
              non-refundable); refunds typically take 5–10 business days to
              appear on your statement.
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="archive-reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={archiveReason} onValueChange={setArchiveReason}>
              <SelectTrigger id="archive-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="z-[90] w-[var(--radix-select-trigger-width)] min-w-0">
                {REQUESTER_ARCHIVE_REASON_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="whitespace-normal break-words py-2"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="archive-notes">
                Additional details <span className="text-red-500">*</span>
              </Label>
              <span
                className={`text-[10px] shrink-0 ${
                  notesTrimmedLength < 10 || notesTrimmedLength > 255
                    ? "text-red-500 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {notesTrimmedLength}/255
              </span>
            </div>
            <Textarea
              id="archive-notes"
              placeholder="Provide any additional context (minimum 10 characters)..."
              value={archiveNotes}
              onChange={(e) => setArchiveNotes(e.target.value.slice(0, 255))}
              rows={4}
              className={`resize-none ${
                notesTrimmedLength > 0 && notesTrimmedLength < 10
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
            />
            {notesTrimmedLength > 0 && notesTrimmedLength < 10 && (
              <div className="mt-1 flex items-center text-sm text-destructive">
                <AlertCircle className="mr-1 h-4 w-4 shrink-0" />
                Please provide at least 10 characters.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            className="flex-1 sm:flex-none"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Withdraw introduction"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
