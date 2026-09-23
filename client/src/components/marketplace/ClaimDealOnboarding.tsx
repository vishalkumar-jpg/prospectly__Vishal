import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { DollarSign, UserPlus, Upload, Users, Shield } from "lucide-react";
import { useRequestClaim } from "@/contexts/RequestClaimContext";
import {
  type ClaimRequestInfo,
  type ClaimDealInfo,
  type OnboardingStep,
  type StepStatus,
  ClaimSuccessState,
  ClaimFailureState,
  ClaimStepsList,
} from "./claim-onboarding";

// Re-export types for backwards compatibility
export type {
  ClaimIntroductionInfo,
  ClaimDealInfo,
  ClaimRequestInfo,
} from "./claim-onboarding";

interface ClaimRequestOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestInfo: ClaimRequestInfo | null;
  onComplete?: () => void;
  onFailed?: (reason: string) => void;
}

export function ClaimRequestOnboarding({
  open,
  onOpenChange,
  requestInfo,
  onComplete,
  onFailed,
}: ClaimRequestOnboardingProps) {
  const { triggerVerification, isLoading: isContextLoading } =
    useRequestClaim();

  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  useEffect(() => {
    if (requestInfo) {
      setSteps([
        {
          id: "signup",
          title: "Account Created",
          description: "You've signed up with Google",
          status: "completed",
          icon: UserPlus,
        },
        {
          id: "import_contacts",
          title: "Import Your Contacts",
          description:
            "Import from Google, Microsoft, Apple, or LinkedIn to verify your network",
          status: "pending",
          icon: Upload,
          actionLabel: "Import Contacts",
        },
        {
          id: "verify_prospect",
          title: "Verify Prospect Connection",
          description: `Confirming ${requestInfo.prospectName} is in your network`,
          status: "pending",
          icon: Users,
        },
        {
          id: "verify_connector",
          title: "Verify Connector Connection",
          description: requestInfo.connectorName
            ? `Confirming ${requestInfo.connectorName} is in your network`
            : "Confirming the connector is in your network",
          status: "pending",
          icon: Shield,
        },
      ]);
      setCurrentStepIndex(1);
      // Reset state when new request info is provided
      setVerificationComplete(false);
      setVerificationFailed(false);
      setFailureReason(null);
    }
  }, [requestInfo]);

  const updateStepStatus = (
    stepId: string,
    status: StepStatus,
    failureReason?: string
  ) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, failureReason } : step
      )
    );
  };

  const handleImportContacts = async () => {
    updateStepStatus("import_contacts", "in_progress");
    // Simulate contact import - in production, this would trigger actual OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 2000));
    updateStepStatus("import_contacts", "completed");
    setCurrentStepIndex(2);
    runVerification();
  };

  const runVerification = async () => {
    setIsVerifying(true);
    updateStepStatus("verify_prospect", "in_progress");

    try {
      // Use real API verification through context
      const prospectVerified = await triggerVerification();

      if (prospectVerified) {
        updateStepStatus("verify_prospect", "completed");
        setCurrentStepIndex(3);
        updateStepStatus("verify_connector", "in_progress");

        // Second verification step for connector
        const connectorVerified = await triggerVerification();

        if (connectorVerified) {
          updateStepStatus("verify_connector", "completed");
          setVerificationComplete(true);
          onComplete?.();
        } else {
          updateStepStatus(
            "verify_connector",
            "failed",
            "The person who shared this introduction opportunity was not found in your network"
          );
          setVerificationFailed(true);
          setFailureReason(
            "The person who shared this introduction opportunity was not found in your network. Both you and the connector must know each other for the claim to succeed."
          );
          onFailed?.(
            "The person who shared this introduction opportunity was not found in your network"
          );
        }
      } else {
        updateStepStatus(
          "verify_prospect",
          "failed",
          `${requestInfo?.prospectName} was not found in your imported contacts`
        );
        setVerificationFailed(true);
        setFailureReason(
          `We couldn't find ${requestInfo?.prospectName} in your imported contacts. Make sure you have their contact information in your address book and try importing again.`
        );
        onFailed?.(
          `${requestInfo?.prospectName} was not found in your contacts`
        );
      }
    } catch {
      updateStepStatus(
        "verify_prospect",
        "failed",
        "Verification failed due to an error"
      );
      setVerificationFailed(true);
      setFailureReason(
        "An error occurred during verification. Please try again."
      );
      onFailed?.("Verification failed due to an error");
    }

    setIsVerifying(false);
  };

  const handleRetry = () => {
    setVerificationFailed(false);
    setFailureReason(null);
    setSteps((prev) =>
      prev.map((step) =>
        step.status === "failed" ? { ...step, status: "pending" } : step
      )
    );
    setCurrentStepIndex(1);
  };

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progressPercent =
    steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  if (!requestInfo) return null;

  // Convert requestInfo to the format expected by success state
  const dealInfoForDisplay: ClaimDealInfo = {
    requestId: requestInfo.requestId,
    prospectName: requestInfo.prospectName,
    prospectCompany: requestInfo.prospectCompany,
    bountyAmount: requestInfo.bountyAmount,
    claimerShare: requestInfo.claimerShare,
    connectorName: requestInfo.connectorName,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                {verificationComplete
                  ? "Introduction Claimed!"
                  : verificationFailed
                    ? "Verification Failed"
                    : "Claim This Introduction"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {verificationComplete
                  ? "You're all set to make the introduction"
                  : verificationFailed
                    ? "We couldn't verify your network connection"
                    : "Complete these steps to claim your referral payout"}
              </DialogDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xl font-bold text-green-600">
                <DollarSign className="h-5 w-5" />
                {requestInfo.claimerShare}
              </div>
              <p className="text-xs text-muted-foreground">Your share</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {completedSteps} of {steps.length} complete
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </DialogHeader>

        <div className="p-6 pt-4">
          {verificationComplete && (
            <ClaimSuccessState
              dealInfo={dealInfoForDisplay}
              onClose={() => onOpenChange(false)}
            />
          )}
          {verificationFailed && (
            <ClaimFailureState
              failureReason={failureReason}
              onClose={() => onOpenChange(false)}
              onRetry={handleRetry}
            />
          )}
          {!verificationComplete && !verificationFailed && (
            <ClaimStepsList
              steps={steps}
              currentStepIndex={currentStepIndex}
              isVerifying={isVerifying || isContextLoading}
              onImportContacts={handleImportContacts}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Backwards compatibility wrapper for old "deal" terminology
interface ClaimDealOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealInfo: ClaimDealInfo | null;
  onComplete?: () => void;
  onFailed?: (reason: string) => void;
}

/** @deprecated Use ClaimRequestOnboarding instead */
export function ClaimDealOnboarding({
  open,
  onOpenChange,
  dealInfo,
  onComplete,
  onFailed,
}: ClaimDealOnboardingProps) {
  // Convert dealInfo to requestInfo format
  const requestInfo: ClaimRequestInfo | null = dealInfo
    ? {
        requestId:
          (dealInfo as { requestId?: string }).requestId ||
          (dealInfo as { dealId?: string }).dealId ||
          dealInfo.requestId ||
          "",
        prospectName: dealInfo.prospectName,
        prospectCompany: dealInfo.prospectCompany,
        bountyAmount: dealInfo.bountyAmount,
        claimerShare: dealInfo.claimerShare,
        connectorName: dealInfo.connectorName,
      }
    : null;

  return (
    <ClaimRequestOnboarding
      open={open}
      onOpenChange={onOpenChange}
      requestInfo={requestInfo}
      onComplete={onComplete}
      onFailed={onFailed}
    />
  );
}

export default ClaimDealOnboarding;
