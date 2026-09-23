import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle, Info, Lock, X } from "lucide-react";
import { domainSchema } from "@/utils/validation";

export interface PrivacyData {
  domain: string;
  reason: string;
  hideProfile: boolean;
  hideBounties: boolean;
  excludeFromSearch: boolean;
}

export interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PrivacyData) => void;
  editMode?: boolean;
  initialData?: PrivacyData | null;
  isLoading?: boolean;
  error?: string | null;
}

// Validate domain using Zod schema
const validateDomain = (domain: string): string | null => {
  const result = domainSchema.safeParse(domain);
  if (!result.success) {
    return (
      result.error.issues[0]?.message || "Please enter a valid domain name"
    );
  }
  return null;
};

export function AddDialog({
  open,
  onOpenChange,
  onSave,
  editMode = false,
  initialData = null,
  isLoading = false,
  error = null,
}: AddDialogProps) {
  const [domain, setDomain] = useState("");
  const [reason, setReason] = useState("direct_competitor");
  const [hideProfile, setHideProfile] = useState(false);
  const [hideBounties, setHideBounties] = useState(false);
  const [excludeFromSearch, setExcludeFromSearch] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const previousErrorRef = useRef<string | null>(null);

  // Initialize form with initialData when in edit mode
  useEffect(() => {
    if (open) {
      if (editMode && initialData) {
        setDomain(initialData.domain);
        setReason(initialData.reason);
        setHideProfile(initialData.hideProfile);
        setHideBounties(initialData.hideBounties);
        setExcludeFromSearch(initialData.excludeFromSearch);
      } else {
        // Reset form for create mode
        setDomain("");
        setReason("direct_competitor");
        setHideProfile(false);
        setHideBounties(false);
        setExcludeFromSearch(false);
      }
      // Clear errors when dialog opens
      setValidationError(null);
      previousErrorRef.current = null;
    }
  }, [open, editMode, initialData]);

  useEffect(() => {
    if (error) {
      setValidationError(error);
      previousErrorRef.current = error;
    } else {
      // Clear error if error prop is null/undefined
      if (previousErrorRef.current !== null) {
        setValidationError(null);
        previousErrorRef.current = null;
      }
    }
  }, [error]);

  // Clear validation error when domain changes
  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDomain = e.target.value;
    setDomain(newDomain);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
    // Validate on change if domain is not empty
    if (newDomain.trim()) {
      const error = validateDomain(newDomain);
      if (error) {
        setValidationError(error);
      }
    }
  };

  const handleSubmit = () => {
    if (!domain.trim() || isLoading) {
      return;
    }

    // Validate domain before submission
    const domainError = validateDomain(domain);
    if (domainError) {
      setValidationError(domainError);
      return;
    }

    onSave({
      domain: domain.trim(),
      reason,
      hideProfile,
      hideBounties,
      excludeFromSearch,
    });
  };

  const handleCancel = () => {
    // Reset form
    if (!editMode) {
      setDomain("");
      setReason("direct_competitor");
      setHideProfile(false);
      setHideBounties(false);
      setExcludeFromSearch(false);
    }
    // Clear errors when canceling
    setValidationError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        mobileFullscreen
        hideCloseButton
      >
        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3.5 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                {editMode ? "Edit Privacy" : "Add Privacy"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-relaxed text-white/90">
                Block a company from accessing information about your
                introduction requests
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start gap-2 rounded-lg bg-brand-amethyst/10 p-3 text-xs text-brand-amethyst">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <strong>Important:</strong> Privacy rules you add or update will
                only apply to new introduction requests. They will not affect
                introduction requests that have already been sent in the past.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacyDomain">
                Domain <span className="text-destructive">*</span>
              </Label>
              <Input
                id="privacyDomain"
                placeholder="example.com"
                value={domain}
                onChange={handleDomainChange}
                className={
                  validationError
                    ? "border-destructive focus:border-destructive focus:ring-destructive"
                    : ""
                }
              />
              {validationError && (
                <div className="flex items-center text-sm text-destructive mt-1">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacyReason">Reason</Label>
              <select
                id="privacyReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="direct_competitor">Direct Competitor</option>
                <option value="conflict_of_interest">
                  Conflict of Interest
                </option>
                <option value="legal_requirements">Legal Requirements</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-3">
              <Label>What should be blocked?</Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="hideBounties"
                    checked={hideBounties}
                    onCheckedChange={(checked) => setHideBounties(!!checked)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="hideBounties"
                    className="text-sm leading-snug"
                  >
                    Hide my introduction requests from their users
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!domain.trim() || isLoading}
              className="flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:flex-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editMode ? "Saving..." : "Adding..."}
                </>
              ) : editMode ? (
                "Save Changes"
              ) : (
                "Add Privacy Block"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
