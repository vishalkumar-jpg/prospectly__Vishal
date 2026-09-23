import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { DeleteAccountSettingsList } from "./delete-account/delete-account-settings-list";
import { DeleteAccountStepNav } from "./delete-account/delete-account-step-nav";
import {
  // DeleteAccountStep1Preflight,
  // DeleteAccountStep2Export,
  DeleteAccountStep3Survey,
  DeleteAccountStep4Confirm,
} from "./delete-account/delete-account-wizard-panels";
import { DeleteAccountFinalConfirmDialog } from "./delete-account/delete-account-confirm-dialog";
import { DeleteAccountScheduledCard } from "./delete-account/delete-account-scheduled-card";
import {
  OTHER_REASON_LABEL,
  type DeleteAccountSurveyState,
} from "./delete-account/delete-account.constants";

/** Matches profile footer Save / delete actions for consistent CTA width */
export const PROFILE_FOOTER_ACTION_MIN_W_CLASS = "min-w-44";

const EMPTY_SURVEY: DeleteAccountSurveyState = {
  primaryReason: "",
  feedbackText: "",
  additionalDetails: "",
};

type ViewMode = "list" | "wizard";

type AccountDangerZoneProps = {
  /** When true, opens delete wizard on mount (e.g. ?section=settings&delete=1) */
  initialWizardOpen?: boolean;
};

export function AccountDangerZone({
  initialWizardOpen = false,
}: AccountDangerZoneProps) {
  const [view, setView] = useState<ViewMode>(
    initialWizardOpen ? "wizard" : "list"
  );
  const [wizardStep, setWizardStep] = useState(1);
  const [survey, setSurvey] = useState<DeleteAccountSurveyState>(EMPTY_SURVEY);
  const [emailConfirm, setEmailConfirm] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const { logout, refreshUser, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [, setSearchParams] = useSearchParams();

  const userEmail = user?.email ?? "";
  const requestedAt =
    user?.userConfiguration?.accountDeletionRequestedAt ?? null;
  const hasPendingDeletion = Boolean(requestedAt);

  const resetWizard = () => {
    setWizardStep(1);
    setSurvey(EMPTY_SURVEY);
    setEmailConfirm("");
    setConfirmOpen(false);
  };

  const exitWizard = () => {
    resetWizard();
    setView("list");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("delete");
        return next;
      },
      { replace: true }
    );
  };

  const startWizard = () => {
    resetWizard();
    setView("wizard");
  };

  useEffect(() => {
    if (initialWizardOpen && !hasPendingDeletion) {
      startWizard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWizardOpen, hasPendingDeletion]);

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      const surveyPayload =
        survey.primaryReason || survey.feedbackText
          ? {
              primaryReason: survey.primaryReason || "Not specified",
              additionalDetails:
                survey.primaryReason === OTHER_REASON_LABEL
                  ? survey.additionalDetails || undefined
                  : undefined,
              feedbackText: survey.feedbackText || undefined,
            }
          : undefined;

      const data = await api.profiles.deleteAccount(
        true,
        surveyPayload ? { surveyData: surveyPayload } : undefined
      );

      if (data.immediate) {
        toast({
          title: "Account deleted",
          description: "Your session has ended.",
        });
        await logout();
        navigate("/sign-in", { replace: true });
        return;
      }

      toast({
        title: "Account Deletion Scheduled",
        description:
          "Your account is scheduled for permanent removal within 24 hours.",
      });

      try {
        await refreshUser();
      } catch {
        toast({
          title: "Update Pending",
          description:
            "Request succeeded, but local state may take a moment to refresh.",
        });
      }
      exitWizard();
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Could not schedule deletion",
        description: e instanceof Error ? e.message : "Try again later.",
      });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const handleCancelDeletion = async () => {
    setCancelLoading(true);
    try {
      await api.profiles.cancelDeleteAccount();
      toast({
        title: "Deletion Request Cancelled",
        description:
          "The account deletion process has been successfully cancelled.",
      });
      try {
        await refreshUser();
      } catch {
        toast({
          title: "Update Pending",
          description:
            "Request succeeded, but local state may take a moment to refresh.",
        });
      }
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Could not cancel",
        description: e instanceof Error ? e.message : "Try again later.",
      });
    } finally {
      setCancelLoading(false);
      setCancelOpen(false);
    }
  };

  if (hasPendingDeletion) {
    return (
      <DeleteAccountScheduledCard
        cancelOpen={cancelOpen}
        onCancelOpenChange={setCancelOpen}
        cancelLoading={cancelLoading}
        onConfirmCancel={handleCancelDeletion}
      />
    );
  }

  if (view === "wizard") {
    return (
      <div className="space-y-4">
        <DeleteAccountStepNav
          currentStep={wizardStep}
          onStepSelect={(stepId) => {
            if (stepId <= wizardStep) setWizardStep(stepId);
          }}
        />
        {/* Commented out per request: pre-flight step (was step 1).
        <DeleteAccountStep1Preflight
          onCancel={exitWizard}
          onContinue={() => setWizardStep(2)}
        />
        */}
        {/* Commented out per request: export step (was step 2).
        <DeleteAccountStep2Export
          userEmail={userEmail}
          onBack={() => setWizardStep(1)}
          onSkip={() => setWizardStep(2)}
          onContinue={() => setWizardStep(2)}
        />
        */}
        {wizardStep === 1 && (
          <DeleteAccountStep3Survey
            survey={survey}
            onSurveyChange={setSurvey}
            onBack={exitWizard}
            onSkip={() => setWizardStep(2)}
            onContinue={() => setWizardStep(2)}
          />
        )}
        {wizardStep === 2 && (
          <DeleteAccountStep4Confirm
            userEmail={userEmail}
            emailConfirm={emailConfirm}
            onEmailConfirmChange={setEmailConfirm}
            onBack={() => setWizardStep(1)}
            onDeleteClick={() => setConfirmOpen(true)}
            deleteDisabled={loading}
          />
        )}
        <DeleteAccountFinalConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          loading={loading}
          onConfirm={handleConfirmDelete}
        />
      </div>
    );
  }

  return <DeleteAccountSettingsList onDeleteClick={startWizard} />;
}
