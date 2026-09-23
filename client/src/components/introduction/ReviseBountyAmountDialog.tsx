import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  clampFormattedInteger,
  formatIntegerWithCommas,
} from "@/lib/formatted-integer";

interface ReviseBountyAmountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectorBountyAmount?: number;
  requesterBountyAmount?: number;
  contactId: number | string | null | undefined;
  onSuccess?: () => void;
}

export function ReviseBountyAmountDialog({
  open,
  onOpenChange,
  connectorBountyAmount,
  requesterBountyAmount,
  contactId,
  onSuccess,
}: ReviseBountyAmountDialogProps) {
  const { toast } = useToast();
  const [newBountyAmount, setNewBountyAmount] = useState<string>("");
  const [isUpdatingBounty, setIsUpdatingBounty] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (requesterBountyAmount !== undefined) {
        setNewBountyAmount(requesterBountyAmount.toString());
      } else {
        setNewBountyAmount("");
      }
    }
  }, [open, requesterBountyAmount]);

  const handleUpdateBounty = async () => {
    if (!contactId) {
      toast({
        title: "Error",
        description: "Contact ID is missing. Cannot update referral payout.",
        variant: "destructive",
      });
      return;
    }

    // Validate: must be a number
    if (!newBountyAmount || newBountyAmount.trim() === "") {
      toast({
        title: "Invalid Amount",
        description: "Please enter a referral payout amount.",
        variant: "destructive",
      });
      return;
    }

    const bountyValue = parseFloat(newBountyAmount);

    // Validate: must be a valid number
    if (isNaN(bountyValue)) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number.",
        variant: "destructive",
      });
      return;
    }

    // Validate: must be a whole number (no decimals)
    if (!Number.isInteger(bountyValue)) {
      toast({
        title: "Invalid Amount",
        description:
          "Referral payout amount must be a whole number (no decimals allowed).",
        variant: "destructive",
      });
      return;
    }

    // Validate: must be greater than 0
    if (bountyValue <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Referral payout amount must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Validate: must not be negative (additional check)
    if (bountyValue < 0) {
      toast({
        title: "Invalid Amount",
        description: "Referral payout amount cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    // Validate: must not exceed maximum allowed (999,999)
    const MAX_BOUNTY_AMOUNT = 999999;
    if (bountyValue > MAX_BOUNTY_AMOUNT) {
      toast({
        title: "Amount Too High",
        description: `Referral payout amount cannot exceed $${MAX_BOUNTY_AMOUNT.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    if (
      requesterBountyAmount !== undefined &&
      bountyValue > requesterBountyAmount
    ) {
      toast({
        title: "Referral Payout Too High",
        description: `Your referral payout must be $${requesterBountyAmount} or less to accept this request.`,
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingBounty(true);

    try {
      // Update bounty amount
      await api.contacts.updateBountyAmount(
        Number(contactId),
        bountyValue.toString()
      );

      toast({
        title: "Referral Payout Updated",
        description:
          "Your referral payout has been updated. You can now accept this request.",
      });

      // Close the dialog
      onOpenChange(false);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update referral payout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingBounty(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        mobileFullscreen
        hideCloseButton
      >
        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-brand-foreground">
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
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-brand-foreground">
                Revise Referral Payout
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-relaxed text-brand-foreground/90">
                Adjust your referral payout amount to accept this introduction
                request.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {connectorBountyAmount !== undefined &&
            requesterBountyAmount !== undefined && (
              <div className="flex items-start gap-2 rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-4">
                <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning" />
                <p className="text-[13px] leading-relaxed text-foreground/80">
                  Your current referral payout ($
                  {connectorBountyAmount.toLocaleString()}) is higher than the
                  requester's referral payout ($
                  {requesterBountyAmount.toLocaleString()}). Please set your
                  referral payout to ${requesterBountyAmount.toLocaleString()}{" "}
                  or less to accept this request.
                </p>
              </div>
            )}

          <div className="space-y-2">
            <Label htmlFor="new-bounty-amount">New Referral Payout</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-bounty-amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={
                  newBountyAmount === ""
                    ? ""
                    : formatIntegerWithCommas(Number(newBountyAmount) || 0)
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || value.replace(/,/g, "").trim() === "") {
                    setNewBountyAmount("");
                    return;
                  }
                  if (value.includes(".")) return;
                  const numValue = clampFormattedInteger(value, 999999);
                  if (numValue === null) return;
                  setNewBountyAmount(String(numValue));
                }}
                onKeyDown={(e) => {
                  // Prevent negative sign, 'e', 'E', '+', and decimal point
                  if (
                    e.key === "-" ||
                    e.key === "e" ||
                    e.key === "E" ||
                    e.key === "+" ||
                    e.key === "."
                  ) {
                    e.preventDefault();
                  }
                }}
                placeholder={
                  requesterBountyAmount != null
                    ? formatIntegerWithCommas(requesterBountyAmount)
                    : "1"
                }
                disabled={isUpdatingBounty}
                className="pl-9"
              />
            </div>
            <div className="space-y-1">
              {requesterBountyAmount !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Maximum allowed for this request: $
                  {requesterBountyAmount.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                System maximum: $999,999
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdatingBounty}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="brand"
            onClick={handleUpdateBounty}
            disabled={isUpdatingBounty}
            className="flex-1 sm:flex-none"
          >
            {isUpdatingBounty ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Update Referral Payout
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
