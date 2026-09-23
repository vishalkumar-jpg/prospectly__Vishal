import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactElement,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Loader2,
  Users,
  Mail,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTrustScoreRewardDisplay } from "@/hooks/useTrustScoreRewardDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { apiRequest, api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { ImportModalProgressPanel } from "@/components/getting-started/import-modal/progressPanel";
import { ImportModalShell } from "@/components/getting-started/import-modal/shell";
import { ImportModalTip } from "@/components/getting-started/import-modal/tip";
import { ImportModalPrimaryCta } from "@/components/getting-started/import-modal/primaryCta";
import { ImportModalHero } from "@/components/getting-started/import-modal/hero";
import { ImportModalRewardCard } from "@/components/getting-started/import-modal/rewardCard";
import { ImportModalStatsGrid } from "@/components/getting-started/import-modal/statsGrid";
import { ImportModalActionCard } from "@/components/getting-started/import-modal/actionCard";
import { SourceBrandIconApple } from "@/components/getting-started/sourceBrandIcons";
import { createImportSessionId } from "@/hooks/useImportContacts";
import { cn } from "@/lib/utils";
import { GettingStartedIconBadge } from "@/assets/getting-started/getting-started-icon-badge";
import { Loader } from "@/components/ui/loader";
import {
  importModalAccentGradientBr,
  importModalAccentGradientHover,
  importModalCtaShadow,
  importModalHeroDescriptionClassName,
} from "@/components/getting-started/import-modal/modalStyles";

function fireAndForgetAsync({
  action,
}: {
  action: () => void | Promise<void>;
}): void {
  Promise.resolve(action()).catch(() => undefined);
}

function isAppleAuthErrorMessage({ message }: { message: string }): boolean {
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

type AppleImportStatus = {
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
  tokensInactive?: boolean;
};

type AppleCredentialsStepParams = {
  isLoadingStatus: boolean;
  isConnecting: boolean;
  importStatus: AppleImportStatus | null;
  appleId: string;
  appleSecret: string;
  connectionError: string | null;
  appleAuthReconnectForm: boolean;
  importReward: ReturnType<typeof useTrustScoreRewardDisplay>;
  handleSyncContacts: () => void;
  handleResync: () => void;
  isResyncing: boolean;
  setAppleId: (value: string) => void;
  setAppleSecret: (value: string) => void;
  setAppleAuthReconnectForm: (value: boolean) => void;
  setAutomaticStep: (
    step: "intro" | "apple-open-id" | "apple-create-code" | "credentials"
  ) => void;
  onSuccess?: (sessionId: string, source?: string) => void;
  handleClose: () => void;
};

function getAppleCredentialsDerivedState(
  importStatus: AppleImportStatus | null
) {
  const hasTokens = importStatus?.hasTokens ?? importStatus?.connected ?? false;
  const hasFailedImportWithError = Boolean(
    importStatus?.hasImport &&
    importStatus?.errorMessage &&
    importStatus.status === "failed"
  );
  return { hasTokens, hasFailedImportWithError };
}

function getAppleConnectedStatusFlags(importStatus: AppleImportStatus | null) {
  const status = importStatus?.status || null;
  const isPending = status === "pending";
  const isProcessing = status === "processing";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const errMsg = importStatus?.errorMessage || "";
  return {
    isImporting: isPending || isProcessing,
    isAuthError: isAppleAuthErrorMessage({ message: errMsg }),
    isCompleted,
    isFailed,
    isImportingOrPending: isPending || isProcessing,
  };
}

function renderAppleCredentialsLoading(): ReactElement {
  return <Loader message="Loading import status..." />;
}

function renderAppleReconnectFailedCredentialsForm({
  importStatus,
  appleId,
  appleSecret,
  isConnecting,
  setAppleId,
  setAppleSecret,
  handleSyncContacts,
}: Pick<
  AppleCredentialsStepParams,
  | "importStatus"
  | "appleId"
  | "appleSecret"
  | "isConnecting"
  | "setAppleId"
  | "setAppleSecret"
  | "handleSyncContacts"
>): ReactElement {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <div className="w-10 h-10 mx-auto bg-red-100 rounded-lg flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-base font-semibold">
          Connection Failed - Please Reconnect
        </h3>
        {importStatus?.email && (
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
              {importStatus.email}
            </span>
          </div>
        )}
      </div>

      {importStatus?.errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-800 dark:text-red-200">
              {importStatus.errorMessage}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="appleId" className="text-xs font-medium">
            Apple ID Email
          </Label>
          <Input
            id="appleId"
            type="email"
            placeholder="your.email@icloud.com"
            value={appleId || importStatus?.email || ""}
            onChange={(e) => setAppleId(e.target.value)}
            className="h-9 text-sm"
            data-private="true"
          />
          <p className="text-xs text-muted-foreground">
            The email address associated with your Apple ID
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="appleSecret" className="text-xs font-medium">
            App-Specific Password
          </Label>
          <Input
            id="appleSecret"
            type="password"
            placeholder="xxxx-xxxx-xxxx-xxxx"
            value={appleSecret}
            onChange={(e) => setAppleSecret(e.target.value)}
            className="h-9 font-mono text-sm"
            data-private="true"
          />
          <p className="text-xs text-muted-foreground">
            Generate a new app-specific password from Apple ID settings
          </p>
        </div>

        <div className="flex gap-2 p-2.5 bg-blue-50/50 border border-blue-200 rounded-md">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
          <div className="text-xs text-blue-900">
            <p className="font-medium">Your credentials are encrypted</p>
            <p className="text-blue-800 mt-0.5">
              Bank-level encryption protects your data. We never store your main
              Apple password.
            </p>
          </div>
        </div>
      </div>

      <ImportModalPrimaryCta
        onClick={handleSyncContacts}
        disabled={
          isConnecting || !(appleId || importStatus?.email) || !appleSecret
        }
      >
        <span className="inline-flex items-center gap-2">
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Reconnect &amp; Sync
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </span>
      </ImportModalPrimaryCta>
    </div>
  );
}

function renderAppleAuthErrorReconnectForm(
  params: AppleCredentialsStepParams
): ReactElement {
  const {
    importStatus,
    appleId,
    appleSecret,
    connectionError,
    isConnecting,
    setAppleId,
    setAppleSecret,
    setAppleAuthReconnectForm,
    setAutomaticStep,
    handleSyncContacts,
  } = params;
  const resolvedEmail = appleId.trim() || importStatus?.email?.trim() || "";
  return (
    <div className="space-y-4">
      <ImportModalDots activeIndex={3} total={5} />
      <div className="mb-1 text-center">
        <h3 className="text-xl font-extrabold tracking-tight text-foreground">
          Step 3: Paste it here
        </h3>
        <p className={cn(importModalHeroDescriptionClassName, "mt-1")}>
          Generate a new app-specific password in Apple ID settings, then paste
          it below.
        </p>
      </div>
      {connectionError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-800">{connectionError}</p>
        </div>
      )}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="appleId"
            className="text-xs font-bold text-foreground"
          >
            Your Apple ID email
          </Label>
          <Input
            id="appleId"
            type="email"
            placeholder="your.email@icloud.com"
            value={appleId || importStatus?.email || ""}
            onChange={(e) => setAppleId(e.target.value)}
            className="h-10 rounded-[10px] border-[1.5px] text-sm"
            data-private="true"
          />
          <p className="text-[11px] text-muted-foreground">
            The email you use to sign in to Apple
          </p>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="appleSecret"
            className="text-xs font-bold text-foreground"
          >
            Paste the code from Apple
          </Label>
          <Input
            id="appleSecret"
            type="password"
            placeholder="abcd-efgh-ijkl-mnop"
            value={appleSecret}
            onChange={(e) => setAppleSecret(e.target.value)}
            className="h-10 rounded-[10px] border-[1.5px] font-mono text-sm tracking-wide"
            data-private="true"
          />
          <p className="text-[11px] text-muted-foreground">
            The app-specific password Apple just displayed (4 groups of letters)
          </p>
        </div>
        <ImportModalTip
          icon={<GettingStartedIconBadge name="lock" size="sm" />}
        >
          <strong>Safe and removable.</strong> This code only lets us read
          contacts. You can delete it from Apple anytime.
        </ImportModalTip>
      </div>
      <ImportModalPrimaryCta
        onClick={handleSyncContacts}
        disabled={isConnecting || !resolvedEmail || !appleSecret}
      >
        <span className="inline-flex items-center gap-2">
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Reconnect &amp; Sync
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </span>
      </ImportModalPrimaryCta>
      <Button
        variant="link"
        onClick={() => {
          setAppleAuthReconnectForm(false);
          setAutomaticStep("apple-open-id");
        }}
        className="h-auto w-full py-1 text-xs text-muted-foreground"
      >
        Need help? Walk through the steps again
      </Button>
    </div>
  );
}

function renderAppleAuthErrorPrompt({
  setAppleAuthReconnectForm,
}: Pick<
  AppleCredentialsStepParams,
  "setAppleAuthReconnectForm"
>): ReactElement {
  return (
    <div className="space-y-5">
      <ImportModalDots activeIndex={1} total={3} />
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">
          Reconnect your Apple account
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your contact import or resync failed. Enter fresh credentials to
          restore access.
        </p>
      </div>
      <ImportModalPrimaryCta onClick={() => setAppleAuthReconnectForm(true)}>
        <span className="inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Reconnect Apple Account
        </span>
      </ImportModalPrimaryCta>
    </div>
  );
}

function renderAppleCompletedSuccessStep(
  params: AppleCredentialsStepParams
): ReactElement {
  const {
    importStatus,
    importReward,
    onSuccess,
    handleClose,
    handleResync,
    isResyncing,
  } = params;
  const { isImportingOrPending } = getAppleConnectedStatusFlags(importStatus);
  return (
    <div className="space-y-4">
      <ImportModalDots activeIndex={4} total={5} />
      <ImportModalHero
        variant="success"
        className="mb-0"
        icon={<GettingStartedIconBadge name="check" size="hero" bare />}
        title="Apple Contacts synced!"
        description={importStatus?.email || ""}
      />
      <div className="flex flex-col gap-3.5">
        <ImportModalRewardCard reward={importReward} />
        <ImportModalStatsGrid
          stats={[
            {
              value: importStatus?.totalFetched ?? 0,
              label: "Found",
              variant: "blue",
            },
            {
              value: importStatus?.imported ?? 0,
              label: "Imported",
              variant: "green",
            },
            {
              value: importStatus?.duplicates ?? 0,
              label: "Duplicates",
              variant: "amber",
            },
          ]}
        />
      </div>
      <ImportModalPrimaryCta
        onClick={() => {
          onSuccess?.(createImportSessionId(), "apple");
          fireAndForgetAsync({ action: handleClose });
        }}
      >
        Continue →
      </ImportModalPrimaryCta>
      {importStatus?.completedAt ? (
        <p className="text-center text-xs text-muted-foreground">
          Last synced: {formatLocalizedShortDateTime(importStatus.completedAt)}
        </p>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={handleResync}
        disabled={isResyncing || isImportingOrPending}
      >
        {isResyncing ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Queuing resync...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync again
          </>
        )}
      </Button>
    </div>
  );
}

function renderAppleImportFailedStep({
  importStatus,
  hasFailedImportWithError,
  handleResync,
  isResyncing,
}: Pick<
  AppleCredentialsStepParams,
  "importStatus" | "handleResync" | "isResyncing"
> & { hasFailedImportWithError: boolean }): ReactElement {
  const { isImportingOrPending } = getAppleConnectedStatusFlags(importStatus);
  return (
    <div className="space-y-5">
      <ImportModalDots activeIndex={1} total={3} />
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950/30">
        <AlertCircle className="mx-auto mb-2 h-10 w-10 text-red-600" />
        <h3 className="font-bold text-foreground">Import failed</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFailedImportWithError && importStatus?.errorMessage
            ? importStatus.errorMessage
            : importStatus?.errorMessage ||
              "Something went wrong. You can try again."}
        </p>
      </div>
      <ImportModalPrimaryCta
        onClick={handleResync}
        disabled={isResyncing || isImportingOrPending}
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

function renderAppleConnectedReadyStep({
  importStatus,
  hasFailedImportWithError,
  handleResync,
  isResyncing,
}: Pick<
  AppleCredentialsStepParams,
  "importStatus" | "handleResync" | "isResyncing"
> & { hasFailedImportWithError: boolean }): ReactElement {
  const { isImportingOrPending } = getAppleConnectedStatusFlags(importStatus);
  return (
    <div className="space-y-5">
      <ImportModalDots activeIndex={2} total={3} />
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/40">
          <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="mt-3 text-lg font-bold text-foreground">
          Apple account connected
        </h3>
        {importStatus?.email ? (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-800 dark:bg-blue-950/30">
            <Mail className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
              {importStatus.email}
            </span>
          </div>
        ) : null}
        {hasFailedImportWithError && importStatus?.errorMessage ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-left dark:border-red-900 dark:bg-red-950/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-xs text-red-800 dark:text-red-200">
                {importStatus.errorMessage}
              </p>
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          Connected and ready to sync your contacts.
        </p>
      </div>
      <ImportModalPrimaryCta
        onClick={handleResync}
        disabled={isResyncing || isImportingOrPending}
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

function renderAppleDefaultCredentialsForm(
  params: AppleCredentialsStepParams
): ReactElement {
  const {
    appleId,
    appleSecret,
    connectionError,
    isConnecting,
    setAppleId,
    setAppleSecret,
    setAutomaticStep,
    handleSyncContacts,
  } = params;
  return (
    <div className="space-y-4">
      <ImportModalDots activeIndex={3} total={5} />
      <div className="mb-1 text-center">
        <h3 className="text-xl font-extrabold tracking-tight text-foreground">
          Step 3: Paste it here
        </h3>
        <p className={cn(importModalHeroDescriptionClassName, "mt-1")}>
          Copy the code Apple just showed you and paste it below.
        </p>
      </div>

      {connectionError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-800">{connectionError}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="appleId"
            className="text-xs font-bold text-foreground"
          >
            Your Apple ID email
          </Label>
          <Input
            id="appleId"
            type="email"
            placeholder="your.email@icloud.com"
            value={appleId}
            onChange={(e) => setAppleId(e.target.value)}
            className="h-10 rounded-[10px] border-[1.5px] text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            The email you use to sign in to Apple
          </p>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="appleSecret"
            className="text-xs font-bold text-foreground"
          >
            Paste the code from Apple
          </Label>
          <Input
            id="appleSecret"
            type="password"
            placeholder="abcd-efgh-ijkl-mnop"
            value={appleSecret}
            onChange={(e) => setAppleSecret(e.target.value)}
            className="h-10 rounded-[10px] border-[1.5px] font-mono text-sm tracking-wide"
          />
          <p className="text-[11px] text-muted-foreground">
            The app-specific password Apple just displayed (4 groups of letters)
          </p>
        </div>

        <ImportModalTip
          icon={<GettingStartedIconBadge name="lock" size="sm" />}
        >
          <strong>Safe and removable.</strong> This code only lets us read
          contacts. You can delete it from Apple anytime.
        </ImportModalTip>
      </div>

      <ImportModalPrimaryCta
        onClick={handleSyncContacts}
        disabled={isConnecting || !appleId || !appleSecret}
      >
        <span className="inline-flex items-center gap-2">
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Connect My Contacts
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </span>
      </ImportModalPrimaryCta>

      <Button
        variant="link"
        onClick={() => setAutomaticStep("apple-open-id")}
        className="h-auto w-full py-1 text-xs text-muted-foreground"
      >
        Need help? Walk through the steps again
      </Button>
    </div>
  );
}

function renderAppleHasTokensCredentialsStep(
  params: AppleCredentialsStepParams
): ReactElement {
  const { importStatus, appleAuthReconnectForm } = params;
  const { hasFailedImportWithError } =
    getAppleCredentialsDerivedState(importStatus);
  const flags = getAppleConnectedStatusFlags(importStatus);

  if (flags.isImporting) {
    return <ImportModalProgressPanel providerName="Apple" />;
  }
  if (flags.isAuthError && appleAuthReconnectForm) {
    return renderAppleAuthErrorReconnectForm(params);
  }
  if (flags.isAuthError) {
    return renderAppleAuthErrorPrompt(params);
  }
  if (flags.isCompleted && importStatus?.hasImport) {
    return renderAppleCompletedSuccessStep(params);
  }
  if (flags.isFailed) {
    return renderAppleImportFailedStep({
      ...params,
      hasFailedImportWithError,
    });
  }
  return renderAppleConnectedReadyStep({
    ...params,
    hasFailedImportWithError,
  });
}

function renderAppleCredentialsStep(
  params: AppleCredentialsStepParams
): ReactElement {
  const { isLoadingStatus, isConnecting, importStatus } = params;
  const { hasTokens, hasFailedImportWithError } =
    getAppleCredentialsDerivedState(importStatus);

  if (isLoadingStatus && !importStatus && !isConnecting) {
    return renderAppleCredentialsLoading();
  }

  if (hasFailedImportWithError && !hasTokens && importStatus?.tokensInactive) {
    return renderAppleReconnectFailedCredentialsForm(params);
  }

  if (hasTokens) {
    return renderAppleHasTokensCredentialsStep(params);
  }

  return renderAppleDefaultCredentialsForm(params);
}

type AppleImportTabMode =
  | "intro"
  | "automatic"
  | "manual"
  | "automatic-credentials";

function automaticStepToAppleImportTab(
  step: "intro" | "apple-open-id" | "apple-create-code" | "credentials"
): AppleImportTabMode {
  if (step === "intro") return "intro";
  if (step === "apple-open-id") return "automatic";
  if (step === "apple-create-code") return "manual";
  return "automatic-credentials";
}

function automaticStepFromSavedAppleImportTab(
  tab: AppleImportTabMode | undefined
): "intro" | "apple-open-id" | "apple-create-code" | "credentials" {
  if (tab === "manual") return "apple-create-code";
  if (tab === "automatic-credentials") return "credentials";
  if (tab === "automatic") return "apple-open-id";
  return "intro";
}

interface AppleContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sessionId: string, source?: string) => void;
  onStatusChanged?: () => void;
}

export default function AppleContactsModal({
  isOpen,
  onClose,
  onSuccess,
  onStatusChanged,
}: AppleContactsModalProps) {
  const { user, updateUserConfiguration } = useAuth();
  const importReward = useTrustScoreRewardDisplay("apple");
  const [automaticStep, setAutomaticStep] = useState<
    "intro" | "apple-open-id" | "apple-create-code" | "credentials"
  >("intro");
  const [appleId, setAppleId] = useState("");
  const [appleSecret, setAppleSecret] = useState("");
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
    tokensInactive?: boolean;
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasStatusChanged, setHasStatusChanged] = useState(false);
  /** When tokens exist but Apple auth failed, user must see the credential form (hasTokens branch would otherwise loop). */
  const [appleAuthReconnectForm, setAppleAuthReconnectForm] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const statusPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useDialogFocus(isOpen, dialogContentRef);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasStatusChanged(false);
      setAppleAuthReconnectForm(false);
    }
  }, [isOpen]);

  // Fetch import status when modal opens — clear stale status first so we never
  // branch on hasTokens/connected from a previous open (that forced step 3 while DB says manual / step 2).
  useEffect(() => {
    if (isOpen) {
      setImportStatus(null);
      fireAndForgetAsync({ action: fetchImportStatus });
    }
    return () => {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current);
      }
    };
  }, [isOpen]);

  // Update automaticStep based on connection status
  // Only update step when modal opens or importStatus changes, not when user is typing
  useEffect(() => {
    if (isOpen && importStatus !== null) {
      const hasTokens =
        importStatus?.hasTokens ?? importStatus?.connected ?? false;

      // Pre-populate email if there's a failed import (only once, when status first loads)
      if (
        importStatus?.hasImport &&
        importStatus?.errorMessage &&
        importStatus.status === "failed" &&
        importStatus.email &&
        !appleId
      ) {
        setAppleId(importStatus.email);
      }

      setAutomaticStep((prev) => {
        if (prev !== "intro") {
          return prev;
        }
        return automaticStepFromSavedAppleImportTab(
          user?.userConfiguration?.appleImportTab
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, importStatus, user?.userConfiguration?.appleImportTab]); // appleId and automaticStep intentionally excluded to prevent step changes when typing

  // Track when user manually navigates to credentials form
  const handleNavigateToCredentials = () => {
    setAutomaticStep("credentials");
  };

  // Poll for status updates when import is in progress
  useEffect(() => {
    if (
      isOpen &&
      (importStatus?.status === "processing" ||
        importStatus?.status === "pending")
    ) {
      statusPollIntervalRef.current = setInterval(() => {
        fetchImportStatus();
      }, 3000); // Poll every 3 seconds
    } else if (statusPollIntervalRef.current) {
      clearInterval(statusPollIntervalRef.current);
      statusPollIntervalRef.current = null;
    }

    return () => {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current);
      }
    };
  }, [isOpen, importStatus?.status]);

  const fetchImportStatus = async () => {
    setIsLoadingStatus(true);
    try {
      // Use centralized API request which includes proactive token refresh
      const data = await api.contacts.getAppleImportStatus();
      setImportStatus(data);
    } catch {
      // User may not have imported yet, set default state
      // Error is silently handled as this is expected for users who haven't imported yet
      setImportStatus({
        hasImport: false,
        connected: false,
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleClose = useCallback(() => {
    // If status changed (connect or resync), refresh the status before closing
    if (hasStatusChanged && onStatusChanged) {
      onStatusChanged();
    }

    const tab = automaticStepToAppleImportTab(automaticStep);
    if (tab !== user?.userConfiguration?.appleImportTab) {
      fireAndForgetAsync({
        action: async () => {
          const response = await api.profiles.updateConfiguration({
            appleImportTab: tab,
          });
          if (response) {
            updateUserConfiguration(response);
          }
        },
      });
    }

    setHasStatusChanged(false);
    setAppleAuthReconnectForm(false);
    setAutomaticStep("intro");
    setAppleId("");
    setAppleSecret("");
    setConnectionError(null);
    setIsConnecting(false);
    onClose();
  }, [
    automaticStep,
    hasStatusChanged,
    onClose,
    onStatusChanged,
    updateUserConfiguration,
    user?.userConfiguration?.appleImportTab,
  ]);

  const handleSyncContacts = async () => {
    const resolvedAppleId = appleId.trim() || importStatus?.email?.trim() || "";
    if (!resolvedAppleId || !appleSecret) {
      toast({
        title: "Credentials Required",
        description: "Please enter your Apple ID and App-Specific Password",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const data = await apiRequest<{
        success: boolean;
        message?: string;
        warning?: string;
        jobId?: string;
      }>("/contacts/apple-import/connect", {
        method: "POST",
        body: JSON.stringify({
          apple_id: resolvedAppleId,
          app_password: appleSecret,
        }),
      });
      if (data.success) {
        setConnectionError(null);
        setHasStatusChanged(true);
        setAppleAuthReconnectForm(false);

        // Track upload initiation immediately
        analytics.trackContactsUploaded({
          source: "apple",
          countImported: 0,
          countFailed: 0,
          durationMs: 0,
        });
        if (data.warning) {
          toast({
            title: "Connection Successful",
            description:
              data.warning === "import_queued_failed"
                ? "Connection successful, but import queuing failed. You can retry the import."
                : "Connection successful, but import setup failed. You can retry the import.",
            variant: "default",
          });
        } else {
          toast({
            title: "Apple Account Connected",
            description:
              "Your Apple contacts are being imported in the background.",
          });
        }

        // Clear credentials from form
        setAppleId("");
        setAppleSecret("");

        // Set step to credentials to show statistics
        setAutomaticStep("credentials");

        // Fetch status immediately
        setIsLoadingStatus(true);
        setTimeout(async () => {
          try {
            await fetchImportStatus();
          } catch {
            // Retry once after 2 seconds if initial fetch fails
            setTimeout(async () => {
              try {
                await fetchImportStatus();
              } catch {
                // Error is silently handled - status will remain unchanged
              }
            }, 2000);
          }
        }, 1000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while connecting to Apple";
      setConnectionError(errorMessage);
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
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
      }>("/contacts/apple-import/resync", {
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
            "Apple Contacts import has been queued. It will process in the background.",
        });
        // Track upload initiation immediately
        analytics.trackContactsUploaded({
          source: "apple",
          countImported: 0,
          countFailed: 0,
          durationMs: 0,
        });
        setTimeout(() => {
          fetchImportStatus();
        }, 1000);
      } else {
        if (
          data.message?.includes("not connected") ||
          data.message?.includes("not found") ||
          data.message?.includes("Invalid Apple ID") ||
          data.message?.includes("App-Specific Password")
        ) {
          // Credentials are invalid, user needs to reconnect
          setConnectionError(data.message);
          toast({
            title: "Resync Failed",
            description:
              data.message ||
              "Please verify your credentials and reconnect your Apple account.",
            variant: "destructive",
          });
          // Reset connection status and show credentials form
          setImportStatus({
            hasImport: false,
            connected: false,
          });
          setAutomaticStep("credentials"); // Show credentials form so user can re-enter
        } else {
          toast({
            title: "Resync Failed",
            description: data.message || "Failed to resync Apple contacts",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while resyncing";
      toast({
        title: "Resync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsResyncing(false);
    }
  };

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        handleClose();
      }
    },
    [handleClose]
  );

  const renderIntroStep = () => (
    <div className="space-y-5">
      <ImportModalDots activeIndex={0} total={5} />
      <ImportModalHero
        variant="apple"
        icon={<SourceBrandIconApple className="dark:fill-foreground" />}
        title="Import your Apple contacts"
        description={
          <>
            Apple requires a one-time setup to allow Prospectly to read your
            contacts. We&apos;ll walk you through each step.
          </>
        }
        badge="~ 2 minutes · We'll guide every click"
      />
      <ImportModalTip icon={<GettingStartedIconBadge name="lock" size="sm" />}>
        <strong>Your Apple password stays with you.</strong> Apple will create a
        separate code just for Prospectly that you can delete anytime.
      </ImportModalTip>
      <ImportModalPrimaryCta
        onClick={() => {
          setAutomaticStep("apple-open-id");
        }}
      >
        Let&apos;s Start →
      </ImportModalPrimaryCta>
    </div>
  );

  const renderAppleOpenIdStep = () => (
    <div className="space-y-4">
      <ImportModalDots activeIndex={1} total={5} />
      <div className="mb-5 text-center">
        <h3 className="mb-1 text-xl font-extrabold tracking-tight text-foreground">
          Step 1: Open your Apple ID
        </h3>
        <p className={importModalHeroDescriptionClassName}>
          Click the button below. Apple&apos;s website will open in a new tab.
          Sign in if asked.
        </p>
      </div>
      <ImportModalActionCard
        title="Open Apple ID in a new tab"
        description="Sign in with the same Apple ID you use on your iPhone or Mac."
        visual={<GettingStartedIconBadge name="globe" size="hero" />}
        visualClassName="text-2xl"
      >
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[10px] px-6 py-2.5 text-sm font-bold text-white transition-transform",
            importModalAccentGradientBr,
            importModalAccentGradientHover,
            importModalCtaShadow,
            "hover:scale-[1.03]"
          )}
          onClick={() =>
            window.open(
              "https://appleid.apple.com/account/manage",
              "_blank",
              "noopener,noreferrer"
            )
          }
        >
          Open Apple ID
          <ExternalLink className="h-4 w-4" />
        </button>
      </ImportModalActionCard>
      <ImportModalPrimaryCta
        onClick={() => setAutomaticStep("apple-create-code")}
      >
        I&apos;m Signed In →
      </ImportModalPrimaryCta>
      <button
        type="button"
        onClick={() => setAutomaticStep("intro")}
        className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        ← Go back
      </button>
    </div>
  );

  const renderAppleCreateCodeStep = () => (
    <div className="space-y-4">
      <ImportModalDots activeIndex={2} total={5} />
      <div className="mb-5 text-center">
        <h3 className="mb-1 text-xl font-extrabold tracking-tight text-foreground">
          Step 2: Create a code for Prospectly
        </h3>
        <p className="text-[13px] text-muted-foreground">
          On the Apple ID page, follow these clicks:
        </p>
      </div>
      <div
        className={cn(
          "mb-4 rounded-[14px] border-[1.5px] border-border bg-muted/40 px-5 py-5 text-left transition-colors",
          "hover:border-gs-amethyst/50 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
        )}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-white",
              importModalAccentGradientBr
            )}
          >
            1
          </div>
          <p className="min-w-0 text-sm">
            <strong>Click &quot;Sign-In and Security&quot;</strong> in the left
            menu
          </p>
        </div>
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-white",
              importModalAccentGradientBr
            )}
          >
            2
          </div>
          <p className="text-sm">
            <strong>Click &quot;App-Specific Passwords&quot;</strong>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-white",
              importModalAccentGradientBr
            )}
          >
            3
          </div>
          <p className="min-w-0 text-sm">
            <strong>Click &quot;Generate&quot;</strong> and type{" "}
            <code className="rounded bg-secondary px-2 py-0.5 text-[13px] font-bold">
              Prospectly
            </code>{" "}
            as the name
          </p>
        </div>
      </div>
      <ImportModalTip icon={<GettingStartedIconBadge name="eye" size="sm" />}>
        Apple will show you a code like{" "}
        <strong className="font-mono">abcd-efgh-ijkl-mnop</strong>. Keep this
        tab open — you&apos;ll paste it next.
      </ImportModalTip>
      <ImportModalPrimaryCta onClick={handleNavigateToCredentials}>
        I See the Code →
      </ImportModalPrimaryCta>
      <button
        type="button"
        onClick={() => setAutomaticStep("apple-open-id")}
        className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        ← Go back
      </button>
    </div>
  );

  const renderCredentialsStep = () =>
    renderAppleCredentialsStep({
      isLoadingStatus,
      isConnecting,
      importStatus,
      appleId,
      appleSecret,
      connectionError,
      appleAuthReconnectForm,
      importReward,
      handleSyncContacts,
      handleResync,
      isResyncing,
      setAppleId,
      setAppleSecret,
      setAppleAuthReconnectForm,
      setAutomaticStep,
      onSuccess,
      handleClose,
    });

  return (
    <ImportModalShell
      ref={dialogContentRef}
      open={isOpen}
      onOpenChange={handleOpenChange}
      accessibilityTitle="Import Apple Contacts"
    >
      <div tabIndex={-1}>
        {/* Show loader during initial status fetch to prevent intro step flash */}
        {isLoadingStatus && !importStatus && !isConnecting ? (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <Loader />
              <p className="text-sm text-muted-foreground">
                Loading import status...
              </p>
            </div>
          </div>
        ) : (
          <>
            {automaticStep === "intro" && renderIntroStep()}
            {automaticStep === "apple-open-id" && renderAppleOpenIdStep()}
            {automaticStep === "apple-create-code" &&
              renderAppleCreateCodeStep()}
            {automaticStep === "credentials" && renderCredentialsStep()}
          </>
        )}
      </div>
    </ImportModalShell>
  );
}
