import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useReferCandidateBankGate } from "@/hooks/useReferCandidateBankGate";
import { invalidateConnectorEngagementQueries } from "@/lib/recruitment/invalidate-connector-engagement";
import { ConnectorResumeUploadModal } from "@/components/recruitment/ConnectorResumeUploadModal";
import { ReferCandidateBankGateModal } from "@/components/recruitment/ReferCandidateBankGateModal";
import { StripeConnectModal } from "@/components/finance/StripeConnectModal";
import { JobShareModal } from "@/pages/recruitment/job-marketplace/components";
import type { MarketplaceJob } from "@/types/marketplace";

export interface ConnectorReferShareJobPayload {
  id: string;
  title: string;
  companyName: string;
  connectorPayout?: string;
  sharerPayout?: string;
  bountyAmount?: string;
}

interface UseConnectorReferShareModalsOptions {
  onAfterReferSuccess?: () => void;
  onAfterShareSuccess?: () => void;
}

export function useConnectorReferShareModals(
  options: UseConnectorReferShareModalsOptions = {}
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadJob, setUploadJob] = useState<{
    id: string;
    title: string;
    companyName: string;
  } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [shareJob, setShareJob] = useState<MarketplaceJob | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const refreshEngagement = useCallback(() => {
    void invalidateConnectorEngagementQueries(queryClient);
  }, [queryClient]);

  const proceedToReferUpload = useCallback(
    (job: ConnectorReferShareJobPayload) => {
      setUploadJob({
        id: job.id,
        title: job.title,
        companyName: job.companyName,
      });
      setShowUploadModal(true);
    },
    []
  );

  const {
    showBankGate,
    handleBankGateOpenChange,
    showStripeModal,
    pendingJob,
    requestReferCandidate,
    handleSkipBankGate,
    handleOpenStripeModal,
    handleStripeModalClose,
    handleBeforeStripeRedirect,
    handleStripeSuccess,
    stripeConnectReturnUrl,
    stripeConnectRefreshUrl,
  } = useReferCandidateBankGate({
    onProceed: proceedToReferUpload,
  });

  const handleRefer = useCallback(
    (job: ConnectorReferShareJobPayload) => {
      requestReferCandidate(
        {
          id: job.id,
          title: job.title,
          companyName: job.companyName,
        },
        "card"
      );
    },
    [requestReferCandidate]
  );

  const handleShare = useCallback((job: ConnectorReferShareJobPayload) => {
    setShareJob({
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      description: "",
      salaryRangeMin: "0",
      salaryRangeMax: "0",
      bountyAmount: job.bountyAmount ?? "",
      connectorPayout: job.connectorPayout ?? "",
      sharerPayout: job.sharerPayout ?? "",
      createdAt: new Date(0).toISOString(),
      viewCount: 0,
    });
    setShowShareModal(true);
  }, []);

  const handleUploadModalOpenChange = useCallback(
    (open: boolean) => {
      setShowUploadModal(open);
      if (!open) {
        setUploadJob(null);
        refreshEngagement();
        options.onAfterReferSuccess?.();
      }
    },
    [refreshEngagement, options]
  );

  const handleShareClick = useCallback(
    async (jobId: string, platform: string) => {
      try {
        const result = await api.recruitment.shareJob({ jobId, platform });
        refreshEngagement();
        return {
          sharerCode: result.sharerCode,
          shareUrl: result.shareUrl,
        };
      } catch (error) {
        toast({
          title: "Failed to generate share link",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
        return null;
      }
    },
    [refreshEngagement, toast]
  );

  const handleShareModalOpenChange = useCallback(
    (open: boolean) => {
      setShowShareModal(open);
      if (!open) {
        setShareJob(null);
        refreshEngagement();
        options.onAfterShareSuccess?.();
      }
    },
    [refreshEngagement, options]
  );

  const modals = (
    <>
      {uploadJob ? (
        <ConnectorResumeUploadModal
          open={showUploadModal}
          onOpenChange={handleUploadModalOpenChange}
          jobId={uploadJob.id}
          jobTitle={uploadJob.title}
          jobCompany={uploadJob.companyName}
        />
      ) : null}

      <ReferCandidateBankGateModal
        open={showBankGate}
        onOpenChange={handleBankGateOpenChange}
        jobTitle={pendingJob?.title}
        onConnectBank={handleOpenStripeModal}
        onSkip={handleSkipBankGate}
      />

      <StripeConnectModal
        isOpen={showStripeModal}
        onClose={handleStripeModalClose}
        onSuccess={handleStripeSuccess}
        onBeforeStripeRedirect={handleBeforeStripeRedirect}
        connectReturnUrl={stripeConnectReturnUrl}
        connectRefreshUrl={stripeConnectRefreshUrl}
      />

      {shareJob ? (
        <JobShareModal
          job={shareJob}
          open={showShareModal}
          onOpenChange={handleShareModalOpenChange}
          onShareClick={handleShareClick}
          onShareSuccess={refreshEngagement}
        />
      ) : null}
    </>
  );

  return {
    handleRefer,
    handleShare,
    modals,
  };
}
