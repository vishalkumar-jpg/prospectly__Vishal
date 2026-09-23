import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Mail, Pencil, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { consentCandidateEmailSchema } from "@/schemas/connector-resume-upload";
import {
  useConsentEmailForEdit,
  useUpdateConsentEmail,
} from "@/hooks/useConsent";
import { useToast } from "@/hooks/use-toast";

type ChangeConsentEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string | null;
  candidateName: string;
  onSuccess?: () => void;
};

export function ChangeConsentEmailDialog({
  open,
  onOpenChange,
  matchId,
  candidateName,
  onSuccess,
}: ChangeConsentEmailDialogProps) {
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { data, isLoading, isError, refetch } = useConsentEmailForEdit(
    open ? matchId : null
  );
  const updateMutation = useUpdateConsentEmail();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setEmail("");
      setInitialEmail("");
      setTouched(false);
      setSubmitAttempted(false);
      return;
    }
    if (data?.email) {
      setEmail(data.email);
      setInitialEmail(data.email);
    }
  }, [open, data?.email]);

  const validation = useMemo(() => {
    const parsed = consentCandidateEmailSchema.safeParse(email);
    const normalizedCurrent = email.trim().toLowerCase();
    const normalizedInitial = initialEmail.trim().toLowerCase();
    const isUnchanged =
      normalizedInitial.length > 0 && normalizedCurrent === normalizedInitial;

    const formatError = parsed.success
      ? null
      : (parsed.error.issues[0]?.message ?? "Invalid email address");

    const unchangedError = parsed.success && isUnchanged
      ? "This is already the saved consent email. Enter a new address to send consent."
      : null;

    return {
      isValid: parsed.success && !isUnchanged,
      formatError,
      unchangedError,
    };
  }, [email, initialEmail]);

  const showFormatError =
    (touched || submitAttempted) && validation.formatError != null;
  const showUnchangedError =
    submitAttempted && validation.unchangedError != null;
  const displayError =
    showUnchangedError
      ? validation.unchangedError
      : showFormatError
        ? validation.formatError
        : null;

  const handleSave = async () => {
    if (!matchId || updateMutation.isPending || isLoading || isError) return;

    setSubmitAttempted(true);
    setTouched(true);

    const parsed = consentCandidateEmailSchema.safeParse(email);
    if (!parsed.success || !validation.isValid) return;

    try {
      const result = await updateMutation.mutateAsync({
        matchId,
        email: parsed.data,
      });
      toast({
        title: result.linkedExistingContact
          ? "Linked to existing profile"
          : "Consent email updated",
        description: result.message,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = (err as { message?: string })?.message;
      toast({
        title: "Could not update email",
        description: message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileFullscreen className="gap-6 sm:max-w-lg">
        <DialogHeader className="space-y-3 pr-8 text-left">
          <DialogTitle className="flex items-center gap-2 text-left">
            <Pencil className="h-5 w-5 shrink-0 text-brand-amethyst" />
            Change candidate email
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed">
            Update the email where the consent request will be sent for{" "}
            <span className="font-medium text-foreground">{candidateName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="consent-email">
              Email <span className="text-destructive">*</span>
            </Label>
            {isLoading ? (
              <div className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading current email…
              </div>
            ) : isError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p>Could not load the current email.</p>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-red-700"
                      onClick={() => refetch()}
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Input
                  id="consent-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  className={cn(
                    displayError &&
                      "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {displayError ? (
                  <p className="text-sm text-red-600">{displayError}</p>
                ) : null}
              </>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Mail className="h-4 w-4 shrink-0" />
              What happens when you save
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-amber-800">
              <li>A new consent email goes to the updated address</li>
              <li>The link sent to the old email will no longer work</li>
              <li>The candidate must use the new email to accept consent</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading || isError}
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Save &amp; Send Consent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
