import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  getStripePayoutStatusQueryKey,
  isStripePayoutSetupComplete,
} from "@/lib/stripe-connect";
import { toast } from "@/hooks/use-toast";
import { hasSkippedBankAccount } from "@/lib/user-configuration";
import {
  buildReferCandidateStripeRefreshUrl,
  buildReferCandidateStripeReturnUrl,
  consumeReferCandidateReturnContext,
  setReferCandidateReturnContext,
  toAbsoluteAppUrl,
  type ReferCandidateJobPayload,
  type ReferCandidateOrigin,
} from "@/utils/refer-candidate-return";

type ProceedToRefer = (
  job: ReferCandidateJobPayload,
  origin: ReferCandidateOrigin
) => void;

type UseReferCandidateBankGateOptions = {
  onProceed: ProceedToRefer;
  onResumeDrawer?: (job: ReferCandidateJobPayload) => void;
};

async function fetchStripeStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | number
) {
  return queryClient.fetchQuery({
    queryKey: getStripePayoutStatusQueryKey(userId),
    queryFn: () => api.stripe.getPayoutStatus(),
    staleTime: 30_000,
  });
}

export function useReferCandidateBankGate({
  onProceed,
  onResumeDrawer,
}: UseReferCandidateBankGateOptions) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, updateUserConfiguration, refreshUser } = useAuth();
  const userId = user?.id;
  const skipPersistInFlightRef = useRef(false);

  const [showBankGate, setShowBankGate] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [pendingJob, setPendingJob] = useState<ReferCandidateJobPayload | null>(
    null
  );
  const [pendingOrigin, setPendingOrigin] =
    useState<ReferCandidateOrigin>("card");

  const returnPath = `${location.pathname}${location.search}`;

  const stripeConnectReturnUrl = useMemo(
    () => toAbsoluteAppUrl(buildReferCandidateStripeReturnUrl(returnPath)),
    [returnPath]
  );

  const stripeConnectRefreshUrl = useMemo(
    () => toAbsoluteAppUrl(buildReferCandidateStripeRefreshUrl(returnPath)),
    [returnPath]
  );

  const hasSkippedBankGate = useCallback(async (): Promise<boolean> => {
    if (hasSkippedBankAccount(user?.userConfiguration)) {
      return true;
    }

    try {
      const config = await api.profiles.getConfiguration();
      const skipped = hasSkippedBankAccount(config);
      if (skipped) {
        updateUserConfiguration({ hasSkipBankAccount: true });
      }
      return skipped;
    } catch {
      return false;
    }
  }, [updateUserConfiguration, user?.userConfiguration]);

  const openBankGate = useCallback(
    (job: ReferCandidateJobPayload, origin: ReferCandidateOrigin) => {
      setPendingJob(job);
      setPendingOrigin(origin);
      setShowBankGate(true);
    },
    []
  );

  const clearPending = useCallback(() => {
    setPendingJob(null);
  }, []);

  const proceedWithPending = useCallback(() => {
    if (!pendingJob) return;
    onProceed(pendingJob, pendingOrigin);
    clearPending();
  }, [clearPending, onProceed, pendingJob, pendingOrigin]);

  const checkStripeAndProceed = useCallback(
    async (job: ReferCandidateJobPayload, origin: ReferCandidateOrigin) => {
      if (!userId) return;

      try {
        const status = await fetchStripeStatus(queryClient, userId);
        if (isStripePayoutSetupComplete(status)) {
          onProceed(job, origin);
          return;
        }

        if (await hasSkippedBankGate()) {
          onProceed(job, origin);
          return;
        }

        openBankGate(job, origin);
      } catch {
        onProceed(job, origin);
      }
    },
    [hasSkippedBankGate, onProceed, openBankGate, queryClient, userId]
  );

  const requestReferCandidate = useCallback(
    (job: ReferCandidateJobPayload, origin: ReferCandidateOrigin) => {
      void checkStripeAndProceed(job, origin);
    },
    [checkStripeAndProceed]
  );

  const handleBankGateOpenChange = useCallback(
    (open: boolean) => {
      setShowBankGate(open);
      if (!open && !skipPersistInFlightRef.current) {
        clearPending();
      }
    },
    [clearPending]
  );

  const handleSkipBankGate = useCallback(async () => {
    skipPersistInFlightRef.current = true;
    setShowBankGate(false);

    try {
      await api.profiles.markSkipBankAccount();
      updateUserConfiguration({ hasSkipBankAccount: true });
      await refreshUser();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        "useReferCandidateBankGate :: handleSkipBankGate : ERROR :",
        error
      );
      toast({
        title: "Could not save skip preference",
        description:
          "You can continue referring; we may ask about your bank account again later.",
        variant: "destructive",
      });
    } finally {
      skipPersistInFlightRef.current = false;
    }

    proceedWithPending();
  }, [proceedWithPending, refreshUser, updateUserConfiguration]);

  const handleOpenStripeModal = useCallback(() => {
    setShowStripeModal(true);
  }, []);

  const handleStripeModalClose = useCallback(() => {
    setShowStripeModal(false);
  }, []);

  const handleBeforeStripeRedirect = useCallback(() => {
    if (!pendingJob) return;
    setReferCandidateReturnContext({
      returnPath,
      job: pendingJob,
      origin: pendingOrigin,
    });
  }, [pendingJob, pendingOrigin, returnPath]);

  const handleStripeSuccess = useCallback(async () => {
    setShowStripeModal(false);
    if (!userId) return;

    try {
      await queryClient.invalidateQueries({
        queryKey: getStripePayoutStatusQueryKey(userId),
      });
      const status = await fetchStripeStatus(queryClient, userId);
      if (isStripePayoutSetupComplete(status)) {
        setShowBankGate(false);
        proceedWithPending();
        return;
      }
    } catch {
      // Keep bank gate open so the user can retry or skip.
    }

    if (await hasSkippedBankGate()) {
      proceedWithPending();
      return;
    }

    setShowBankGate(true);
  }, [hasSkippedBankGate, proceedWithPending, queryClient, userId]);

  const resumePendingReferFlow = useCallback(async () => {
    if (!userId) return;

    const context = consumeReferCandidateReturnContext();
    if (!context) return;

    if (context.origin === "drawer") {
      onResumeDrawer?.(context.job);
    }

    try {
      const status = await fetchStripeStatus(queryClient, userId);
      if (isStripePayoutSetupComplete(status)) {
        onProceed(context.job, context.origin);
        return;
      }
    } catch {
      // Fall through to bank gate or skip.
    }

    if (await hasSkippedBankGate()) {
      onProceed(context.job, context.origin);
      return;
    }

    openBankGate(context.job, context.origin);
  }, [
    hasSkippedBankGate,
    onProceed,
    onResumeDrawer,
    openBankGate,
    queryClient,
    userId,
  ]);

  return {
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
    resumePendingReferFlow,
    stripeConnectReturnUrl,
    stripeConnectRefreshUrl,
  };
}
