import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactElement,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useTrustScoreRewardDisplay } from "@/hooks/useTrustScoreRewardDisplay";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { apiRequest, api } from "@/lib/api";
import { getFriendlyOAuthErrorMessage } from "@/lib/oauth-user-error";
import { toUTC } from "@/lib/dayjs";
import { AnyType } from "@/types/common";
import { analytics } from "@/lib/analytics";
import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { ImportModalProgressPanel } from "@/components/getting-started/import-modal/progressPanel";
import { ImportModalShell } from "@/components/getting-started/import-modal/shell";
import { ImportModalHero } from "@/components/getting-started/import-modal/hero";
import { ImportModalTip } from "@/components/getting-started/import-modal/tip";
import { ImportModalPrimaryCta } from "@/components/getting-started/import-modal/primaryCta";
import { ImportModalRewardCard } from "@/components/getting-started/import-modal/rewardCard";
import { ImportModalStatsGrid } from "@/components/getting-started/import-modal/statsGrid";
import { SourceBrandIconMicrosoft } from "@/components/getting-started/sourceBrandIcons";
import { GettingStartedIconBadge } from "@/assets/getting-started/getting-started-icon-badge";
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
import { Users, Loader2, AlertCircle, Mail, RefreshCw } from "lucide-react";
import { Loader } from "./ui/loader";

function fireAndForgetAsync({
  action,
}: {
  action: () => void | Promise<void>;
}): void {
  Promise.resolve(action()).catch(() => undefined);
}

function isMicrosoftAuthErrorMessage({
  message,
}: {
  message: string;
}): boolean {
  const m = message.toLowerCase();
  return (
    message.includes("401") ||
    m.includes("unauthenticated") ||
    m.includes("invalid authentication") ||
    m.includes("not connected") ||
    m.includes("failed to decrypt") ||
    m.includes("failed to fetch")
  );
}

function MicrosoftOAuthButtonIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M11.4 24H0V12.6h11.4V24z" />
      <path fill="#7FBA00" d="M24 24H12.6V12.6H24V24z" />
      <path fill="#00A4EF" d="M11.4 11.4H0V0h11.4v11.4z" />
      <path fill="#FFB900" d="M24 11.4H12.6V0H24v11.4z" />
    </svg>
  );
}

async function refreshMicrosoftImportState({
  fetchImportStatus,
  fetchMicrosoftAccounts,
}: {
  fetchImportStatus: (background?: boolean) => Promise<void>;
  fetchMicrosoftAccounts: () => Promise<void>;
}): Promise<void> {
  await fetchImportStatus();
  await fetchMicrosoftAccounts();
}

function scheduleMicrosoftImportRefresh({
  fetchImportStatus,
  fetchMicrosoftAccounts,
  delayMs,
}: {
  fetchImportStatus: (background?: boolean) => Promise<void>;
  fetchMicrosoftAccounts: () => Promise<void>;
  delayMs: number;
}): void {
  setTimeout(() => {
    refreshMicrosoftImportState({
      fetchImportStatus,
      fetchMicrosoftAccounts,
    }).catch(() => undefined);
  }, delayMs);
}

function runMicrosoftImportRefreshWithRetry({
  fetchImportStatus,
  fetchMicrosoftAccounts,
  retryDelayMs,
}: {
  fetchImportStatus: (background?: boolean) => Promise<void>;
  fetchMicrosoftAccounts: () => Promise<void>;
  retryDelayMs: number;
}): void {
  refreshMicrosoftImportState({
    fetchImportStatus,
    fetchMicrosoftAccounts,
  }).catch(() => {
    scheduleMicrosoftImportRefresh({
      fetchImportStatus,
      fetchMicrosoftAccounts,
      delayMs: retryDelayMs,
    });
  });
}

function scheduleMicrosoftImportRefreshRetry({
  fetchImportStatus,
  fetchMicrosoftAccounts,
  initialDelayMs,
  retryDelayMs,
}: {
  fetchImportStatus: (background?: boolean) => Promise<void>;
  fetchMicrosoftAccounts: () => Promise<void>;
  initialDelayMs: number;
  retryDelayMs: number;
}): void {
  setTimeout(() => {
    runMicrosoftImportRefreshWithRetry({
      fetchImportStatus,
      fetchMicrosoftAccounts,
      retryDelayMs,
    });
  }, initialDelayMs);
}

function handleMicrosoftPopupClosed({
  fetchImportStatus,
  fetchMicrosoftAccounts,
  setIsLoadingStatus,
}: {
  fetchImportStatus: (background?: boolean) => Promise<void>;
  fetchMicrosoftAccounts: () => Promise<void>;
  setIsLoadingStatus: (loading: boolean) => void;
}): void {
  setIsLoadingStatus(true);
  scheduleMicrosoftImportRefreshRetry({
    fetchImportStatus,
    fetchMicrosoftAccounts,
    initialDelayMs: 1500,
    retryDelayMs: 2000,
  });
}

type MicrosoftListImportAccountsResponse = Awaited<
  ReturnType<typeof api.contacts.listImportAccounts>
>;

type MicrosoftImportStatus = {
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
};

type MicrosoftAutomaticStepParams = {
  isLoadingStatus: boolean;
  isConnecting: boolean;
  importStatus: MicrosoftImportStatus | null;
  perAccountSyncBusy: boolean;
  connectionError: string | null;
  handleConnectMicrosoft: () => void;
  importReward: ReturnType<typeof useTrustScoreRewardDisplay>;
  microsoftAccountsData: MicrosoftListImportAccountsResponse | null;
  handleResync: () => void;
  isResyncing: boolean;
  handleResyncToken: (tokenId: string) => void;
  isDisconnecting: boolean;
  setDisconnectTokenId: (id: string | null) => void;
};

function getMicrosoftImportStatusFlags({
  importStatus,
  perAccountSyncBusy,
}: {
  importStatus: MicrosoftImportStatus | null;
  perAccountSyncBusy: boolean;
}) {
  const status = importStatus?.status || null;
  const isCompleted = status === "completed";
  return {
    isImporting:
      status === "pending" ||
      status === "processing" ||
      (isCompleted && importStatus?.hasImport === true && perAccountSyncBusy),
    isAuthError: isMicrosoftAuthErrorMessage({
      message: importStatus?.errorMessage || "",
    }),
    isCompleted,
    isFailed: status === "failed",
  };
}

function renderMicrosoftAutomaticLoading(): ReactElement {
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

function renderMicrosoftConnectFirstStep({
  connectionError,
  handleConnectMicrosoft,
  isConnecting,
}: Pick<
  MicrosoftAutomaticStepParams,
  "connectionError" | "handleConnectMicrosoft" | "isConnecting"
>): ReactElement {
  return (
    <div className="space-y-5">
      <ImportModalDots activeIndex={0} total={2} />
      <ImportModalHero
        variant="microsoft"
        icon={<SourceBrandIconMicrosoft />}
        title="Connect Microsoft Contacts"
        description="One click to sync Outlook, Office 365, or Hotmail contacts."
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
        onClick={handleConnectMicrosoft}
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
              <MicrosoftOAuthButtonIcon />
              Sign in with Microsoft →
            </>
          )}
        </span>
      </ImportModalPrimaryCta>
      <ImportModalTip icon={<GettingStartedIconBadge name="lock" size="sm" />}>
        <strong>Read-only access.</strong> We only see contact names and emails.
        Nothing is modified or sent.
      </ImportModalTip>
    </div>
  );
}

function renderMicrosoftAuthReconnectStep({
  handleConnectMicrosoft,
  isConnecting,
}: Pick<
  MicrosoftAutomaticStepParams,
  "handleConnectMicrosoft" | "isConnecting"
>): ReactElement {
  return (
    <div className="space-y-5">
      <ImportModalDots activeIndex={1} total={3} />
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">
          Reconnect your Microsoft account
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your contact import or resync failed. Reconnect to restore access.
        </p>
      </div>
      <ImportModalPrimaryCta
        onClick={handleConnectMicrosoft}
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
              <MicrosoftOAuthButtonIcon />
              Reconnect Microsoft Account
            </>
          )}
        </span>
      </ImportModalPrimaryCta>
    </div>
  );
}

function renderMicrosoftAccountAccordionItem({
  acc,
  isResyncing,
  isImporting,
  isDisconnecting,
  handleResyncToken,
  setDisconnectTokenId,
}: {
  acc: MicrosoftListImportAccountsResponse["accounts"][number];
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
              {
                value: li?.totalFetched ?? 0,
                label: "Found",
                variant: "blue",
              },
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

function renderMicrosoftCompletedSyncedStep(
  params: MicrosoftAutomaticStepParams
): ReactElement {
  const {
    importStatus,
    importReward,
    microsoftAccountsData,
    handleConnectMicrosoft,
    isConnecting,
    handleResyncToken,
    isResyncing,
    isDisconnecting,
    setDisconnectTokenId,
    perAccountSyncBusy,
  } = params;
  const { isImporting } = getMicrosoftImportStatusFlags({
    importStatus,
    perAccountSyncBusy,
  });
  const apiTotals = microsoftAccountsData?.combinedLatestImportTotals;
  const statsForGrid =
    apiTotals != null
      ? {
          totalFetched: apiTotals.totalFetched,
          imported: apiTotals.imported,
          duplicates: apiTotals.duplicates,
        }
      : {
          totalFetched: importStatus?.totalFetched ?? 0,
          imported: importStatus?.imported ?? 0,
          duplicates: importStatus?.duplicates ?? 0,
        };
  const activeAccounts =
    microsoftAccountsData?.accounts.filter((a) => a.isActive) ?? [];

  return (
    <div className="space-y-4">
      <ImportModalDots activeIndex={1} total={2} />
      <ImportModalHero
        variant="success"
        className="mb-0"
        icon={<GettingStartedIconBadge name="check" size="hero" bare />}
        title="Microsoft Contacts synced!"
        description={importStatus?.email || ""}
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

      {activeAccounts.length > 0 && microsoftAccountsData ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-left text-sm">
          <p className="mb-2 font-medium text-foreground">
            Connected Microsoft accounts ({activeAccounts.length}/
            {microsoftAccountsData.maxAccountsPerProvider})
          </p>
          <Accordion type="single" collapsible className="w-full">
            {activeAccounts.map((acc) =>
              renderMicrosoftAccountAccordionItem({
                acc,
                isResyncing,
                isImporting,
                isDisconnecting,
                handleResyncToken,
                setDisconnectTokenId,
              })
            )}
          </Accordion>
          {activeAccounts.length <
          microsoftAccountsData.maxAccountsPerProvider ? (
            <ImportModalPrimaryCta
              className="mt-3 w-full py-2.5 text-[13px]"
              onClick={() =>
                fireAndForgetAsync({ action: handleConnectMicrosoft })
              }
              disabled={isConnecting || isImporting}
            >
              {isConnecting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  Connecting…
                </span>
              ) : (
                "Connect another Microsoft account"
              )}
            </ImportModalPrimaryCta>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function renderMicrosoftImportFailedStep({
  importStatus,
  handleResync,
  isResyncing,
  perAccountSyncBusy,
}: Pick<
  MicrosoftAutomaticStepParams,
  "importStatus" | "handleResync" | "isResyncing" | "perAccountSyncBusy"
>): ReactElement {
  const { isImporting } = getMicrosoftImportStatusFlags({
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

function renderMicrosoftConnectedReadyStep({
  importStatus,
  handleResync,
  isResyncing,
  perAccountSyncBusy,
}: Pick<
  MicrosoftAutomaticStepParams,
  "importStatus" | "handleResync" | "isResyncing" | "perAccountSyncBusy"
>): ReactElement {
  const { isImporting } = getMicrosoftImportStatusFlags({
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
          Microsoft account connected
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

function renderMicrosoftAutomaticStep(
  params: MicrosoftAutomaticStepParams
): ReactElement {
  const { isLoadingStatus, isConnecting, importStatus, perAccountSyncBusy } =
    params;

  if (isLoadingStatus && !isConnecting) {
    return renderMicrosoftAutomaticLoading();
  }

  const hasTokens = importStatus?.hasTokens ?? importStatus?.connected ?? false;
  if (!hasTokens) {
    return renderMicrosoftConnectFirstStep(params);
  }

  const flags = getMicrosoftImportStatusFlags({
    importStatus,
    perAccountSyncBusy,
  });
  if (flags.isImporting) {
    return <ImportModalProgressPanel providerName="Microsoft" />;
  }
  if (flags.isAuthError) {
    return renderMicrosoftAuthReconnectStep(params);
  }
  if (flags.isCompleted && importStatus?.hasImport) {
    return renderMicrosoftCompletedSyncedStep(params);
  }
  if (flags.isFailed) {
    return renderMicrosoftImportFailedStep(params);
  }
  return renderMicrosoftConnectedReadyStep(params);
}

interface MicrosoftContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sessionId: string) => void;
  onStatusChanged?: () => void;
}

export default function MicrosoftContactsModal({
  isOpen,
  onClose,
  onSuccess,
  onStatusChanged,
}: MicrosoftContactsModalProps) {
  const importReward = useTrustScoreRewardDisplay("microsoft");
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [importStatus, setImportStatus] = useState<{
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
  const [microsoftAccountsData, setMicrosoftAccountsData] =
    useState<MicrosoftListImportAccountsResponse | null>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const statusPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useDialogFocus(isOpen, dialogContentRef);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setImportedCount(null);
      setHasStatusChanged(false);
    }
  }, [isOpen]);

  const fetchMicrosoftAccounts = async () => {
    try {
      const d = await api.contacts.listImportAccounts("microsoft");
      setMicrosoftAccountsData(d);
    } catch {
      setMicrosoftAccountsData(null);
    }
  };

  const perAccountSyncBusy = useMemo(() => {
    return (microsoftAccountsData?.accounts ?? [])
      .filter((a) => a.isActive)
      .some((a) => {
        const li = a.latestImport;
        return (
          li == null || li.status === "pending" || li.status === "processing"
        );
      });
  }, [microsoftAccountsData]);

  // Fetch import status when modal opens
  useEffect(() => {
    if (isOpen) {
      fireAndForgetAsync({ action: fetchImportStatus });
      fireAndForgetAsync({ action: fetchMicrosoftAccounts });
      checkUrlParams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // checkUrlParams intentionally excluded to avoid re-running on every render

  // Poll for status updates when aggregate import runs, or when completed but a token import is still in flight
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
        fireAndForgetAsync({ action: () => fetchImportStatus(true) });
        fireAndForgetAsync({ action: fetchMicrosoftAccounts });
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
  ]);

  const checkUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const errorMessage = urlParams.get("message");
    const success = urlParams.get("microsoft_contacts_connected");
    const warning = urlParams.get("warning");

    if (error) {
      setConnectionError(
        getFriendlyOAuthErrorMessage(
          errorMessage ||
            "Failed to connect Microsoft account. Please try again."
        )
      );
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh status to get latest state
      fireAndForgetAsync({ action: fetchImportStatus });
      fireAndForgetAsync({ action: fetchMicrosoftAccounts });
    } else if (success) {
      setHasStatusChanged(true);
      toast.success("Microsoft Account Connected", {
        description:
          "Your Microsoft contacts will be imported in the background.",
      });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh status
      fireAndForgetAsync({ action: fetchImportStatus });
      fireAndForgetAsync({ action: fetchMicrosoftAccounts });
    } else if (warning) {
      setHasStatusChanged(true);
      toast.info("Connection Successful", {
        description:
          "Microsoft account connected, but import queueing failed. You can retry the import.",
      });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh status
      fireAndForgetAsync({ action: fetchImportStatus });
      fireAndForgetAsync({ action: fetchMicrosoftAccounts });
    }
  };

  const fetchImportStatus = async (background = false) => {
    if (!background) {
      setIsLoadingStatus(true);
    }
    try {
      // Use centralized API request which includes proactive token refresh
      const data = await api.contacts.getMicrosoftImportStatus();
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

  const handleConnectMicrosoft = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const data = await apiRequest<{ authUrl?: string; message?: string }>(
        "/contacts/microsoft-import/connect",
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
          "Microsoft Contacts Connect",
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          toast.error("Popup Blocked", {
            description:
              "Please allow popups for this site to connect your Microsoft account.",
          });
          setIsConnecting(false);
          return;
        }

        // Listen for OAuth result via multiple methods
        let channel: BroadcastChannel | null = null;
        let pollInterval: NodeJS.Timeout | null = null;
        let localStoragePollInterval: NodeJS.Timeout | null = null;
        const connectStartTime = toUTC().getTime();

        // Clear AnyType existing localStorage result before starting
        try {
          localStorage.removeItem("microsoft-oauth-result");
        } catch {
          // Silent fail
        }

        // Shared cleanup function
        const cleanup = () => {
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
            localStorage.removeItem("microsoft-oauth-result");
          } catch {
            // Silent fail
          }
          if (popup && !popup.closed) {
            popup.close();
          }
          setIsConnecting(false);
        };

        const handleConnectionSuccess = async (data: AnyType) => {
          setIsLoadingStatus(true);
          cleanup();
          setConnectionError(null);
          setHasStatusChanged(true);

          if (data.alreadyConnected) {
            toast.info("Account already connected", {
              description:
                typeof data.message === "string"
                  ? data.message
                  : "This account is already connected.",
            });
          } else {
            // Track upload initiation immediately
            analytics.trackContactsUploaded({
              source: "microsoft",
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
              toast.info("Connection Successful", {
                description: warningMessage,
              });
            } else {
              toast.success("Microsoft Account Connected", {
                description:
                  "Your Microsoft contacts are being imported in the background.",
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
          // Immediately refresh status to show import progress
          runMicrosoftImportRefreshWithRetry({
            fetchImportStatus,
            fetchMicrosoftAccounts,
            retryDelayMs: 2000,
          });
        };

        const handleConnectionError = (errorData: AnyType) => {
          cleanup();
          const friendly = getFriendlyOAuthErrorMessage(
            errorData.message || "Failed to connect Microsoft account"
          );
          setConnectionError(friendly);
          toast.error("Connection Failed", {
            description: friendly,
          });
        };

        // Setup message handlers
        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) {
            return;
          }
          if (event.data?.type === "microsoft-contacts-connected") {
            if (event.data.error) {
              handleConnectionError(event.data);
            } else {
              handleConnectionSuccess(event.data);
            }
          }
        };

        try {
          channel = new BroadcastChannel("microsoft-oauth");
          channel.onmessage = async (event) => {
            if (event.data?.type === "microsoft-contacts-connected") {
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
        localStoragePollInterval = setInterval(async () => {
          try {
            const result = localStorage.getItem("microsoft-oauth-result");
            if (result) {
              const data = JSON.parse(result);
              // Only process results that were set after we started connecting
              if (data.timestamp && data.timestamp > connectStartTime) {
                if (data.error) {
                  handleConnectionError(data);
                } else {
                  handleConnectionSuccess(data);
                }
              }
            }
          } catch {
            // Silent fail for localStorage parsing
          }
        }, 500);

        // Poll for popup closure and check for callback
        pollInterval = setInterval(() => {
          if (popup.closed) {
            cleanup();
            handleMicrosoftPopupClosed({
              fetchImportStatus,
              fetchMicrosoftAccounts,
              setIsLoadingStatus,
            });
          }
        }, 500);

        window.addEventListener("message", handleMessage);

        // Cleanup after 5 minutes
        setTimeout(() => {
          cleanup();
        }, 300000);
      } else {
        throw new Error(
          data.message || "Failed to initiate Microsoft connection"
        );
      }
    } catch (error) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while connecting to Microsoft";
      const errorMessage = getFriendlyOAuthErrorMessage(rawMessage);
      setConnectionError(errorMessage);
      toast.error("Connection Failed", {
        description: errorMessage,
      });
      setIsConnecting(false);
    }
  };

  const handleResync = async () => {
    setIsResyncing(true);
    try {
      const data = await apiRequest<{
        success: boolean;
        message?: string;
        jobId?: string;
      }>("/contacts/microsoft-import/resync", {
        method: "POST",
      });

      if (data.success) {
        // Immediately update status to hide statistics
        setImportStatus((prev) => ({
          ...prev,
          status: "processing",
        }));
        setHasStatusChanged(true);
        toast.success("Resync Queued", {
          description:
            "Microsoft Contacts import has been queued. It will process in the background.",
        });
        // Track upload initiation immediately
        analytics.trackContactsUploaded({
          source: "microsoft",
          countImported: 0,
          countFailed: 0,
          durationMs: 0,
        });

        setTimeout(() => {
          fireAndForgetAsync({ action: fetchImportStatus });
          fireAndForgetAsync({ action: fetchMicrosoftAccounts });
        }, 1000);
      } else {
        if (
          data.message?.includes("not connected") ||
          data.message?.includes("not found")
        ) {
          setImportStatus((prev) => ({
            ...prev,
            hasTokens: false,
            connected: false,
          }));
          toast.info("Connection Required", {
            description:
              "Please connect your Microsoft account first to sync contacts.",
          });
        } else {
          toast.error("Resync Failed", {
            description:
              data.message || "Failed to queue resync. Please try again.",
          });
        }
      }
    } catch (error) {
      toast.error("Resync Error", {
        description:
          error instanceof Error ? error.message : "An error occurred",
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
      toast.success("Account disconnected");
      await fetchImportStatus();
      await fetchMicrosoftAccounts();
      setDisconnectTokenId(null);
    } catch (error) {
      toast.error("Disconnect failed", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsDisconnecting(false);
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
        toast.success("Resync Queued", {
          description:
            "Microsoft Contacts import has been queued for this account.",
        });
        analytics.trackContactsUploaded({
          source: "microsoft",
          countImported: 0,
          countFailed: 0,
          durationMs: 0,
        });
        setTimeout(() => {
          fireAndForgetAsync({ action: fetchImportStatus });
          fireAndForgetAsync({ action: fetchMicrosoftAccounts });
        }, 1000);
      } else {
        toast.error("Resync Failed", {
          description:
            data.warning ||
            data.message ||
            "Failed to queue resync. Please try again.",
        });
      }
    } catch (error) {
      toast.error("Resync Error", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsResyncing(false);
    }
  };

  const handleClose = useCallback(async () => {
    // If status changed (connect or resync), refresh the status before closing
    if (hasStatusChanged && onStatusChanged) {
      onStatusChanged();
    }
    setImportedCount(null);
    setImportStatus(null);
    setIsConnecting(false);
    setConnectionError(null);
    setHasStatusChanged(false);
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

  const renderAutomaticStep = () =>
    renderMicrosoftAutomaticStep({
      isLoadingStatus,
      isConnecting,
      importStatus,
      perAccountSyncBusy,
      connectionError,
      handleConnectMicrosoft,
      importReward,
      microsoftAccountsData,
      handleResync,
      isResyncing,
      handleResyncToken,
      isDisconnecting,
      setDisconnectTokenId,
    });

  return (
    <>
      <ImportModalShell
        ref={dialogContentRef}
        open={isOpen}
        onOpenChange={handleOpenChange}
        accessibilityTitle="Import Microsoft Contacts"
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
            <AlertDialogTitle>
              Disconnect this Microsoft account?
            </AlertDialogTitle>
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
              onClick={() => fireAndForgetAsync({ action: confirmDisconnect })}
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
