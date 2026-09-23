import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
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
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  TrendingDown,
  X,
} from "lucide-react";
import { useMarkUnfulfilled } from "@/hooks/useMarkUnfulfilled";
import { useToast } from "@/hooks/use-toast";

const FAILURE_REASON_OPTIONS = [
  { value: "no_response", label: "No response from prospect" },
  { value: "prospect_declined", label: "Prospect declined" },
  { value: "scheduling_issues", label: "Scheduling issues" },
  { value: "no_show", label: "No show at meeting" },
  { value: "invalid_email", label: "Invalid email address" },
  { value: "other", label: "Other" },
];

interface MarkUnfulfilledModalProps {
  isOpen: boolean;
  onClose: () => void;
  introductionId: string;
  introductionStage: string;
  targetName: string;
  onSuccess: () => void;
}

export function MarkUnfulfilledModal({
  isOpen,
  onClose,
  introductionId,
  introductionStage,
  targetName,
  onSuccess,
}: MarkUnfulfilledModalProps) {
  const [failureReason, setFailureReason] = useState<string>("");
  const [failureNotes, setFailureNotes] = useState<string>("");
  const { toast } = useToast();
  const { mutate: markUnfulfilled, isPending } = useMarkUnfulfilled();

  const handleSubmit = () => {
    if (!failureReason || failureNotes.trim().length < 10) {
      toast({
        title: "Error",
        description:
          "Please select a reason and provide at least 10 characters of additional context",
        variant: "destructive",
      });
      return;
    }

    markUnfulfilled(
      {
        requestId: introductionId,
        failureReason,
        failureNotes: failureNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Introduction Marked as Unsuccessful",
            description:
              "The introduction request has been marked as unsuccessful.",
          });
          handleClose();
          onSuccess();
        },
        onError: (error) => {
          toast({
            title: "Error",
            description:
              error instanceof Error
                ? error.message
                : "Failed to mark as unsuccessful",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleClose = () => {
    setFailureReason("");
    setFailureNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-brand-foreground/15 text-brand-foreground transition-colors hover:bg-brand-foreground/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-foreground/20 backdrop-blur">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-brand-foreground">
                Mark as Unsuccessful
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-relaxed text-brand-foreground/90">
                Mark this introduction to{" "}
                <span className="font-semibold text-brand-foreground">
                  {targetName}
                </span>{" "}
                as unsuccessful.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* Trust Score Warning Banner */}
          <div className="flex items-start gap-2 rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-4">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning" />
            <div className="text-[13px] leading-relaxed text-foreground/80">
              <p className="font-semibold text-foreground">
                This will affect your Trust Score
              </p>
              <p className="mt-1">
                Marking introductions as unsuccessful can lower your Trust Score
                over time. A higher Trust Score helps you receive faster payouts
                and builds credibility with requesters.
              </p>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="failure-reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={failureReason} onValueChange={setFailureReason}>
              <SelectTrigger
                id="failure-reason"
                data-testid="select-failure-reason"
              >
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {FAILURE_REASON_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    data-testid={`option-reason-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="failure-notes">
                Additional Notes <span className="text-red-500">*</span>
              </Label>
              <span
                className={`text-[10px] ${
                  failureNotes.length < 10 || failureNotes.length > 255
                    ? "text-red-500 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {failureNotes.length}/255
              </span>
            </div>
            <Textarea
              id="failure-notes"
              data-testid="textarea-failure-notes"
              placeholder="Provide any additional context (minimum 10 characters)..."
              value={failureNotes}
              onChange={(e) => setFailureNotes(e.target.value.slice(0, 255))}
              rows={3}
              className={`resize-none ${
                failureNotes.length > 0 && failureNotes.length < 10
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
            />
            {failureNotes.length > 0 && failureNotes.length < 10 && (
              <div className="flex items-center text-sm text-red-600 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
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
            data-testid="button-cancel-unsuccessful"
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={
              isPending || !failureReason || failureNotes.trim().length < 10
            }
            data-testid="button-confirm-unsuccessful"
            className="flex-1 sm:flex-none"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Mark as Unsuccessful"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
