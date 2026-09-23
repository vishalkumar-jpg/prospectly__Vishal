import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles } from "lucide-react";
import { GettingStartedInlineCheck } from "@/assets/getting-started/getting-started-icon-badge";
import { formatConnectorCreditsDollars } from "@/lib/creditRulesUi";

export type CreditInfoRow = {
  threshold: number | null;
  credits: number | null;
  isEarned: boolean;
  importedContactsCount?: number;
};

export type TrustInfoRow = {
  points: number | null;
  configParams?: Record<string, unknown>;
  isEarned: boolean;
};

export function GettingStartedSourceCreditBlock({
  creditInfo,
}: {
  creditInfo: CreditInfoRow;
}) {
  if (creditInfo.threshold == null || creditInfo.credits == null) {
    return null;
  }

  const dollars = formatConnectorCreditsDollars(creditInfo.credits);

  if (creditInfo.isEarned) {
    return (
      <div className="mt-2 border-t border-border/50 pt-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="text-gs-rose">
            <span className="inline-flex items-center gap-1">
              <GettingStartedInlineCheck />
              You&apos;ve earned
            </span>
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-semibold border-gs-amethyst/30 bg-gradient-to-r from-gs-amethyst/10 to-gs-rose/10 text-gs-rose"
          >
            {dollars} Connector Credits
          </Badge>
        </div>
      </div>
    );
  }

  const progress = creditInfo.importedContactsCount
    ? Math.min(
      (creditInfo.importedContactsCount / creditInfo.threshold) * 100,
      100
    )
    : 0;

  return (
    <div className="mt-2 border-t border-border/50 pt-2">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>
          Import {creditInfo.threshold} contacts to unlock {dollars} Connector
          Credits
        </span>
        <Badge
          variant="outline"
          className="text-[10px] font-semibold border-gs-amethyst/30 bg-gradient-to-r from-gs-amethyst/10 to-gs-rose/10 text-gs-rose"
        >
          {dollars}
        </Badge>
      </div>
      {creditInfo.importedContactsCount !== undefined &&
        creditInfo.importedContactsCount > 0 ? (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gs-amethyst/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gs-accent-from to-gs-accent-to transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-gs-amethyst">
            {creditInfo.importedContactsCount} / {creditInfo.threshold} contacts
            imported
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function GettingStartedSourceTrustBlock({
  trustInfo,
}: {
  trustInfo: TrustInfoRow;
}) {
  const minContacts = trustInfo.configParams?.min_contacts
    ? Number(trustInfo.configParams.min_contacts)
    : null;

  if (minContacts == null || trustInfo.points == null) {
    return null;
  }

  if (trustInfo.isEarned) {
    return (
      <div className="mt-1.5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="text-green-700 dark:text-green-300">
            <span className="inline-flex items-center gap-1">
              <GettingStartedInlineCheck />
              You have earned
            </span>
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-semibold bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
          >
            <CheckCircle2 className="mr-1 h-3 w-3 text-green-500" />
            {trustInfo.points?.toFixed(1)} Trust Score Points
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>
          Import {minContacts}{" "}
          {minContacts === 1 ? "contact" : "contacts"} → Earn{" "}
          {trustInfo.points?.toFixed(1)} Trust Score Points
        </span>
        <Badge
          variant="outline"
          className="text-[10px] font-semibold bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
        >
          <Sparkles className="mr-1 h-3 w-3 text-amber-500" />
          {trustInfo.points?.toFixed(1)}
        </Badge>
      </div>
    </div>
  );
}
