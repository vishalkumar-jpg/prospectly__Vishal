import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useGettingStartedProgress } from "@/hooks/useGettingStartedProgress";
import { useCalendarRequirement } from "@/hooks/useCalendarRequirement";
import { api } from "@/lib/api";
import {
  getStripePayoutStatusQueryKey,
  isStripePayoutSetupComplete,
} from "@/lib/stripe-connect";

export enum SidebarSetupItemVisualState {
  Done = "done",
  Pending = "pending",
  ActionRequired = "action_required",
}

export enum SidebarBankSetupState {
  None = "none",
  Partial = "partial",
  Complete = "complete",
}

export enum SidebarSetupProgressTone {
  Empty = "empty",
  InProgress = "in_progress",
  Complete = "complete",
}

export type SidebarAccountSetupStatus = {
  contactsImported: boolean;
  calendarConnected: boolean;
  bankState: SidebarBankSetupState;
  completedCount: number;
  progressPct: number;
  loading: boolean;
  /** Getting Started step number for Import Contacts (1 or 2). */
  importStep: 1 | 2;
};

const SETUP_STEP_COUNT = 3;

type PayoutFlags = {
  isConnected: boolean;
  onboardingComplete: boolean;
  capabilityStatus: string | null;
};

const resolveBankState = (status: PayoutFlags): SidebarBankSetupState => {
  if (isStripePayoutSetupComplete(status)) {
    return SidebarBankSetupState.Complete;
  }
  if (status.isConnected) return SidebarBankSetupState.Partial;
  return SidebarBankSetupState.None;
};

export const useSidebarAccountSetup = (): SidebarAccountSetupStatus => {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: progress, isLoading: progressLoading } =
    useGettingStartedProgress();
  const { hasCalendar, loading: calendarLoading } = useCalendarRequirement();

  const { data: stripeStatus, isLoading: stripeLoading } = useQuery({
    queryKey:
      userId != null
        ? getStripePayoutStatusQueryKey(userId)
        : (["/api/stripe/payouts/status", "pending"] as const),
    queryFn: () => api.stripe.getPayoutStatus(),
    staleTime: 30 * 1000,
    enabled: userId != null,
  });

  const contactsImported = Boolean(
    user?.userConfiguration?.hasImportedContacts
  );
  const calendarConnected = hasCalendar;
  const bankState = resolveBankState({
    isConnected: stripeStatus?.isConnected ?? false,
    onboardingComplete: stripeStatus?.onboardingComplete ?? false,
    capabilityStatus: stripeStatus?.capabilityStatus ?? null,
  });

  let completedCount = 0;
  if (contactsImported) completedCount++;
  if (calendarConnected) completedCount++;
  if (bankState === SidebarBankSetupState.Complete) completedCount++;

  const hasFocusStep = progress?.hasFocusStep !== false;
  const importStep: 1 | 2 = hasFocusStep ? 2 : 1;

  return {
    contactsImported,
    calendarConnected,
    bankState,
    completedCount,
    progressPct: Math.round((completedCount / SETUP_STEP_COUNT) * 100),
    loading: progressLoading || stripeLoading || calendarLoading,
    importStep,
  };
};

export const getContactsVisualState = (
  imported: boolean
): SidebarSetupItemVisualState =>
  imported
    ? SidebarSetupItemVisualState.Done
    : SidebarSetupItemVisualState.Pending;

export const getCalendarVisualState = (
  connected: boolean
): SidebarSetupItemVisualState =>
  connected
    ? SidebarSetupItemVisualState.Done
    : SidebarSetupItemVisualState.Pending;

export const getBankVisualState = (
  bankState: SidebarBankSetupState
): SidebarSetupItemVisualState => {
  if (bankState === SidebarBankSetupState.Complete) {
    return SidebarSetupItemVisualState.Done;
  }
  if (bankState === SidebarBankSetupState.Partial) {
    return SidebarSetupItemVisualState.ActionRequired;
  }
  return SidebarSetupItemVisualState.Pending;
};

export const getBankSetupLabel = (bankState: SidebarBankSetupState): string => {
  if (bankState === SidebarBankSetupState.Complete) {
    return "Bank account connected";
  }
  if (bankState === SidebarBankSetupState.Partial) {
    return "Complete payout setup";
  }
  return "Connect bank account";
};

export const getProgressTone = (
  progressPct: number
): SidebarSetupProgressTone => {
  if (progressPct <= 0) return SidebarSetupProgressTone.Empty;
  if (progressPct >= 100) return SidebarSetupProgressTone.Complete;
  return SidebarSetupProgressTone.InProgress;
};
