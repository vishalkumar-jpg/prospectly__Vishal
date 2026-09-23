import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { AlertCircle, Loader2 } from "lucide-react";
import { domainSchema } from "@/utils/validation";

// Backend ReasonEnum values
const PRIVACY_REASONS = [
  { value: "direct_competitor", label: "Direct Competitor" },
  { value: "conflict_of_interest", label: "Conflict of Interest" },
  { value: "legal_requirements", label: "Legal Requirements" },
  { value: "other", label: "Other" },
] as const;

type PrivacyReason = (typeof PRIVACY_REASONS)[number]["value"];

interface PrivacyFormData {
  domain: string;
  reason: PrivacyReason;
}

// Validate domain using Zod schema
const validateDomain = (domain: string): string | null => {
  // Don't show "Domain is required" error when empty
  if (!domain.trim()) {
    return null;
  }
  const result = domainSchema.safeParse(domain);
  if (!result.success) {
    return result.error.issues[0]?.message;
  }
  return null;
};

interface AddPrivacyRuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddPrivacyRuleDialog({
  isOpen,
  onClose,
  onSuccess,
}: AddPrivacyRuleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<PrivacyFormData>({
    domain: "",
    reason: "other",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [domainValidationError, setDomainValidationError] = useState<
    string | null
  >(null);

  // Reset form
  const resetForm = () => {
    setFormData({
      domain: "",
      reason: "other",
    });
    setFormError(null);
    setDomainValidationError(null);
  };

  // Create mutation - adds to master privacy settings
  const createMutation = useMutation({
    mutationFn: (data: {
      domain: string;
      reason: string;
      hideBounties: boolean;
    }) => api.privacy.create(data),
    onSuccess: async () => {
      setFormError(null);
      resetForm();
      onClose();
      toast({
        title: "Privacy Rule Added",
        description:
          "The privacy rule has been added to your master settings and selected for this request.",
      });
      // Invalidate and refetch privacy rules
      await queryClient.invalidateQueries({
        queryKey: ["/api/privacy"],
      });
      // Call success callback
      onSuccess?.();
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to add privacy rule.";
      // Route domain-related errors to field validation error
      if (errorMessage.toLowerCase().includes("domain")) {
        setDomainValidationError(errorMessage);
        setFormError(null);
      } else {
        setFormError(errorMessage);
        setDomainValidationError(null);
      }
    },
  });

  // Handle domain change with validation
  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDomain = e.target.value;
    setFormData({ ...formData, domain: newDomain });
    // Clear validation error when user starts typing
    if (domainValidationError) {
      setDomainValidationError(null);
    }
    // Validate on change if domain is not empty
    if (newDomain.trim()) {
      const error = validateDomain(newDomain);
      if (error) {
        setDomainValidationError(error);
      }
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Ensure domain is not empty
    if (!formData.domain.trim()) {
      setDomainValidationError("Domain is required");
      return;
    }

    // Validate domain before proceeding with mutation
    const domainError = validateDomain(formData.domain);
    if (domainError) {
      setDomainValidationError(domainError);
      return;
    }

    createMutation.mutate({
      domain: formData.domain.trim(),
      reason: formData.reason,
      hideBounties: true, // Always true for introduction requests
    });
  };

  // Handle dialog close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Privacy</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={formData.domain}
              onChange={handleDomainChange}
              className={
                domainValidationError
                  ? "border-destructive focus:border-destructive focus:ring-destructive"
                  : ""
              }
            />
            <p className="text-xs text-muted-foreground">
              Enter the domain to exclude (e.g., example.com)
            </p>
            {domainValidationError && (
              <div className="flex items-center text-sm text-destructive mt-1">
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>{domainValidationError}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  reason: value as PrivacyReason,
                })
              }
            >
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIVACY_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !formData.domain.trim() ||
                !!domainValidationError
              }
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Rule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
