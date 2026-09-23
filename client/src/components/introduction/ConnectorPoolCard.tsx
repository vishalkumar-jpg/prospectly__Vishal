import { Users, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PotentialConnectorsSummary } from "./introductionHelpers";

interface ConnectorPoolCardProps {
  potentialConnectors?: PotentialConnectorsSummary | null;
  variant: "active" | "archived";
  className?: string;
}

function getActivePoolSize(
  potentialConnectors?: PotentialConnectorsSummary | null
): number {
  if (!potentialConnectors) return 0;
  const { pendingCount, declinedCount, hasAccepted } = potentialConnectors;
  return pendingCount + declinedCount + (hasAccepted ? 1 : 0);
}

function getConnectorPoolProgressPercent({
  potentialConnectors,
  isArchived,
}: {
  potentialConnectors?: PotentialConnectorsSummary | null;
  isArchived: boolean;
}): number {
  if (isArchived) return 0;
  const poolSize = getActivePoolSize(potentialConnectors);
  if (poolSize <= 0) return 0;
  const declined = potentialConnectors?.declinedCount ?? 0;
  const accepted = potentialConnectors?.hasAccepted ? 1 : 0;
  return ((accepted + declined) / poolSize) * 100;
}

function getConnectorPoolHeadline({
  potentialConnectors,
  isArchived,
}: {
  potentialConnectors?: PotentialConnectorsSummary | null;
  isArchived: boolean;
}): string {
  if (!potentialConnectors) return "0 Potential connectors";
  const { pendingCount, totalCount } = potentialConnectors;
  if (!isArchived && pendingCount > 0) {
    return `${pendingCount} Connector${pendingCount !== 1 ? "s" : ""} Pending`;
  }
  return `${totalCount} Potential connector${totalCount !== 1 ? "s" : ""}`;
}

function ConnectorPoolEmptyState({ isArchived }: { isArchived: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-blue-600" />
        <span className="font-medium">
          {isArchived
            ? "No connectors were assigned to this request."
            : "No connectors available yet. We're searching for potential connectors in our network."}
        </span>
      </div>
    </div>
  );
}

function ConnectorPoolActiveContent({
  potentialConnectors,
  isArchived,
  progressPercent,
}: {
  potentialConnectors: PotentialConnectorsSummary;
  isArchived: boolean;
  progressPercent: number;
}) {
  const declined = potentialConnectors.declinedCount ?? 0;

  return (
    <>
      {declined > 0 && !isArchived ? (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-xs">
            <XCircle className="h-3.5 w-3.5 text-red-600" />
            <span className="font-semibold text-foreground">
              {declined} Declined
            </span>
          </div>
        </div>
      ) : null}

      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Status
          </span>
          <span
            className={cn(
              "text-xs font-medium",
              isArchived
                ? "text-slate-600 dark:text-slate-400"
                : "text-blue-600 dark:text-blue-400"
            )}
          >
            {isArchived ? "Archived" : "In Review"}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div
            className={cn(
              "h-2 rounded-full",
              isArchived ? "bg-slate-500" : "bg-blue-600"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
            {isArchived
              ? "No connector accepted before archive"
              : "Race to accept - only one needed"}
          </span>
        </div>
      </div>
    </>
  );
}

export function ConnectorPoolCard({
  potentialConnectors,
  variant,
  className,
}: ConnectorPoolCardProps) {
  const poolSize = getActivePoolSize(potentialConnectors);
  const isArchived = variant === "archived";
  const progressPercent = getConnectorPoolProgressPercent({
    potentialConnectors,
    isArchived,
  });
  const headline = getConnectorPoolHeadline({ potentialConnectors, isArchived });
  const hasConnectors = poolSize > 0 && potentialConnectors != null;

  return (
    <div
      className={cn(
        "w-full h-full relative py-5 px-6 bg-gradient-to-br from-blue-50/60 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10 border border-blue-200/50 dark:border-blue-800/40 rounded-xl shadow-sm",
        className
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70 mb-4">
        Connector Pool
      </div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold text-blue-600">{headline}</span>
        </div>
      </div>

      {hasConnectors ? (
        <ConnectorPoolActiveContent
          potentialConnectors={potentialConnectors}
          isArchived={isArchived}
          progressPercent={progressPercent}
        />
      ) : (
        <ConnectorPoolEmptyState isArchived={isArchived} />
      )}
    </div>
  );
}
