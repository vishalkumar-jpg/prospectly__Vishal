import type { ReactNode } from "react";
import { Info, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type ConnectorCreditInfo } from "@/lib/creditRulesUi";
import type { UseTrustScoreRewardDisplayResult } from "@/hooks/useTrustScoreRewardDisplay";
import {
  formatConnectorCreditsDisplayShort,
  formatConnectorCreditsEarned,
  formatConnectorCreditsEarnedTooltip,
  formatConnectorCreditsUnlockTooltip,
  formatTrustScoreDisplayShort,
  formatTrustScoreEarned,
  formatTrustScorePointsValueOnly,
  formatTrustScoreUnlockTooltip,
} from "@/lib/getting-started-import-rewards";
import { Loader } from "../ui/loader";

function trustTooltipText(
  trust: UseTrustScoreRewardDisplayResult["trust"]
): string {
  if (trust.pointsValue == null) {
    return "Earn Trust Score Points by importing contacts from this source.";
  }
  if (trust.isEarned) {
    return trust.minContacts != null
      ? `Earned after importing at least ${trust.minContacts} contacts from this source.`
      : "Earned from this source.";
  }
  if (trust.minContacts != null) {
    return formatTrustScoreUnlockTooltip(trust.minContacts, trust.pointsValue);
  }
  return "Earn Trust Score Points by importing contacts from this source.";
}

function connectorTooltipText(
  connector: UseTrustScoreRewardDisplayResult["connector"]
): string {
  if (connector.threshold != null && connector.creditsValue != null) {
    if (connector.isEarned) {
      return formatConnectorCreditsEarnedTooltip(
        connector.threshold,
        connector.creditsValue
      );
    }
    return formatConnectorCreditsUnlockTooltip(
      connector.threshold,
      connector.creditsValue
    );
  }
  return "Import contacts from this source to receive Connector Credits.";
}

function trustValueCopy(
  trust: UseTrustScoreRewardDisplayResult["trust"],
  amount: string
): string | null {
  if (trust.pointsValue == null) return null;
  if (trust.isEarned) {
    return formatTrustScoreEarned(trust.pointsValue);
  }
  if (trust.minContacts != null) {
    return formatTrustScoreDisplayShort(trust.pointsValue);
  }
  if (amount !== "…") {
    return `+${amount} Trust Score Points`;
  }
  return formatTrustScorePointsValueOnly(trust.pointsValue);
}

function InfoTip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full text-muted-foreground/70 hover:text-foreground"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Info className="h-2.5 w-2.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-left" side="top">
        <p className="text-xs leading-snug text-muted-foreground">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ProviderRewardLine({
  className,
  valueClassName,
  alignEnd,
  children,
  infoLabel,
  infoTooltip,
}: {
  className?: string;
  valueClassName?: string;
  alignEnd?: boolean;
  children: ReactNode;
  infoLabel: string;
  infoTooltip: string;
}) {
  const pair = (
    <span className="inline-flex max-w-full min-w-0 items-start gap-x-1.5">
      <span
        className={cn(
          "min-w-0 break-words",
          alignEnd && "text-right",
          valueClassName
        )}
      >
        {children}
      </span>
      <span className="inline-flex shrink-0 translate-y-px">
        <InfoTip label={infoLabel} tooltip={infoTooltip} />
      </span>
    </span>
  );

  if (alignEnd) {
    return (
      <div
        className={cn(
          "flex w-full min-w-0 justify-end text-[11px] leading-snug",
          className
        )}
      >
        {pair}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full min-w-0 text-left text-[11px] leading-snug",
        className
      )}
    >
      {pair}
    </div>
  );
}

function ConnectorCreditsProgressBar({
  importedContactsCount,
  threshold,
}: {
  importedContactsCount: number;
  threshold: number;
}) {
  return (
    <div className="mt-1 flex w-full min-w-0 flex-col items-stretch gap-1">
      <div className="h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-gs-rose transition-all"
          style={{
            width: `${Math.min((importedContactsCount / threshold) * 100, 100)}%`,
          }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">
        {importedContactsCount} / {threshold} contacts imported
      </span>
    </div>
  );
}

function SourceCardConnectorRewardBlock({
  creditInfo,
  connector,
}: {
  creditInfo: ConnectorCreditInfo;
  connector: UseTrustScoreRewardDisplayResult["connector"];
}) {
  const { threshold, credits, isEarned, importedContactsCount } = creditInfo;
  if (threshold == null || credits == null) return null;

  const showProgress =
    !isEarned &&
    importedContactsCount !== undefined &&
    importedContactsCount > 0;

  return (
    <div className="w-full min-w-0">
      <ProviderRewardLine
        className="font-semibold"
        valueClassName={cn(
          isEarned
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-muted-foreground"
        )}
        infoLabel="About Connector Credits"
        infoTooltip={connectorTooltipText(connector)}
      >
        {isEarned
          ? formatConnectorCreditsEarned(credits)
          : formatConnectorCreditsDisplayShort(credits)}
      </ProviderRewardLine>
      {showProgress ? (
        <ConnectorCreditsProgressBar
          importedContactsCount={importedContactsCount}
          threshold={threshold}
        />
      ) : null}
    </div>
  );
}

export function SourceCardPreConnectRewardColumn({
  creditInfo,
  reward,
  creditRulesLoading,
}: {
  creditInfo: ConnectorCreditInfo;
  reward: UseTrustScoreRewardDisplayResult;
  creditRulesLoading: boolean;
}) {
  const { trust, connector, amount } = reward;

  if (creditRulesLoading) {
    return (
      <div className="flex w-full min-w-0 flex-col items-start">
        <Loader />
      </div>
    );
  }

  const hasConnectorReward =
    creditInfo.threshold != null && creditInfo.credits != null;
  const trustValue =
    trust.pointsValue != null ? trustValueCopy(trust, amount) : null;

  if (!hasConnectorReward && trustValue == null) {
    return (
      <span className="text-left text-[10px] text-muted-foreground">—</span>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex w-full min-w-0 flex-col items-start gap-y-1 text-left">
        {trustValue ? (
          <ProviderRewardLine
            className="font-medium"
            valueClassName={cn(
              trust.isEarned
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
            infoLabel="About Trust Score Points"
            infoTooltip={trustTooltipText(trust)}
          >
            {trustValue}
          </ProviderRewardLine>
        ) : null}
        {hasConnectorReward ? (
          <SourceCardConnectorRewardBlock
            creditInfo={creditInfo}
            connector={connector}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}

export function SourceCardConnectedRewardBlock({
  reward,
  trustRewardLoading,
  align = "start",
}: {
  reward: UseTrustScoreRewardDisplayResult;
  trustRewardLoading: boolean;
  align?: "end" | "start";
}) {
  const { trust, connector, amount } = reward;
  const end = align === "end";

  if (trustRewardLoading) {
    return (
      <div className="flex w-full min-w-0 items-center gap-1.5">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading…</span>
      </div>
    );
  }

  const trustValue =
    trust.pointsValue != null ? trustValueCopy(trust, amount) : null;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-8 sm:gap-y-1",
          end ? "items-end text-right sm:justify-end" : "items-start text-left"
        )}
      >
        {trustValue ? (
          <div className={cn("min-w-0 shrink-0", end && "sm:text-right")}>
            <ProviderRewardLine
              alignEnd={end}
              className="font-medium"
              valueClassName={cn(
                trust.isEarned
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground"
              )}
              infoLabel="About Trust Score Points"
              infoTooltip={trustTooltipText(trust)}
            >
              {trustValue}
            </ProviderRewardLine>
          </div>
        ) : null}
        {connector.creditsValue != null && connector.threshold != null ? (
          <div className={cn("min-w-0 shrink-0", end && "sm:text-right")}>
            <ProviderRewardLine
              alignEnd={end}
              className="font-semibold"
              valueClassName={cn(
                connector.isEarned
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground"
              )}
              infoLabel="About Connector Credits"
              infoTooltip={connectorTooltipText(connector)}
            >
              {connector.isEarned
                ? formatConnectorCreditsEarned(connector.creditsValue)
                : formatConnectorCreditsDisplayShort(connector.creditsValue)}
            </ProviderRewardLine>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
