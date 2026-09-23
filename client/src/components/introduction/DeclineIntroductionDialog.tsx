import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Info, X } from "lucide-react";

interface DeclineIntroductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, customMessage?: string) => Promise<void>;
  requesterName: string;
  contactName: string;
}

const DECLINE_REASONS = [
  {
    value: "dont_know_well",
    label: "I don't know this person well enough",
  },
  {
    value: "misaligned_interests",
    label: "This introduction doesn't align with my contact's interests",
  },
  {
    value: "not_comfortable",
    label: "I'm not comfortable making this introduction",
  },
  {
    value: "prefer_not_to",
    label: "I prefer not to make this introduction",
  },
  {
    value: "other",
    label: "Other (please specify)",
  },
];

export function DeclineIntroductionDialog({
  open,
  onOpenChange,
  onConfirm,
  requesterName,
  contactName,
}: DeclineIntroductionDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedReason("");
      setCustomMessage("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      const reasonLabel =
        DECLINE_REASONS.find((r) => r.value === selectedReason)?.label ||
        selectedReason;
      await onConfirm(reasonLabel, customMessage || undefined);

      // API call succeeded - parent component will close the dialog
      // Form will be reset by useEffect when dialog closes
    } catch (error) {
      // Error is handled in parent component, just stop loading state
      // Dialog stays open so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedReason("");
    setCustomMessage("");
    onOpenChange(false);
  };

  const isOtherSelected = selectedReason === "other";
  const canSubmit =
    selectedReason && (!isOtherSelected || customMessage.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-brand-foreground">
                Decline Introduction Request
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-relaxed text-brand-foreground/90">
                You're declining the request from{" "}
                <span className="font-semibold text-brand-foreground">
                  {requesterName}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-brand-foreground">
                  {contactName}
                </span>
                . Please select a reason to help us improve matching.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="flex items-start gap-2 rounded-xl border border-brand-sky/30 bg-brand-sky/10 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky" />
            <p className="text-[13px] leading-relaxed text-foreground/80">
              <strong className="font-semibold text-foreground">
                Trust score impact:
              </strong>{" "}
              Thoughtful declines (like "don't know well enough") have no
              penalty, but frequent vague declines may reduce your reliability
              score.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Reason for declining</Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
            >
              {DECLINE_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label
                    htmlFor={reason.value}
                    className="font-normal cursor-pointer flex-1 leading-relaxed"
                  >
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {isOtherSelected && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason" className="text-sm font-medium">
                Please specify your reason{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Enter your reason for declining..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {customMessage.length}/500 characters
              </p>
            </div>
          )}

          {!isOtherSelected && selectedReason && (
            <div className="space-y-2">
              <Label
                htmlFor="additional-message"
                className="text-sm font-medium"
              >
                Additional message (optional)
              </Label>
              <Textarea
                id="additional-message"
                placeholder="Add any additional context or message for the requester..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {customMessage.length}/500 characters
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit || isSubmitting}
            className="flex-1 sm:flex-none"
          >
            {isSubmitting ? "Declining..." : "Confirm Decline"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
