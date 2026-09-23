import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactElement,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiRequest, api } from "@/lib/api";
import { getFriendlyOAuthErrorMessage } from "@/lib/oauth-user-error";
import { toUTC } from "@/lib/dayjs";
import { analytics } from "@/lib/analytics";
import {
  GOOGLE_IMPORT_ACCOUNTS_QUERY_KEY,
  GOOGLE_IMPORT_ACCOUNTS_STALE_MS,
} from "@/lib/contact-import-query-keys";
import { Users, Loader2, AlertCircle, Mail, RefreshCw } from "lucide-react";
import { useTrustScoreRewardDisplay } from "@/hooks/useTrustScoreRewardDisplay";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { ImportModalProgressPanel } from "@/components/getting-started/import-modal/progressPanel";
import { ImportModalShell } from "@/components/getting-started/import-modal/shell";
import { ImportModalHero } from "@/components/getting-started/import-modal/hero";
import { ImportModalTip } from "@/components/getting-started/import-modal/tip";
import { ImportModalPrimaryCta } from "@/components/getting-started/import-modal/primaryCta";
import { ImportModalRewardCard } from "@/components/getting-started/import-modal/rewardCard";
import { ImportModalStatsGrid } from "@/components/getting-started/import-modal/statsGrid";
import { ImportModalSocialProof } from "@/components/getting-started/import-modal/socialProof";
import { SourceBrandIconGoogle } from "@/components/getting-started/sourceBrandIcons";
import { GettingStartedIconBadge } from "@/assets/getting-started/getting-started-icon-badge";
import { AnyType } from "@/types/common";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader } from "./ui/loader";

function isGoogleAuthErrorMessage({ message }: { message: string }): boolean {
  const normalized = message.toLowerCase();
  return (
    message.includes("401") ||
    message.includes("403") ||
    normalized.includes("unauthenticated") ||
    normalized.includes("invalid authentication") ||
    normalized.includes("not connected") ||
    normalized.includes("failed to decrypt") ||
    normalized.includes("invalid_grant") ||
    normalized.includes("authentication failed")
  );
}

function fireAndForgetAsync({
  action,
}: {
  action: () => void | Promise<void>;
}): void {
  Promise.resolve()
    .then(() => action())
    .catch(() => undefined);
}

async function refreshGoogleImportState({
  fetchImportStatus,
  refreshGoogleImportAccounts,
}: {
  fetchImportStatus: () => Promise<void>;
  refreshGoogleImportAccounts: (opts: {
    delayedRetryMs: number;
  }) => Promise<void>;
}): Promise<void> {
  await fetchImportStatus();
  await refreshGoogleImportAccounts({ delayedRetryMs: 800 });
}

function scheduleGoogleImportRefresh({
  fetchImportStatus,
  refreshGoogleImportAccounts,
  delayMs,
}: {
  fetchImportStatus: () => Promise<void>;
  refreshGoogleImportAccounts: (opts: {
    delayedRetryMs: number;
  }) => Promise<void>;
  delayMs: number;
}): void {
  setTimeout(() => {
    refreshGoogleImportState({
      fetchImportStatus,
      refreshGoogleImportAccounts,
    }).catch(() => undefined);
  }, delayMs);
}

function runGoogleImportRefreshWithRetry({
  fetchImportStatus,
  refreshGoogleImportAccounts,
  retryDelayMs,
}: {
  fetchImportStatus: () => Promise<void>;
  refreshGoogleImportAccounts: (opts: {
    delayedRetryMs: number;
  }) => Promise<void>;
  retryDelayMs: number;
}): void {
  refreshGoogleImportState({
    fetchImportStatus,
    refreshGoogleImportAccounts,
  }).catch(() => {
    scheduleGoogleImportRefresh({
      fetchImportStatus,
      refreshGoogleImportAccounts,
      delayMs: retryDelayMs,
    });
  });
}

function scheduleGoogleImportStatusRetry({
  fetchImportStatus,
  refreshGoogleImportAccounts,
  initialDelayMs,
  retryDelayMs,
}: {
  fetchImportStatus: () => Promise<void>;
  refreshGoogleImportAccounts: (opts: {
    delayedRetryMs: number;
  }) => Promise<void>;
  initialDelayMs: number;
  retryDelayMs: number;
}): void {
  setTimeout(() => {
    runGoogleImportRefreshWithRetry({
      fetchImportStatus,
      refreshGoogleImportAccounts,
      retryDelayMs,
    });
  }, initialDelayMs);
}

function GoogleOAuthButtonIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type GoogleAutomaticStepParams = {
  isLoadingStatus: boolean;
  isConnecting: boolean;
  importStatus: AnyType;
  perAccountSyncBusy: boolean;
  connectionError: string | null;
  handleConnectGoogle: () => void;
  importReward: AnyType;
  googleAccountsData: AnyType;
  handleResync: () => void;
  isResyncing: boolean;
  handleResyncToken: (tokenId: string) => void;
  isDisconnecting: boolean;
  setDisconnectTokenId: (id: string | null) => void;
  onSuccess?: (sessionId: string, source?: string) => void;
  handleClose: () => Promise<void>;
};

function getGoogleImportStatusFlags({
  importStatus,
  perAccountSyncBusy,
}: {
  importStatus: AnyType;
  perAccountSyncBusy: boolean;
}) {
  const status = importStatus?.status || null;
  const isCompleted = status === "completed";
  return {
    isImporting:
      status === "pending" ||
      status === "processing" ||
      (isCompleted && importStatus?.hasImport === true && perAccountSyncBusy),
    isAuthError: isGoogleAuthErrorMessage({
      message: importStatus?.errorMessage || "",
    }),
    isCompleted,
    isFailed: status === "failed",
  };
}

function renderGoogleAutomaticLoading(): ReactElement {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-3">
        <Loader />
        <p className="text-sm text-muted-foreground">
          Loading import status...
        </p>
      </div>
    </div>
  );
}

function renderGoogleConnectFirstStep({
  connectionError,
  handleConnectGoogle,
  isConnecting,
}: Pick<
  GoogleAutomaticStepParams,
  "connectionError" | "handleConnectGoogle" | "isConnecting"
>): ReactElement {
  return (
    <div className="space-y-5">
      <ImportModalDots activeIndex={0} total={2} />
      <ImportModalHero
        variant="google"
        icon={<SourceBrandIconGoogle />}
        title="Connect Google Contacts"
        description="One click to securely sync all your contacts. Takes about 30 seconds."
        badge="~ 30 seconds"
      />
      {connectionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950/30">
          <AlertCircle className="mx-auto mb-2 h-10 w-10 text-red-600" />
          <h3 className="font-bold text-foreground">Connection failed</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {connectionError}
          </p>
        </div>
      )}
      <ImportModalPrimaryCta
        onClick={handleConnectGoogle}
        disabled={isConnecting}
      >
        <span className="inline-flex items-center gap-2">
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <GoogleOAuthButtonIcon />
              Sign in with Google →
            </>
          )}
        </span>
      </ImportModalPrimaryCta>
      <ImportModalTip icon={<GettingStartedIconBadge name="lock" size="sm" />}>
        <strong>Read-only access.</strong> We only see contact names and emails.
        We can't send emails or modify anything.
      </ImportModalTip>
      <ImportModalSocialProof text="1,204 users connected Google today" />
    </div>
  );
}

function renderGoogleAuthReconnectStep({
  handleConnectGoogle,
  isConnecting,
}: Pick<
  GoogleAutomaticStepParams,
  "handleConnectGoogle" | "isConnecting"
>): ReactElement {
  return (
    <div className="space-y-5">
      <ImportModalDots activeIndex={1} total={3} />
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">
          Reconnect your Google account
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your contact import or resync failed. Reconnect to restore access.
        </p>
      </div>
      <ImportModalPrimaryCta
        onClick={handleConnectGoogle}
        disabled={isConnecting}
      >
        <span className="inline-flex items-center gap-2">
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Reconnecting...
            </>
          ) : (
            <>
              <GoogleOAuthButtonIcon />
              Reconnect Google Account
            </>
          )}
        </span>
      </ImportModalPrimaryCta>
    </div>
  );
}

function renderGoogleAccountAccordionItem({
  acc,
  isResyncing,
  isImporting,
  isDisconnecting,
  handleResyncToken,
  setDisconnectTokenId,
}: {
  acc: AnyType;
  isResyncing: boolean;
  isImporting: boolean;
  isDisconnecting: boolean;
  handleResyncToken: (tokenId: string) => void;
  setDisconnectTokenId: (id: string | null) => void;
}): ReactElement {
  const li = acc.latestImport;
  const accountImportBusy =
    li == null || li.status === "pending" || li.status === "processing";
  return (
    <AccordionItem key={acc.id} value={acc.id} className="border-border/60">
      <AccordionTrigger className="py-3 text-sm hover:no-underline">
        <div className="flex min-w-0 flex-1 items-center gap-2 pr-2 text-left">
          <span className="min-w-0 flex-1 truncate text-foreground">
            {acc.email || acc.id}
          </span>
          {acc.isPrimary ? (
            <Badge className="shrink-0" variant="default">
              Primary
            </Badge>
          ) : null}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <p className="mb-2 text-xs text-muted-foreground">
          Last synced:{" "}
          {li?.completedAt ? formatLocalizedShortDateTime(li.completedAt) : "—"}
        </p>
        {accountImportBusy ? (
          <p className="mb-3 text-xs text-muted-foreground">Syncing…</p>
        ) : (
          <ImportModalStatsGrid
            className="mb-3 max-w-full"
            palette="getting-started"
            stats={[
              { value: li?.totalFetched ?? 0, label: "Found", variant: "blue" },
              {
                value: li?.imported ?? 0,
                label: "Imported",
                variant: "green",
              },
              {
                value: li?.duplicates ?? 0,
                label: "Duplicates",
                variant: "amber",
              },
            ]}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-border transition-colors hover:border-gs-accent-from/50 hover:bg-gradient-to-r hover:from-gs-accent-from/10 hover:to-gs-accent-to/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() =>
              fireAndForgetAsync({
                action: () => handleResyncToken(acc.id),
              })
            }
            disabled={isResyncing || isImporting || isDisconnecting}
          >
            {isResyncing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Sync again
          </Button>
          {!acc.isPrimary ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-border text-destructive transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setDisconnectTokenId(acc.id)}
              disabled={isResyncing || isImporting || isDisconnecting}
            >
              Disconnect
            </Button>
          ) : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function renderGoogleCompletedSyncedStep(
  params: GoogleAutomaticStepParams
): ReactElement {
  const {
    importStatus,
    importReward,
    googleAccountsData,
    handleConnectGoogle,
    isConnecting,
    handleResyncToken,
    isResyncing,
    isDisconnecting,
    setDisconnectTokenId,
    perAccountSyncBusy,
  } = params;
  const { isImporting } = getGoogleImportStatusFlags({
    importStatus,
    perAccountSyncBusy,
  });
  const apiTotals = googleAccountsData?.combinedLatestImportTotals;
  const statsForGrid =
    apiTotals != null
      ? {
          totalFetched: apiTotals.totalFetched,
          imported: apiTotals.imported,
          duplicates: apiTotals.duplicates,
        }
      : {
          totalFetched: importStatus.totalFetched ?? 0,
          imported: importStatus.imported ?? 0,
          duplicates: importStatus.duplicates ?? 0,
        };
  const activeAccounts =
    googleAccountsData?.accounts.filter((a: AnyType) => a.isActive) ?? [];

  return (
    <div className="space-y-4">
      <ImportModalDots activeIndex={1} total={2} />
      <ImportModalHero
        variant="success"
        className="mb-0"
        icon={<GettingStartedIconBadge name="check" size="hero" bare />}
        title="Google Contacts synced!"
        description={importStatus.email || ""}
      />
      <div className="flex flex-col gap-3.5">
        <ImportModalRewardCard reward={importReward} />
        <ImportModalStatsGrid
          palette="getting-started"
          stats={[
            {
              value: statsForGrid.totalFetched,
              label: "Found",
              variant: "blue",
            },
            {
              value: statsForGrid.imported,
              label: "Imported",
              variant: "green",
            },
            {
              value: statsForGrid.duplicates,
              label: "Duplicates",
              variant: "amber",
            },
          ]}
        />
      </div>
      {googleAccountsData && activeAccounts.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-left text-sm">
          <p className="mb-2 font-medium text-foreground">
            Connected Google accounts ({activeAccounts.length}/
            {googleAccountsData.maxAccountsPerProvider})
          </p>
          <Accordion type="single" collapsible className="w-full">
            {activeAccounts.map((acc: AnyType) =>
              renderGoogleAccountAccordionItem({
                acc,
                isResyncing,
                isImporting,
                isDisconnecting,
                handleResyncToken,
                setDisconnectTokenId,
              })
            )}
          </Accordion>
          {activeAccounts.length < googleAccountsData.maxAccountsPerProvider ? (
            <ImportModalPrimaryCta
              className="mt-3 w-full py-2.5 text-[13px]"
              onClick={() =>
                fireAndForgetAsync({ action: handleConnectGoogle })
              }
              disabled={isConnecting || isImporting}
            >
              {isConnecting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  Connecting…
                </span>
              ) : (
                "Connect another Google account"
              )}
            </ImportModalPrimaryCta>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function renderGoogleImportFailedStep(
  params: GoogleAutomaticStepParams
): ReactElement {
  const { importStatus, handleResync, isResyncing, perAccountSyncBusy } =
    params;
  const { isImporting } = getGoogleImportStatusFlags({
    importStatus,
    perAccountSyncBusy,
  });
  return (
    <div className="space-y-5">
      <ImportModalDots activeIndex={1} total={3} />
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950/30">
        <AlertCircle className="mx-auto mb-2 h-10 w-10 text-red-600" />
        <h3 className="font-bold text-foreground">Import failed</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {importStatus?.errorMessage ||
            "Something went wrong. You can try again."}
        </p>
      </div>
      <ImportModalPrimaryCta
        onClick={handleResync}
        disabled={isResyncing || isImporting}
      >
        <span className="inline-flex items-center gap-2">
          <RefreshCw
            className={isResyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          />
          {isResyncing ? "Retrying..." : "Try again"}
        </span>
      </ImportModalPrimaryCta>
    </div>
  );
}

function renderGoogleConnectedReadyStep(
  params: GoogleAutomaticStepParams
): ReactElement {
  const { importStatus, handleResync, isResyncing, perAccountSyncBusy } =
    params;
  const { isImporting } = getGoogleImportStatusFlags({
    importStatus,
    perAccountSyncBusy,
  });
  return (
    <div className="space-y-5">
      <ImportModalDots activeIndex={2} total={3} />
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/40">
          <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="mt-3 text-lg font-bold text-foreground">
          Google account connected
        </h3>
        {importStatus?.email ? (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-800 dark:bg-blue-950/30">
            <Mail className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
              {importStatus.email}
            </span>
          </div>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          Connected and ready to sync your contacts.
        </p>
      </div>
      <ImportModalPrimaryCta
        onClick={handleResync}
        disabled={isResyncing || isImporting}
      >
        <span className="inline-flex items-center gap-2">
          <RefreshCw
            className={isResyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          />
          {isResyncing ? "Queuing resync..." : "Resync contacts"}
        </span>
      </ImportModalPrimaryCta>
    </div>
  );
}

function renderGoogleAutomaticStep(
  params: GoogleAutomaticStepParams
): ReactElement {
  const { isLoadingStatus, isConnecting, importStatus, perAccountSyncBusy } =
    params;

  if (isLoadingStatus && !isConnecting) {
    return renderGoogleAutomaticLoading();
  }

  const hasTokens = importStatus?.hasTokens ?? importStatus?.connected ?? false;
  if (!hasTokens) {
    return renderGoogleConnectFirstStep(params);
  }

  const flags = getGoogleImportStatusFlags({
    importStatus,
    perAccountSyncBusy,
  });
  if (flags.isImporting) {
    return <ImportModalProgressPanel providerName="Google" />;
  }
  if (flags.isAuthError) {
    return renderGoogleAuthReconnectStep(params);
  }
  if (flags.isCompleted && importStatus?.hasImport) {
    return renderGoogleCompletedSyncedStep(params);
  }
  if (flags.isFailed) {
    return renderGoogleImportFailedStep(params);
  }
  return renderGoogleConnectedReadyStep(params);
}

interface GoogleContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sessionId: string) => void;
  onStatusChanged?: () => void;
}

export default function GoogleContactsModal({
  isOpen,
  onClose,
  onSuccess,
  onStatusChanged,
}: GoogleContactsModalProps) {
  const importReward = useTrustScoreRewardDisplay("google");
  const [importStatus, setImportStatus] = useState<{
    id?: string;
    hasImport: boolean;
    connected: boolean;
    hasTokens?: boolean;
    status?: string;
    imported?: number;
    failed?: number;
    duplicates?: number;
    totalFetched?: number;
    errorMessage?: string | null;
    startedAt?: string;
    completedAt?: string;
    createdAt?: string;
    email?: string | null;
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasStatusChanged, setHasStatusChanged] = useState(false);
  const [disconnectTokenId, setDisconnectTokenId] = useState<string | null>(
    null
  );
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  /** Bumps each Google OAuth connect so stale listeners/tail polls ignore other attempts */
  const googleOAuthConnectGenerationRef = useRef(0);

  const queryClient = useQueryClient();
  const { data: googleAccountsQuery } = useQuery({
    queryKey: GOOGLE_IMPORT_ACCOUNTS_QUERY_KEY,
    queryFn: () => api.contacts.listImportAccounts("google"),
    enabled: isOpen,
    staleTime: GOOGLE_IMPORT_ACCOUNTS_STALE_MS,
  });

  const refreshGoogleImportAccounts = useCallback(
    async (options?: { delayedRetryMs?: number }) => {
      await queryClient.invalidateQueries({
        queryKey: GOOGLE_IMPORT_ACCOUNTS_QUERY_KEY,
      });
      await queryClient.refetchQueries({
        queryKey: GOOGLE_IMPORT_ACCOUNTS_QUERY_KEY,
      });
      const delay = options?.delayedRetryMs;
      if (delay != null && delay > 0) {
        setTimeout(() => {
          void queryClient.refetchQueries({
            queryKey: GOOGLE_IMPORT_ACCOUNTS_QUERY_KEY,
          });
        }, delay);
      }
    },
    [queryClient]
  );

  const googleAccountsData = googleAccountsQuery ?? null;

  const perAccountSyncBusy = useMemo(() => {
    return (googleAccountsData?.accounts ?? [])
      .filter((a) => a.isActive)
      .some((a) => {
        const li = a.latestImport;
        return (
          li == null || li.status === "pending" || li.status === "processing"
        );
      });
  }, [googleAccountsData]);

  const dialogContentRef = useRef<HTMLDivElement>(null);
  const statusPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevImportStatusRef = useRef<string | undefined>(undefined);

  useDialogFocus(isOpen, dialogContentRef);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasStatusChanged(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(async () => {
    // If status changed (connect or resync), refresh the status before closing
    if (hasStatusChanged && onStatusChanged) {
      onStatusChanged();
    }
    setImportStatus(null);
    setIsConnecting(false);
    setConnectionError(null);
    setHasStatusChanged(false);
    setDisconnectTokenId(null);
    setIsDisconnecting(false);
    onClose();
  }, [hasStatusChanged, onClose, onStatusChanged]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        fireAndForgetAsync({ action: handleClose });
      }
    },
    [handleClose]
  );

  // When import leaves pending/processing, refresh per-account latestImport aggregates
  useEffect(() => {
    const prev = prevImportStatusRef.current;
    const curr = importStatus?.status;
    if (
      prev !== undefined &&
      (prev === "pending" || prev === "processing") &&
      curr !== "pending" &&
      curr !== "processing"
    ) {
      void refreshGoogleImportAccounts();
    }
    prevImportStatusRef.current = curr;
  }, [importStatus?.status, refreshGoogleImportAccounts]);

  // Fetch import status when modal opens (import-accounts come from useQuery when isOpen)
  useEffect(() => {
    if (isOpen) {
      void fetchImportStatus();
      checkUrlParams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // checkUrlParams intentionally excluded to avoid re-running on every render

  // Poll while aggregate import runs or aggregate completed but a token import is still in flight
  useEffect(() => {
    const aggregateBusy =
      importStatus?.status === "processing" ||
      importStatus?.status === "pending";
    const completedButPerAccountBusy =
      importStatus?.status === "completed" &&
      importStatus?.hasImport === true &&
      perAccountSyncBusy;

    if (isOpen && (aggregateBusy || completedButPerAccountBusy)) {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current);
      }

      statusPollIntervalRef.current = setInterval(() => {
        void fetchImportStatus(true);
        void refreshGoogleImportAccounts();
      }, 3000);
    } else if (statusPollIntervalRef.current) {
      clearInterval(statusPollIntervalRef.current);
      statusPollIntervalRef.current = null;
    }

    return () => {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current);
      }
    };
  }, [
    isOpen,
    importStatus?.status,
    importStatus?.hasImport,
    perAccountSyncBusy,
    refreshGoogleImportAccounts,
  ]);

  const checkUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const errorMessage = urlParams.get("message");
    const success = urlParams.get("google_contacts_connected");
    const warning = urlParams.get("warning");

    if (error) {
      setConnectionError(
        getFriendlyOAuthErrorMessage(
          errorMessage || "Failed to connect Google account. Please try again."
        )
      );
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh status to get latest state
      void fetchImportStatus();
      void refreshGoogleImportAccounts({ delayedRetryMs: 800 });
    } else if (success) {
      setHasStatusChanged(true);
      toast({
        title: "Google Account Connected",
        description: "Your Google contacts will be imported in the background.",
      });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh status
      void fetchImportStatus();
      void refreshGoogleImportAccounts({ delayedRetryMs: 800 });
    } else if (warning) {
      setHasStatusChanged(true);
      toast({
        title: "Connection Successful",
        description:
          "Google account connected, but import queueing failed. You can retry the import.",
        variant: "default",
      });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh status
      void fetchImportStatus();
      void refreshGoogleImportAccounts({ delayedRetryMs: 800 });
    }
  };

  const fetchImportStatus = async (background = false) => {
    if (!background) {
      setIsLoadingStatus(true);
    }
    try {
      // Use centralized API request which includes proactive token refresh
      const data = await api.contacts.getGoogleImportStatus();
      setImportStatus(data);
    } catch {
      // User may not have imported yet, set default state
      // Error is silently handled as this is expected for users who haven't imported yet
      setImportStatus({
        hasImport: false,
        connected: false,
      });
    } finally {
      if (!background) {
        setIsLoadingStatus(false);
      }
    }
  };

  const handleConnectGoogle = async () => {
    // This function initiates a fresh Google OAuth flow and starts a new background import process
    // It works as a fallback mechanism when the initial import fails during sign-up
    // Each click will: 1) Show Google consent screen, 2) Create/update tokens, 3) Create new import record, 4) Queue background import job

    setIsConnecting(true);
    setConnectionError(null);
    try {
      // Request OAuth URL - this will always generate a fresh OAuth flow with consent screen
      const data = await apiRequest<{ authUrl?: string; message?: string }>(
        "/contacts/google-import/connect",
        {
          method: "POST",
        }
      );

      if (data.authUrl) {
        // Open OAuth flow in popup
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          data.authUrl,
          "Google Contacts Connect",
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          toast({
            title: "Popup Blocked",
            description:
              "Please allow popups for this site to connect your Google account.",
            variant: "destructive",
          });
          setIsConnecting(false);
          return;
        }

        // Listen for OAuth result via multiple methods
        let channel: BroadcastChannel | null = null;
        let pollInterval: NodeJS.Timeout | null = null;
        let localStoragePollInterval: NodeJS.Timeout | null = null;
        let tailRecoveryInterval: NodeJS.Timeout | null = null;
        const connectStartTime = toUTC().getTime();
        const thisAttempt = ++googleOAuthConnectGenerationRef.current;
        let oauthOutcomeHandled = false;

        // Clear AnyType existing localStorage result before starting
        try {
          localStorage.removeItem("google-oauth-result");
        } catch {
          // Silent fail
        }

        // Shared cleanup function
        const cleanup = () => {
          if (tailRecoveryInterval) {
            clearInterval(tailRecoveryInterval);
            tailRecoveryInterval = null;
          }
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          if (localStoragePollInterval) {
            clearInterval(localStoragePollInterval);
            localStoragePollInterval = null;
          }
          if (channel) {
            channel.close();
            channel = null;
          }
          window.removeEventListener("message", handleMessage);
          // Clean up localStorage result
          try {
            localStorage.removeItem("google-oauth-result");
          } catch {
            // Silent fail
          }
          if (!popup.closed) {
            popup.close();
          }
          setIsConnecting(false);
        };

        const handleConnectionSuccess = async (data: AnyType) => {
          if (googleOAuthConnectGenerationRef.current !== thisAttempt) {
            return;
          }
          if (oauthOutcomeHandled) {
            return;
          }
          oauthOutcomeHandled = true;
          setIsLoadingStatus(true);
          cleanup();
          setConnectionError(null);
          setHasStatusChanged(true);
          // Handle warning cases (token saved but import queuing/creation failed)

          if (data.alreadyConnected) {
            toast({
              title: "Account already connected",
              description:
                typeof data.message === "string"
                  ? data.message
                  : "This account is already connected.",
            });
          } else {
            // Track upload initiation immediately
            analytics.trackContactsUploaded({
              source: "google",
              countImported: 0,
              countFailed: 0,
              durationMs: 0,
            });
            if (data.warning) {
              const warningMessage =
                data.message ||
                (data.warning === "import_queued_failed"
                  ? "Connection successful, but import queuing failed. You can retry the import."
                  : "Connection successful, but import setup failed. You can retry the import.");
              toast({
                title: "Connection Successful",
                description: warningMessage,
                variant: "default",
              });
            } else {
              toast({
                title: "Google Account Connected",
                description:
                  "Your Google contacts are being imported in the background.",
              });
            }
          }
          if (!data.alreadyConnected && !data.warning) {
            setImportStatus((prev) => ({
              ...prev,
              hasImport: true,
              connected: true,
              hasTokens: true,
              status: "pending",
            }));
          }
          runGoogleImportRefreshWithRetry({
            fetchImportStatus,
            refreshGoogleImportAccounts,
            retryDelayMs: 2000,
          });
        };

        const handleConnectionError = (errorData: AnyType) => {
          if (googleOAuthConnectGenerationRef.current !== thisAttempt) {
            return;
          }
          if (oauthOutcomeHandled) {
            return;
          }
          oauthOutcomeHandled = true;
          cleanup();
          const friendly = getFriendlyOAuthErrorMessage(
            errorData.message || "Failed to connect Google account"
          );
          setConnectionError(friendly);
          toast({
            title: "Connection Failed",
            description: friendly,
            variant: "destructive",
          });
        };

        const tryConsumeOAuthResultFromLocalStorage = () => {
          if (googleOAuthConnectGenerationRef.current !== thisAttempt) {
            return;
          }
          try {
            const result = localStorage.getItem("google-oauth-result");
            if (!result) {
              return;
            }
            const data = JSON.parse(result);
            if (data.timestamp && data.timestamp > connectStartTime) {
              if (data.error) {
                handleConnectionError(data);
              } else {
                fireAndForgetAsync({
                  action: () => handleConnectionSuccess(data),
                });
              }
            }
          } catch {
            // Silent fail for localStorage parsing
          }
        };

        // Setup message handlers
        const handleMessage = async (event: MessageEvent) => {
          // Only process messages from same origin
          if (event.origin !== window.location.origin) {
            return;
          }
          // Check if it's a connection success message
          if (event.data?.type === "google-contacts-connected") {
            if (event.data.error) {
              handleConnectionError(event.data);
            } else {
              handleConnectionSuccess(event.data);
            }
          }
        };

        try {
          channel = new BroadcastChannel("google-oauth");
          channel.onmessage = async (event) => {
            if (event.data?.type === "google-contacts-connected") {
              if (event.data.error) {
                handleConnectionError(event.data);
              } else {
                handleConnectionSuccess(event.data);
              }
            }
          };
        } catch {
          // BroadcastChannel not supported - fallback to polling only
        }

        // Poll localStorage for OAuth result (most reliable for cross-origin popups)
        // This works even when BroadcastChannel and postMessage fail
        localStoragePollInterval = setInterval(() => {
          tryConsumeOAuthResultFromLocalStorage();
        }, 500);

        // Poll for popup closure and check for callback
        pollInterval = setInterval(() => {
          if (popup.closed) {
            setIsLoadingStatus(true);
            tryConsumeOAuthResultFromLocalStorage();
            cleanup();
            if (
              googleOAuthConnectGenerationRef.current === thisAttempt &&
              !oauthOutcomeHandled
            ) {
              let tailAttempts = 0;
              const maxTailAttempts = 60;
              tailRecoveryInterval = setInterval(() => {
                if (googleOAuthConnectGenerationRef.current !== thisAttempt) {
                  if (tailRecoveryInterval) {
                    clearInterval(tailRecoveryInterval);
                    tailRecoveryInterval = null;
                  }
                  return;
                }
                tailAttempts += 1;
                tryConsumeOAuthResultFromLocalStorage();
                if (oauthOutcomeHandled || tailAttempts >= maxTailAttempts) {
                  if (tailRecoveryInterval) {
                    clearInterval(tailRecoveryInterval);
                    tailRecoveryInterval = null;
                  }
                }
              }, 500);
            }
            scheduleGoogleImportStatusRetry({
              fetchImportStatus,
              refreshGoogleImportAccounts,
              initialDelayMs: 1500,
              retryDelayMs: 2000,
            });
          }
        }, 500);

        window.addEventListener("message", handleMessage);

        // Cleanup after 5 minutes
        setTimeout(() => {
          cleanup();
        }, 300000);
      } else {
        throw new Error(data.message || "Failed to initiate Google connection");
      }
    } catch (error) {
      // Network errors or other unexpected errors
      const rawMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while connecting to Google";
      const errorMessage = getFriendlyOAuthErrorMessage(rawMessage);
      setConnectionError(errorMessage);
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleResyncToken = async (tokenId: string) => {
    setIsResyncing(true);
    try {
      const data = await api.contacts.resyncImportAccount(tokenId);
      if (data.success !== false && !data.warning) {
        setImportStatus((prev) => ({
          ...prev,
          status: "processing",
        }));
        setHasStatusChanged(true);
        toast({
          title: "Resync Queued",
          description:
            "Google Contacts import has been queued for this account.",
        });
        analytics.trackContactsUploaded({
          source: "google",
          countImported: 0,
          countFailed: 0,
          durationMs: 0,
        });
        setTimeout(() => {
          void (async () => {
            await fetchImportStatus();
            await refreshGoogleImportAccounts();
          })();
        }, 1000);
      } else {
        toast({
          title: "Resync Failed",
          description:
            data.warning ||
            data.message ||
            "Failed to queue resync. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Resync Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsResyncing(false);
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnectTokenId || isDisconnecting) return;
    setIsDisconnecting(true);
    try {
      await api.contacts.disconnectImportAccount(disconnectTokenId);
      setHasStatusChanged(true);
      toast({ title: "Account disconnected" });
      await fetchImportStatus();
      await refreshGoogleImportAccounts();
      setDisconnectTokenId(null);
    } catch (error) {
      toast({
        title: "Disconnect failed",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleResync = async () => {
    setIsResyncing(true);
    try {
      const data = await apiRequest<{
        success: boolean;
        message?: string;
        jobId?: string;
      }>("/contacts/google-import/resync", {
        method: "POST",
      });

      if (data.success) {
        // Immediately update status to hide statistics
        setImportStatus((prev) => ({
          ...prev,
          status: "processing",
        }));
        setHasStatusChanged(true);
        toast({
          title: "Resync Queued",
          description:
            "Google Contacts import has been queued. It will process in the background.",
        });
        // Track upload initiation immediately
        analytics.trackContactsUploaded({
          source: "google",
          countImported: 0,
          countFailed: 0,
          durationMs: 0,
        });
        // Refresh status after a short delay
        setTimeout(() => {
          void (async () => {
            await fetchImportStatus();
            await refreshGoogleImportAccounts();
          })();
        }, 1000);
      } else {
        // If resync fails due to missing tokens, show connect button instead
        if (
          data.message?.includes("not connected") ||
          data.message?.includes("not found")
        ) {
          setImportStatus((prev) => ({
            ...prev,
            hasTokens: false,
            connected: false,
          }));
          toast({
            title: "Connection Required",
            description:
              "Please connect your Google account first to sync contacts.",
            variant: "default",
          });
        } else {
          toast({
            title: "Resync Failed",
            description:
              data.message || "Failed to queue resync. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Resync Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsResyncing(false);
    }
  };

  const renderAutomaticStep = () =>
    renderGoogleAutomaticStep({
      isLoadingStatus,
      isConnecting,
      importStatus,
      perAccountSyncBusy,
      connectionError,
      handleConnectGoogle,
      importReward,
      googleAccountsData,
      handleResync,
      isResyncing,
      handleResyncToken,
      isDisconnecting,
      setDisconnectTokenId,
      onSuccess,
      handleClose,
    });

  return (
    <>
      <ImportModalShell
        ref={dialogContentRef}
        open={isOpen}
        onOpenChange={handleOpenChange}
        accessibilityTitle="Import Google Contacts"
      >
        <div tabIndex={-1}>{renderAutomaticStep()}</div>
      </ImportModalShell>
      <AlertDialog
        open={disconnectTokenId !== null}
        onOpenChange={(open) => {
          if (!open && !isDisconnecting) {
            setDisconnectTokenId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect this Google account?</AlertDialogTitle>
            <AlertDialogDescription>
              Imports from this account will stop until you connect it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isDisconnecting}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDisconnect()}
            >
              {isDisconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Disconnect
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
