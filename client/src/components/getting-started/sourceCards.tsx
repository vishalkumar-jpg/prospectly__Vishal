import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  getCreditInfoForProvider,
  formatConnectorCreditsDollars,
  type ConnectorCreditInfo,
} from "@/lib/creditRulesUi";
import type { ContactSourceStatus } from "@/hooks/useContactSourceStatus";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Clock, Link2, Users } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { importModalAccentGradientBr } from "@/components/getting-started/import-modal/modalStyles";
import {
  SourceBrandIconApple,
  SourceBrandIconGoogle,
  SourceBrandIconMicrosoft,
  SourceCsvUploadIcon,
} from "@/components/getting-started/sourceBrandIcons";
import { connectedAccountsLine } from "@/lib/getting-started-import-rewards";
import {
  APPLE_IMPORT_ACCOUNTS_QUERY_KEY,
  GOOGLE_IMPORT_ACCOUNTS_QUERY_KEY,
  GOOGLE_IMPORT_ACCOUNTS_STALE_MS,
  MICROSOFT_IMPORT_ACCOUNTS_QUERY_KEY,
} from "@/lib/contact-import-query-keys";

export type SourceImportOptionId = "google-contacts" | "microsoft" | "apple";

export type SourceBrand = "google" | "microsoft" | "apple";

export interface SourceImportOption {
  id: SourceImportOptionId;
  name: string;
  subtitle: string;
  brand: SourceBrand;
}

const SOURCE_NAME: Record<SourceImportOptionId, string> = {
  "google-contacts": "Google",
  microsoft: "Microsoft",
  apple: "Apple",
};

type ImportAccountsPayload = Awaited<
  ReturnType<typeof api.contacts.listImportAccounts>
>;

type SourceCardView = "loading" | "imported" | "reconnect" | "connect";

interface SourceCardState {
  view: SourceCardView;
  importStatus: string | null;
  isImporting: boolean;
  showRewardAndConnect: boolean;
  wholeCardInteractive: boolean;
}

function formatContactsImported(count: number): string {
  const noun = count === 1 ? "contact imported" : "contacts imported";
  return `${count.toLocaleString()} ${noun}`;
}

function SourceCardBrandIcon({ brand }: { brand: SourceBrand }) {
  if (brand === "google") return <SourceBrandIconGoogle />;
  if (brand === "microsoft") return <SourceBrandIconMicrosoft />;
  return <SourceBrandIconApple className="dark:fill-foreground" />;
}

function SourceCardBrandIconWrap({
  children,
}: {
  brand: SourceBrand;
  children: ReactNode;
}) {
  return (
    <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-border bg-card">
      {children}
    </div>
  );
}

function getSourceCardState(
  sourceStatus: ContactSourceStatus | undefined,
  sourceStatusLoading: boolean
): SourceCardState {
  const importStatus = sourceStatus?.importStatus ?? null;
  const isTokenActive = sourceStatus?.isActive === true;
  const isImporting =
    importStatus === "pending" || importStatus === "processing";
  const isImported = importStatus === "completed" && isTokenActive;
  const needsReconnect = importStatus === "completed" && !isTokenActive;
  const showRewardAndConnect =
    !sourceStatusLoading && !isImporting && !isImported && !needsReconnect;
  const wholeCardInteractive = !showRewardAndConnect && !needsReconnect;

  let view: SourceCardView = "connect";
  if (sourceStatusLoading) view = "loading";
  else if (isImported) view = "imported";
  else if (needsReconnect) view = "reconnect";

  return {
    view,
    importStatus,
    isImporting,
    showRewardAndConnect,
    wholeCardInteractive,
  };
}

function pickImportAccountsQuery(
  optionId: SourceImportOptionId,
  googleData: ImportAccountsPayload | undefined,
  googlePending: boolean,
  microsoftData: ImportAccountsPayload | undefined,
  microsoftPending: boolean,
  appleData: ImportAccountsPayload | undefined,
  applePending: boolean,
  fallbackTotal: number
): {
  connectedCombinedTotalFetched: number;
  connectedCombinedLoading: boolean;
  importAccountsPayload: ImportAccountsPayload | undefined;
} {
  if (optionId === "google-contacts") {
    return {
      connectedCombinedTotalFetched:
        googleData?.combinedLatestImportTotals?.totalFetched ?? fallbackTotal,
      connectedCombinedLoading: googlePending,
      importAccountsPayload: googleData,
    };
  }
  if (optionId === "microsoft") {
    return {
      connectedCombinedTotalFetched:
        microsoftData?.combinedLatestImportTotals?.totalFetched ??
        fallbackTotal,
      connectedCombinedLoading: microsoftPending,
      importAccountsPayload: microsoftData,
    };
  }
  if (optionId === "apple") {
    return {
      connectedCombinedTotalFetched:
        appleData?.combinedLatestImportTotals?.totalFetched ?? fallbackTotal,
      connectedCombinedLoading: applePending,
      importAccountsPayload: appleData,
    };
  }
  return {
    connectedCombinedTotalFetched: fallbackTotal,
    connectedCombinedLoading: false,
    importAccountsPayload: undefined,
  };
}

function useSourceCardConnectedTotals(
  optionId: SourceImportOptionId,
  isImported: boolean,
  sourceStatus: ContactSourceStatus | undefined
) {
  const totalFetched =
    sourceStatus?.latestImport?.totalFetched ?? sourceStatus?.totalFetched ?? 0;

  const googleImportAccountsQuery = useQuery({
    queryKey: GOOGLE_IMPORT_ACCOUNTS_QUERY_KEY,
    queryFn: () => api.contacts.listImportAccounts("google"),
    enabled: optionId === "google-contacts" && isImported,
    staleTime: GOOGLE_IMPORT_ACCOUNTS_STALE_MS,
  });

  const microsoftImportAccountsQuery = useQuery({
    queryKey: MICROSOFT_IMPORT_ACCOUNTS_QUERY_KEY,
    queryFn: () => api.contacts.listImportAccounts("microsoft"),
    enabled: optionId === "microsoft" && isImported,
    staleTime: GOOGLE_IMPORT_ACCOUNTS_STALE_MS,
  });

  const appleImportAccountsQuery = useQuery({
    queryKey: APPLE_IMPORT_ACCOUNTS_QUERY_KEY,
    queryFn: () => api.contacts.listImportAccounts("apple"),
    enabled: optionId === "apple" && isImported,
    staleTime: GOOGLE_IMPORT_ACCOUNTS_STALE_MS,
  });

  const picked = pickImportAccountsQuery(
    optionId,
    googleImportAccountsQuery.data,
    googleImportAccountsQuery.isPending,
    microsoftImportAccountsQuery.data,
    microsoftImportAccountsQuery.isPending,
    appleImportAccountsQuery.data,
    appleImportAccountsQuery.isPending,
    totalFetched
  );

  const accountsConnectedLine = connectedAccountsLine(
    picked.importAccountsPayload?.accounts,
    picked.connectedCombinedLoading
  );

  return {
    totalFetched,
    ...picked,
    accountsConnectedLine,
  };
}

function SourceCardStatLine({
  icon,
  iconClassName,
  children,
  loading,
  muted,
}: {
  icon: ReactNode;
  iconClassName?: string;
  children: ReactNode;
  loading?: boolean;
  muted?: boolean;
}) {
  if (loading) {
    return <Loader size="sm" className="gap-0 py-0" />;
  }
  return (
    <div className="flex items-center gap-[9px]">
      <span
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center",
          iconClassName
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "text-[0.86rem] font-semibold leading-snug",
          muted ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {children}
      </span>
    </div>
  );
}

function SourceCardContactsImportedLine({
  count,
  loading,
}: {
  count: number;
  loading?: boolean;
}) {
  const muted = count === 0;
  return (
    <SourceCardStatLine
      icon={
        <Users className="h-[15px] w-[15px]" strokeWidth={2.2} aria-hidden />
      }
      iconClassName={muted ? "text-muted-foreground" : "text-brand-success"}
      loading={loading}
      muted={muted}
    >
      {formatContactsImported(count)}
    </SourceCardStatLine>
  );
}

function SourceCardAccountsConnectedLine({ text }: { text: string }) {
  return (
    <SourceCardStatLine
      icon={
        <Link2 className="h-[15px] w-[15px]" strokeWidth={2.2} aria-hidden />
      }
      iconClassName="text-[#1D4ED8]"
    >
      {text} connected
    </SourceCardStatLine>
  );
}

function SourceCardSubtitle({ text }: { text: string }) {
  return (
    <div className="mt-1 flex items-center gap-1">
      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      <p className="text-[0.78rem] leading-none text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

function SourceCardActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      className={cn(
        "h-auto w-full rounded-xl border-0 px-6 py-[8px] text-[0.88rem] font-bold text-brand-foreground shadow-none transition-transform",
        importModalAccentGradientBr,
        "hover:scale-[1.02] hover:brightness-105"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </Button>
  );
}

function SourceCardLoadingView({ brand }: { brand: SourceBrand }) {
  return (
    <SourceCardShell
      header={
        <div className={sourceCardHeaderRowClassName}>
          <SourceCardBrandIconWrap brand={brand}>
            <SourceCardBrandIcon brand={brand} />
          </SourceCardBrandIconWrap>
          <div className="min-w-0 flex-1">
            <Loader size="sm" className="gap-0 py-0" />
          </div>
        </div>
      }
    />
  );
}

function SourceCardImportStatusFooter({
  importStatus,
}: {
  importStatus: string | null;
}) {
  if (importStatus === "pending") {
    return (
      <div className="flex items-center justify-center gap-1.5 py-1">
        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          Queued
        </span>
      </div>
    );
  }

  if (importStatus === "processing") {
    return (
      <div className="flex w-full flex-col gap-1 py-0.5">
        <span className="text-center text-[11px] font-semibold text-gs-amethyst">
          Syncing…
        </span>
        <div className="h-1 w-full overflow-hidden rounded-sm bg-border">
          <div
            className={cn(
              "h-full w-3/5 animate-pulse rounded-sm",
              importModalAccentGradientBr
            )}
            aria-hidden
          />
        </div>
      </div>
    );
  }

  return null;
}

function SourceCardConnectedBadge() {
  return (
    <div className="mt-1 flex items-center gap-1.5 text-[0.78rem] font-bold text-brand-success">
      <CheckCircle2 className="h-3 w-3 shrink-0" />
      Connected
    </div>
  );
}

const sourceCardTitleClassName =
  "truncate text-base font-bold leading-tight whitespace-nowrap";

const sourceCardShellClassName =
  "flex h-full min-h-0 w-full flex-col px-5 py-5";

const sourceCardHeaderRowClassName =
  "flex min-w-0 w-full shrink-0 items-center gap-[13px] mb-4";

const sourceCardDetailRowsClassName =
  "flex min-h-0 flex-1 flex-col justify-center gap-2.5";

const sourceCardConnectRowClassName = "mt-auto flex w-full";

const sourceCardOuterClassName =
  "relative flex h-full min-h-[196px] w-full min-w-0 flex-col overflow-hidden rounded-[16px] border border-border bg-card text-left shadow-sm transition-all";

function SourceCardShell({
  header,
  body,
  footer,
}: {
  header: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={sourceCardShellClassName}>
      {header}
      {body}
      {footer ? (
        <div className={sourceCardConnectRowClassName}>{footer}</div>
      ) : null}
    </div>
  );
}

function SourceCardHeader({
  brand,
  title,
  secondLine,
}: {
  brand: SourceBrand;
  title: string;
  secondLine?: ReactNode;
}) {
  return (
    <div className={sourceCardHeaderRowClassName}>
      <SourceCardBrandIconWrap brand={brand}>
        <SourceCardBrandIcon brand={brand} />
      </SourceCardBrandIconWrap>
      <div className="min-w-0 flex-1">
        <h4 className={sourceCardTitleClassName}>{title}</h4>
        {secondLine}
      </div>
    </div>
  );
}

function SourceCardImportedView({
  option,
  connectedCombinedTotalFetched,
  connectedCombinedLoading,
  accountsConnectedLine,
}: {
  option: SourceImportOption;
  connectedCombinedTotalFetched: number;
  connectedCombinedLoading: boolean;
  accountsConnectedLine: string | null;
}) {
  return (
    <SourceCardShell
      header={
        <SourceCardHeader
          brand={option.brand}
          title={option.name}
          secondLine={<SourceCardConnectedBadge />}
        />
      }
      body={
        <div className={sourceCardDetailRowsClassName}>
          <SourceCardContactsImportedLine
            count={connectedCombinedTotalFetched}
            loading={connectedCombinedLoading}
          />
          {accountsConnectedLine ? (
            <SourceCardAccountsConnectedLine text={accountsConnectedLine} />
          ) : null}
        </div>
      }
    />
  );
}

function SourceCardReconnectView({
  option,
  totalFetched,
  onReconnect,
}: {
  option: SourceImportOption;
  totalFetched: number;
  onReconnect: () => void;
}) {
  return (
    <SourceCardShell
      header={
        <SourceCardHeader
          brand={option.brand}
          title={option.name}
          secondLine={<SourceCardSubtitle text={option.subtitle} />}
        />
      }
      body={
        <div className={sourceCardDetailRowsClassName}>
          <SourceCardContactsImportedLine count={totalFetched} />
        </div>
      }
      footer={
        <SourceCardActionButton label="Reconnect" onClick={onReconnect} />
      }
    />
  );
}

function SourceCardConnectView({
  option,
  importStatus,
  showRewardAndConnect,
  onConnect,
}: {
  option: SourceImportOption;
  importStatus: string | null;
  showRewardAndConnect: boolean;
  onConnect: () => void;
}) {
  const footer =
    importStatus === "pending" || importStatus === "processing" ? (
      <SourceCardImportStatusFooter importStatus={importStatus} />
    ) : showRewardAndConnect ? (
      <SourceCardActionButton label="Connect" onClick={onConnect} />
    ) : null;

  return (
    <SourceCardShell
      header={
        <SourceCardHeader
          brand={option.brand}
          title={option.name}
          secondLine={<SourceCardSubtitle text={option.subtitle} />}
        />
      }
      footer={footer}
    />
  );
}

const sourceCardSpring = "duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]";

function GettingStartedSourceCard({
  option,
  sourceStatus,
  sourceStatusLoading,
  onConnect,
}: {
  option: SourceImportOption;
  sourceStatus: ContactSourceStatus | undefined;
  sourceStatusLoading: boolean;
  onConnect: (id: SourceImportOptionId) => void;
}) {
  const cardState = getSourceCardState(sourceStatus, sourceStatusLoading);
  const isImported = cardState.view === "imported";
  const connectedTotals = useSourceCardConnectedTotals(
    option.id,
    isImported,
    sourceStatus
  );

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onConnect(option.id);
    }
  };

  const renderContent = () => {
    if (cardState.view === "loading") {
      return <SourceCardLoadingView brand={option.brand} />;
    }
    if (cardState.view === "imported") {
      return (
        <SourceCardImportedView
          option={option}
          connectedCombinedTotalFetched={
            connectedTotals.connectedCombinedTotalFetched
          }
          connectedCombinedLoading={connectedTotals.connectedCombinedLoading}
          accountsConnectedLine={connectedTotals.accountsConnectedLine}
        />
      );
    }
    if (cardState.view === "reconnect") {
      return (
        <SourceCardReconnectView
          option={option}
          totalFetched={connectedTotals.totalFetched}
          onReconnect={() => onConnect(option.id)}
        />
      );
    }
    return (
      <SourceCardConnectView
        option={option}
        importStatus={cardState.importStatus}
        showRewardAndConnect={cardState.showRewardAndConnect}
        onConnect={() => onConnect(option.id)}
      />
    );
  };

  return (
    <div
      role={cardState.wholeCardInteractive ? "button" : undefined}
      tabIndex={cardState.wholeCardInteractive ? 0 : undefined}
      onClick={
        cardState.wholeCardInteractive ? () => onConnect(option.id) : undefined
      }
      onKeyDown={cardState.wholeCardInteractive ? handleCardKeyDown : undefined}
      className={cn(
        sourceCardOuterClassName,
        sourceCardSpring,
        cardState.view !== "imported" &&
          "hover:-translate-y-[3px] hover:border-gs-amethyst/70 hover:shadow-md",
        "after:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:opacity-0 after:transition-opacity after:duration-300 hover:after:opacity-100",
        "after:bg-gradient-to-r after:from-gs-accent-from after:to-gs-accent-to",
        cardState.view === "imported" && "border-[1.5px] border-brand-success",
        cardState.wholeCardInteractive && [
          "cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        ]
      )}
    >
      {renderContent()}
    </div>
  );
}

interface GettingStartedSourceCardsProps {
  options: SourceImportOption[];
  sourceStatuses: ContactSourceStatus[];
  sourceStatusLoading: boolean;
  onConnect: (id: SourceImportOptionId) => void;
  isDragging: boolean;
  onCsvActivate: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}

function CsvUploadDropZone({
  isDragging,
  user,
  csvCreditInfo,
  creditRulesLoading,
  onCsvActivate,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  isDragging: boolean;
  user: ReturnType<typeof useAuth>["user"];
  csvCreditInfo: ConnectorCreditInfo;
  creditRulesLoading: boolean;
  onCsvActivate: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCsvActivate();
    }
  };

  const renderCreditHint = () => {
    if (!user) return "Manual import";
    if (creditRulesLoading) {
      return <Loader size="sm" className="py-0 gap-0" />;
    }
    if (csvCreditInfo.threshold == null || csvCreditInfo.credits == null) {
      return "Manual import";
    }
    if (csvCreditInfo.isEarned) {
      return (
        <>
          <span className="block">Manual</span>
          <span className="block font-medium text-emerald-700 dark:text-emerald-400">
            {formatConnectorCreditsDollars(csvCreditInfo.credits)} Connector
            Credits Earned
          </span>
        </>
      );
    }
    const contactLabel = csvCreditInfo.threshold === 1 ? "contact" : "contacts";
    return (
      <>
        <span className="block">Manual</span>
        <span className="block">
          Import {csvCreditInfo.threshold} {contactLabel} to unlock{" "}
          {formatConnectorCreditsDollars(csvCreditInfo.credits)} Connector
          Credits
        </span>
      </>
    );
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCsvActivate}
      onKeyDown={handleKeyDown}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        sourceCardOuterClassName,
        sourceCardSpring,
        "cursor-pointer border-dashed text-muted-foreground shadow-none",
        "hover:-translate-y-[3px] hover:border-brand-rose hover:bg-brand-rose/5 hover:text-brand-rose",
        isDragging &&
          "scale-[1.02] border-brand-rose bg-brand-rose/5 text-brand-rose"
      )}
      aria-label="Upload CSV file"
    >
      <div className="flex h-full flex-col items-center justify-center gap-2.5 px-5 py-5 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <SourceCsvUploadIcon />
        </div>
        <span className="text-sm font-bold text-foreground">
          {isDragging ? "Drop file" : "Upload CSV"}
        </span>
        <span className="px-1 text-center text-xs leading-tight text-muted-foreground">
          {user ? renderCreditHint() : "Manual import · drag & drop"}
        </span>
      </div>
    </div>
  );
}

export function GettingStartedSourceCards({
  options,
  sourceStatuses,
  sourceStatusLoading,
  onConnect,
  isDragging,
  onCsvActivate,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: GettingStartedSourceCardsProps) {
  const { user } = useAuth();
  const { data: creditRulesData, isLoading: creditRulesLoading } = useQuery({
    queryKey: ["/api/credits/rules"],
    queryFn: () => api.credits.getRules(),
    enabled: !!user,
  });

  const csvCreditInfo = getCreditInfoForProvider(creditRulesData, "csv");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
        {options.map((option) => {
          const sourceName = SOURCE_NAME[option.id];
          const sourceStatus = sourceStatuses.find(
            (s) => s.source === sourceName
          );

          return (
            <GettingStartedSourceCard
              key={option.id}
              option={option}
              sourceStatus={sourceStatus}
              sourceStatusLoading={sourceStatusLoading}
              onConnect={onConnect}
            />
          );
        })}

        <CsvUploadDropZone
          isDragging={isDragging}
          user={user}
          csvCreditInfo={csvCreditInfo}
          creditRulesLoading={creditRulesLoading}
          onCsvActivate={onCsvActivate}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
      </div>
    </div>
  );
}
