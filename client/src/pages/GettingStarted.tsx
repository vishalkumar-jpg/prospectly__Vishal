import { useState, useEffect, useCallback, DragEvent } from "react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader } from "@/components/ui/loader";
import {
  getGettingStartedProgressQueryKey,
  useGettingStartedProgress,
} from "@/hooks/useGettingStartedProgress";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { GettingStartedProgress } from "@/lib/api/getting-started";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import GoogleContactsModal from "@/components/GoogleContactsModal";
import MicrosoftContactsModal from "@/components/MicrosoftContactsModal";
import AppleContactsModal from "@/components/AppleContactsModal";
import { ImportPreviewModal } from "@/components/ImportPreviewModal";
import LinkedInConnectionsSection from "@/components/getting-started/linkedInConnectionsSection";
import { useContactSourceStatus } from "@/hooks/useContactSourceStatus";
import { useRefreshContactData } from "@/hooks/useRefreshContactData";
import { getContactCsvTemplateHeaders } from "@/utils/csvImport";
import { useAuth } from "@/contexts/AuthContext";
import { WelcomeSubscriptionPopup } from "@/components/WelcomeSubscriptionPopup";
import { VerifyConnectionBanner } from "@/components/getting-started/verifyConnectionBanner";
import { useClaimVerification } from "@/hooks/use-claim-verification";
import { useRequestClaim } from "@/contexts/RequestClaimContext";
import { GettingStartedStepTabs } from "@/components/getting-started/stepTabs";
import { GettingStartedConnectSection } from "@/components/getting-started/connectSection";
import {
  GettingStartedSourceCards,
  type SourceImportOption,
} from "@/components/getting-started/sourceCards";
import { ChooseFocusStep } from "@/components/getting-started/chooseFocusStep";
import { GetGoingStep } from "@/components/getting-started/getGoingStep";
import { GettingStartedStepFooter } from "@/components/getting-started/stepFooter";
import { GettingStartedCsvImportModal } from "@/components/getting-started/import-modal/csvImportModal";
import { RefreshCw, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getGettingStartedMaxStep,
  getGettingStartedTargetStep,
} from "@/utils/getting-started-target-step";
import { GettingStartedTrustBanner } from "@/components/getting-started/trustBanner";
import { useWorkspaceFocus } from "@/hooks/useWorkspaceFocus";
import { useWorkspaceHomeDestination } from "@/hooks/useWorkspaceHomeDestination";
import type {
  PreferredWorkspace,
  PrimaryWorkspace,
} from "@/lib/workspace-focus";

const SOURCE_IMPORT_OPTIONS: SourceImportOption[] = [
  {
    id: "google-contacts",
    name: "Google Contacts",
    subtitle: "1 min · One-click sync",
    brand: "google",
  },
  {
    id: "microsoft",
    name: "Microsoft Outlook",
    subtitle: "1 min · Easy connect",
    brand: "microsoft",
  },
  {
    id: "apple",
    name: "Apple iCloud",
    subtitle: "1 min · Easy connect",
    brand: "apple",
  },
];

const EMPTY_GETTING_STARTED_PROGRESS: GettingStartedProgress = {
  step1Complete: false,
  step2Complete: false,
  step3Complete: false,
  preferredWorkspace: null,
  primaryWorkspace: null,
  hasFocusStep: true,
};

export default function GettingStarted() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  /** Preserves first-visit signal before progress sync adds `?step=` to the URL (welcome popup). */
  const [landedWithoutStep] = useState(() => !searchParams.get("step"));
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    preferredWorkspace,
    storedPreferred,
    focus,
    storedPrimary,
    hasFocusStep,
    setPreferredAndPrimary,
    isPending,
  } = useWorkspaceFocus();
  const [draftPreferred, setDraftPreferred] =
    useState<PreferredWorkspace>(preferredWorkspace);
  const [draftPrimary, setDraftPrimary] = useState<PrimaryWorkspace>(focus);

  useEffect(() => {
    setDraftPreferred(preferredWorkspace);
  }, [preferredWorkspace]);

  useEffect(() => {
    setDraftPrimary(focus);
  }, [focus]);

  const { path: finishHomePath, isLoading: finishHomeLoading } =
    useWorkspaceHomeDestination({
      primaryOverride: draftPrimary,
    });

  const refreshRewardCache = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["/api/credits/rules"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["/api/trust-score/me/rules"],
    });
    if (user?.id != null) {
      void queryClient.invalidateQueries({
        queryKey: getGettingStartedProgressQueryKey(user.id),
      });
    }
  }, [queryClient, user?.id]);
  const templateHeaders = getContactCsvTemplateHeaders();

  const {
    hasActiveVerification,
    isVerificationComplete,
    refetch: refetchVerification,
  } = useClaimVerification();

  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [showVerifyConfirmDialog, setShowVerifyConfirmDialog] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const { activeClaim, hasActiveClaim, refreshClaimStatus } = useRequestClaim();
  const verificationAlreadyTriggered = Boolean(
    activeClaim?.verificationTriggeredAt
  );

  const handleTriggerVerification = async () => {
    setIsVerifying(true);
    try {
      const result = await api.marketplace.triggerManualVerification();
      if (result.alreadyTriggered) {
        toast({
          title: "Already Verified",
          description: result.message,
          variant: "destructive",
        });
      } else if (result.success) {
        toast({
          title: "Verification Started",
          description: result.message,
        });
        await refreshClaimStatus();
        refetchVerification();
      } else {
        toast({
          title: "Verification Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to trigger verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
      setShowVerifyConfirmDialog(false);
    }
  };

  useEffect(() => {
    const claimRequestId = searchParams.get("claimRequestId");
    const claimSharerCode = searchParams.get("claimSharerCode");
    if (claimRequestId || claimSharerCode) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("claimRequestId");
      newParams.delete("claimSharerCode");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const stepParam = searchParams.get("step");
  const maxStep = getGettingStartedMaxStep(hasFocusStep);
  const parsedStep = stepParam ? parseInt(stepParam, 10) : 1;
  const sanitizedStep =
    !isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= maxStep
      ? parsedStep
      : 1;
  const [currentStep, setCurrentStep] = useState(sanitizedStep);

  const updateStep = useCallback(
    (step: number) => {
      setCurrentStep(step);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("step", String(step));
      setSearchParams(newSearchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    const stepFromUrl = searchParams.get("step");
    const parsed = stepFromUrl ? parseInt(stepFromUrl, 10) : 1;
    const stepNumber =
      !isNaN(parsed) && parsed >= 1 && parsed <= maxStep ? parsed : 1;
    if (stepNumber !== currentStep) {
      setCurrentStep(stepNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, maxStep]);

  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  useEffect(() => {
    const isGettingStartedRoute =
      location.pathname === "/getting-started" && landedWithoutStep;
    if (user && isGettingStartedRoute) {
      const userData = user as {
        userConfiguration?: { hasSeenWelcomePopup: boolean };
      };
      const hasSeen = userData.userConfiguration?.hasSeenWelcomePopup;
      const shouldShow =
        hasSeen === false || hasSeen === undefined || hasSeen === null;
      if (shouldShow) {
        const timer = setTimeout(() => setShowWelcomePopup(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, location.pathname, landedWithoutStep]);

  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isMicrosoftModalOpen, setIsMicrosoftModalOpen] = useState(false);
  const [isAppleModalOpen, setIsAppleModalOpen] = useState(false);
  const [showContactImportModal, setShowContactImportModal] = useState(false);
  const [isCsvGatewayOpen, setIsCsvGatewayOpen] = useState(false);
  const [selectedContactFile, setSelectedContactFile] = useState<File | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const {
    data: progress,
    isPending: progressPending,
    isError: progressQueryError,
  } = useGettingStartedProgress();
  const effectiveProgress =
    progress ??
    (!progressPending && progressQueryError
      ? EMPTY_GETTING_STARTED_PROGRESS
      : undefined);
  const tabProgress = effectiveProgress ?? EMPTY_GETTING_STARTED_PROGRESS;

  // OAuth/default landings have no ?step=; bounce graduated users to home.
  // When ?step= is present, allow revisiting steps from nav without redirecting.
  useEffect(() => {
    if (!user || progressPending || !progress || finishHomeLoading) {
      return;
    }
    if (
      !progress.step1Complete ||
      !progress.step2Complete ||
      !progress.step3Complete
    ) {
      return;
    }
    const stepQ = searchParams.get("step");
    if (stepQ !== null && stepQ !== "") {
      return;
    }
    navigate(finishHomePath, { replace: true });
  }, [
    user,
    progressPending,
    progress,
    navigate,
    searchParams,
    finishHomePath,
    finishHomeLoading,
  ]);

  const {
    sourceStatuses,
    loading: sourceStatusLoading,
    refreshSourceStatuses,
  } = useContactSourceStatus();
  const { refresh: handleRefreshAll, isRefreshing: isImportSectionRefreshing } =
    useRefreshContactData({
      refreshSourceStatuses,
    });

  useEffect(() => {
    if (!user || progressPending) {
      return;
    }

    const raw = searchParams.get("step");
    let urlStep: number | null = null;
    let hadInvalidStepParam = false;
    if (raw !== null && raw !== "") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= maxStep) {
        urlStep = n;
      } else {
        urlStep = 1;
        hadInvalidStepParam = true;
      }
    }

    if (hadInvalidStepParam) {
      updateStep(1);
      return;
    }

    const target = getGettingStartedTargetStep(effectiveProgress);
    if (target === null) {
      return;
    }

    if (urlStep === null) {
      updateStep(target);
    }
  }, [
    user,
    effectiveProgress,
    progressPending,
    searchParams,
    updateStep,
    maxStep,
  ]);

  const handleImportConnect = (optionId: string) => {
    switch (optionId) {
      case "google-contacts":
        setIsGoogleModalOpen(true);
        break;
      case "microsoft":
        setIsMicrosoftModalOpen(true);
        break;
      case "apple":
        setIsAppleModalOpen(true);
        break;
      default:
        break;
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  /** Dropping a file on the CSV tile skips the gateway and opens the preview directly. */
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const acceptedTypes = [".csv", ".xlsx", ".xls", ".vcf"];
      const file = files[0];
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      if (acceptedTypes.includes(extension)) {
        setSelectedContactFile(file);
        setShowContactImportModal(true);
      } else {
        toast({
          title: "Invalid File Type",
          description:
            "Please upload CSV, Excel (.xlsx, .xls), or vCard (.vcf) files.",
          variant: "destructive",
        });
      }
    }
  };

  const downloadTemplate = () => {
    const sampleRow = [
      "John",
      "Doe",
      "john.doe@example.com",
      "(555) 123-4567",
      "Acme Corp",
      "Sales Manager",
      "Technology",
      "San Francisco",
      "CA",
      "USA",
      "https://linkedin.com/in/johndoe",
      "https://acme.com",
      "john.personal@gmail.com",
    ];
    const csvContent = `${templateHeaders.join(",")}\n${sampleRow.join(",")}`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contacts-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNext = () => {
    if (hasFocusStep && currentStep === 1) {
      // Tile clicks already persist via onChange; only persist here when the
      // user advances without changing the default (no tile click yet).
      const preferredChanged = draftPreferred !== storedPreferred;
      const primaryChanged = draftPrimary !== storedPrimary;
      if (preferredChanged || primaryChanged) {
        void setPreferredAndPrimary(draftPreferred, draftPrimary);
      }
      updateStep(2);
      return;
    }

    if (currentStep === (hasFocusStep ? 2 : 1)) {
      updateStep(hasFocusStep ? 3 : 2);
    }
  };

  const handleSkipFocus = () => {
    void setPreferredAndPrimary("both", "recruiting");
    updateStep(2);
  };

  const handleSkipImport = () => {
    updateStep(hasFocusStep ? 3 : 2);
  };

  const handleFinishGetGoing = () => {
    if (finishHomeLoading) return;
    navigate(finishHomePath);
  };

  const pageReady = !!user && !progressPending;
  if (!pageReady) {
    return <Loader message="Loading…" fullPage />;
  }

  const tabs = hasFocusStep
    ? ([
        { step: 1, short: "Step 1", label: "Choose Focus" },
        { step: 2, short: "Step 2", label: "Import Contacts" },
        { step: 3, short: "Step 3", label: "Get Going" },
      ] as const)
    : ([
        { step: 1, short: "Step 1", label: "Import Contacts" },
        { step: 2, short: "Step 2", label: "Get Going" },
      ] as const);

  const stepComplete: Record<number, boolean> = hasFocusStep
    ? {
        1: tabProgress.step1Complete,
        2: tabProgress.step2Complete,
        3: tabProgress.step3Complete,
      }
    : {
        1: tabProgress.step1Complete,
        2: tabProgress.step2Complete,
      };

  const isFocusStep = hasFocusStep && currentStep === 1;
  const isImportStep = hasFocusStep ? currentStep === 2 : currentStep === 1;
  const isGetGoingStep = hasFocusStep ? currentStep === 3 : currentStep === 2;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SEO
        title="Getting Started | Prospectly"
        description="Set up your Prospectly account in 3 easy steps and start making valuable business connections."
      />

      {/* Step tabs — fixed below dashboard header while step content scrolls */}
      <div className="shrink-0 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <GettingStartedStepTabs
            currentStep={currentStep}
            onStepChange={updateStep}
            tabs={tabs}
            stepComplete={stepComplete}
            className="mb-0"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 pb-24">
          {isFocusStep && (
            <div className="animate-fade-in">
              <ChooseFocusStep
                value={draftPreferred}
                primaryValue={draftPrimary}
                disabled={isPending}
                onChange={(nextPreferred, nextPrimary) => {
                  setDraftPreferred(nextPreferred);
                  setDraftPrimary(nextPrimary);
                  // Persist immediately so sidebar/header update without waiting for Next.
                  void setPreferredAndPrimary(nextPreferred, nextPrimary);
                }}
              />
            </div>
          )}

          {isImportStep && (
            <div className="animate-fade-in space-y-6">
              {showVerificationBanner &&
                (hasActiveVerification ||
                  isVerificationComplete ||
                  (hasActiveClaim &&
                    activeClaim?.status !== "completed" &&
                    activeClaim?.status !== "failed")) && (
                  <VerifyConnectionBanner
                    onDismiss={() => setShowVerificationBanner(false)}
                    onImportMore={() =>
                      document
                        .getElementById("connect-contacts")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    onVerify={() => setShowVerifyConfirmDialog(true)}
                    isVerifying={isVerifying}
                    verificationTriggered={verificationAlreadyTriggered}
                  />
                )}

              <GettingStartedTrustBanner />

              <GettingStartedConnectSection
                actions={
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-10 shrink-0 gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-sm transition-all",
                            "hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst",
                            "disabled:pointer-events-none disabled:opacity-50"
                          )}
                          onClick={handleRefreshAll}
                          disabled={
                            isImportSectionRefreshing || sourceStatusLoading
                          }
                        >
                          <RefreshCw
                            className={cn(
                              "h-4 w-4 mr-1",
                              isImportSectionRefreshing && "animate-spin"
                            )}
                          />
                          Refresh
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Refresh contact counts, Trust Score Points, and
                          Connector Credits status
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                }
              >
                <LinkedInConnectionsSection />
                <GettingStartedSourceCards
                  options={SOURCE_IMPORT_OPTIONS}
                  sourceStatuses={sourceStatuses}
                  sourceStatusLoading={sourceStatusLoading}
                  onConnect={handleImportConnect}
                  isDragging={isDragging}
                  onCsvActivate={() => setIsCsvGatewayOpen(true)}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              </GettingStartedConnectSection>
            </div>
          )}

          {isGetGoingStep && (
            <div className="animate-fade-in">
              <GetGoingStep
                preferredWorkspace={
                  hasFocusStep ? draftPreferred : "prospecting"
                }
              />
            </div>
          )}

          <GettingStartedStepFooter
            currentStep={currentStep}
            onNext={() => {
              if (isGetGoingStep) {
                handleFinishGetGoing();
                return;
              }
              handleNext();
            }}
            onBack={
              isGetGoingStep
                ? () => updateStep(hasFocusStep ? 2 : 1)
                : undefined
            }
            onSkip={
              isFocusStep
                ? handleSkipFocus
                : isImportStep
                  ? handleSkipImport
                  : undefined
            }
            showSkip={!isGetGoingStep}
            skipNote={
              isFocusStep
                ? "You can set this later from the header switcher."
                : "Progress saved. Import anytime from Settings."
            }
            nextLabel={isGetGoingStep ? "Complete Setup" : "Next Step"}
            nextDisabled={isGetGoingStep && finishHomeLoading}
          />
        </div>
      </div>

      <GettingStartedCsvImportModal
        open={isCsvGatewayOpen}
        onOpenChange={setIsCsvGatewayOpen}
        onDownloadTemplate={downloadTemplate}
        onFileAccepted={(file) => {
          setSelectedContactFile(file);
          setShowContactImportModal(true);
        }}
      />

      <GoogleContactsModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={() => {
          setIsGoogleModalOpen(false);
          refreshRewardCache();
        }}
        onStatusChanged={handleRefreshAll}
      />

      <MicrosoftContactsModal
        isOpen={isMicrosoftModalOpen}
        onClose={() => setIsMicrosoftModalOpen(false)}
        onSuccess={() => {
          setIsMicrosoftModalOpen(false);
          refreshRewardCache();
        }}
        onStatusChanged={handleRefreshAll}
      />

      <AppleContactsModal
        isOpen={isAppleModalOpen}
        onClose={() => setIsAppleModalOpen(false)}
        onSuccess={(sessionId?: string, source?: string) => {
          setIsAppleModalOpen(false);
          refreshRewardCache();
        }}
        onStatusChanged={handleRefreshAll}
      />

      <ImportPreviewModal
        isOpen={showContactImportModal}
        onClose={() => setShowContactImportModal(false)}
        file={selectedContactFile}
        onImportComplete={() => {
          setShowContactImportModal(false);
          refreshRewardCache();
        }}
      />

      <WelcomeSubscriptionPopup
        isOpen={showWelcomePopup}
        onClose={() => setShowWelcomePopup(false)}
      />

      <AlertDialog
        open={showVerifyConfirmDialog}
        onOpenChange={setShowVerifyConfirmDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verify Your Connection
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p>
                <strong>Important:</strong> Before you verify, make sure you
                have imported the contact you&apos;re claiming to know.
              </p>
              <p>
                If the prospect is not found in your imported contacts, your
                claim will fail and{" "}
                <strong className="text-destructive">
                  you cannot try again
                </strong>
                .
              </p>
              <p className="text-muted-foreground">
                Are you sure you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isVerifying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTriggerVerification}
              disabled={isVerifying}
              className="bg-primary"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Yes, Verify Now"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
