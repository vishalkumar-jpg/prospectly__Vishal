import { Clock, XCircle, CheckCircle2, Loader2 } from "lucide-react";
import { VERIFY_SOURCE_ICONS } from "@/assets/getting-started/verify-source-icons";
import {
  VerifyDashedRingIcon,
  VerifyPanelChevronHintIcon,
  VerifySourceLinkedInInverseIcon,
} from "@/assets/getting-started/verify-svgs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImportSource } from "@/hooks/use-claim-verification";
import {
  VERIFICATION_STATUS,
  type VerificationStatus,
} from "@/constants/claim-verification.constants";
import { GettingStartedIconBadge } from "@/assets/getting-started/getting-started-icon-badge";

function formatSourceName(source: ImportSource | string | null | undefined): string {
  if (source == null || source === "") return "";
  const s = String(source);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface VerifyStatusPanelProps {
  status: VerificationStatus;
  sourcesChecked: ImportSource[];
  remainingSources: ImportSource[];
  matchedSource: ImportSource | null;
  onDismiss?: () => void;
  /** Prefer scroll/navigation to import UI; falls back to `onDismiss` when omitted */
  onImportMore?: () => void;
  onVerify?: () => void;
  isVerifying?: boolean;
  verificationTriggered?: boolean;
}

export function VerifyStatusPanel({
  status,
  sourcesChecked,
  remainingSources,
  matchedSource,
  onDismiss,
  onImportMore,
  onVerify,
  isVerifying = false,
  verificationTriggered = false,
}: VerifyStatusPanelProps) {
  if (status === VERIFICATION_STATUS.PENDING) {
    return (
      <div
        className="p-5 rounded-[14px] text-center border-[1.5px]"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--gs-warning) / 0.04), hsl(var(--gs-warning) / 0.01))",
          borderColor: "hsl(var(--gs-warning) / 0.3)",
          borderStyle: "dashed",
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2.5 bg-gs-warning/10"
        >
          <Clock className="w-6 h-6 text-gs-warning" />
        </div>
        <div className="text-[15px] font-bold mb-1">Waiting for Contact Import</div>
        <div className="text-[12px] text-muted-foreground leading-[1.5] mb-3 max-w-[280px] mx-auto">
          Import contacts from any source below. We'll automatically check if the prospect exists in
          your network.
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-1.5 rounded-lg text-gs-warning bg-gs-warning/8">
          <VerifyPanelChevronHintIcon />
          Choose a source below to start
        </div>
        <div className="flex flex-col gap-1.5 mt-3.5 text-left">
          <div className="flex items-center gap-2 p-2 px-3 rounded-lg bg-background text-[12px] font-medium text-muted-foreground">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 border-2 border-gs-warning bg-gs-warning/30"
            />
            {VERIFY_SOURCE_ICONS.linkedin}
            LinkedIn — not yet imported
          </div>
          <div className="flex items-center gap-2 p-2 px-3 rounded-lg bg-background text-[12px] font-medium text-muted-foreground">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 border-2 border-gs-warning bg-gs-warning/30"
            />
            <VerifyDashedRingIcon />
            Google, Microsoft, Apple — not yet imported
          </div>
          <div className="flex items-center gap-2 p-2 px-3 rounded-lg bg-background text-[12px] font-medium text-muted-foreground">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 border-2 border-gs-warning bg-gs-warning/30"
            />
            {VERIFY_SOURCE_ICONS.csv}
            CSV — not yet imported
          </div>
        </div>
        {onVerify && !verificationTriggered && (
          <div className="mt-3.5">
            <Button
              type="button"
              onClick={onVerify}
              disabled={isVerifying || verificationTriggered}
              className="w-full text-[14px] font-bold py-2.5 h-auto rounded-[10px] text-white"
              style={{
                background: "linear-gradient(135deg, hsl(var(--gs-amethyst)), hsl(var(--gs-rose)))",
              }}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" aria-hidden />
                  Verifying...
                </>
              ) : (
                "Verify Connection Now"
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (status === VERIFICATION_STATUS.IN_PROGRESS) {
    return (
      <div
        className="p-5 rounded-[14px] text-center border-[1.5px]"
        style={{
          background: "linear-gradient(135deg, hsl(var(--gs-amethyst) / 0.1), hsl(var(--gs-amethyst) / 0.02))",
          borderColor: "hsl(var(--gs-amethyst) / 0.15)",
        }}
      >
        <div className="w-14 h-14 rounded-full mx-auto mb-3 border-[3px] border-border animate-spin"
          style={{ borderTopColor: "hsl(var(--gs-amethyst))" }}
        />
        <div className="text-[15px] font-bold mb-0.5">Verifying Connection...</div>
        <div className="text-[12px] text-muted-foreground mb-2.5">
          Scanning your imported contacts to find this prospect
        </div>
        <div className="w-full h-1 rounded-sm bg-border overflow-hidden mb-2">
          <div
            className="h-full rounded-sm animate-pulse"
            style={{
              background: "linear-gradient(90deg, hsl(var(--gs-amethyst)), hsl(var(--gs-rose)))",
              width: "70%",
            }}
          />
        </div>
        <div className="text-[11px] text-muted-foreground">
          <b style={{ color: "hsl(var(--gs-amethyst))" }}>
            Scanning sources
          </b>...{" "}
          <span className="font-bold">checking contacts</span>
        </div>
        <div className="flex flex-col gap-1.5 mt-3 text-left">
          {sourcesChecked.map((source) => (
            <div
              key={source}
              className="flex items-center gap-2 p-1.5 px-3 rounded-lg text-[12px] font-semibold"
              style={{ color: "hsl(var(--gs-success))" }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "hsl(var(--gs-success))" }}
              />
              {VERIFY_SOURCE_ICONS[source]}
              {formatSourceName(source)} — checked{" "}
              <GettingStartedIconBadge name="check" size="xs" bare />
            </div>
          ))}
          {remainingSources.length > 0 && (
            <div className="flex items-center gap-2 p-1.5 px-3 rounded-lg text-[12px] font-medium text-muted-foreground">
              <div className="w-2 h-2 rounded-full flex-shrink-0 border-2 border-border" />
              <div className="w-4 h-4 flex-shrink-0 opacity-50">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              {remainingSources.length > 1
                ? `${remainingSources.length} sources queued`
                : "Additional sources queued"}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === VERIFICATION_STATUS.NOT_CLAIMED_FAILED) {
    return (
      <div
        className="p-5 rounded-[14px] text-center border-[1.5px]"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--gs-destructive) / 0.03), hsl(var(--gs-destructive) / 0.01))",
          borderColor: "hsl(var(--gs-destructive) / 0.15)",
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2.5 bg-gs-destructive/8"
        >
          <XCircle className="w-6 h-6 text-gs-destructive" />
        </div>
        <div className="text-[15px] font-bold mb-1 text-gs-destructive">
          Prospect Not Found
        </div>
        <div className="text-[12px] text-muted-foreground leading-[1.5] mb-3.5 max-w-[300px] mx-auto">
          We checked all your imported networks. This prospect was not found in any of your
          connected sources.
        </div>
        <div className="flex justify-center gap-2 mb-3.5 flex-wrap">
          {sourcesChecked.map((source) => (
            <div
              key={source}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-secondary text-muted-foreground"
            >
              {VERIFY_SOURCE_ICONS[source]}
              {formatSourceName(source)}{" "}
              <GettingStartedIconBadge name="close" size="xs" bare />
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-2 justify-center">
          <Button
            size="sm"
            type="button"
            disabled={!onDismiss}
            onClick={onDismiss}
            className="text-[12px] font-bold px-4 py-2 h-auto rounded-[10px] text-white shadow-md bg-gs-brand-gradient disabled:opacity-50"
          >
            Browse Other Opportunities
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            disabled={!(onImportMore ?? onDismiss)}
            onClick={onImportMore ?? onDismiss}
            className="text-[12px] font-bold px-4 py-2 h-auto rounded-[10px] disabled:opacity-50"
          >
            Import More Contacts
          </Button>
        </div>
      </div>
    );
  }

  if (status === VERIFICATION_STATUS.CLAIMED_COMPLETED) {
    return (
      <div
        className="p-5 rounded-[14px] text-center border-[1.5px]"
        style={{
          background: "linear-gradient(135deg, hsl(var(--gs-success) / 0.05), hsl(var(--gs-success) / 0.01))",
          borderColor: "hsl(var(--gs-success) / 0.2)",
        }}
      >
        <div
          className="w-14 h-14 rounded-[14px] flex items-center justify-center mx-auto mb-2.5"
          style={{ background: "hsl(var(--gs-success) / 0.1)" }}
        >
          <CheckCircle2 className="w-7 h-7" style={{ color: "hsl(var(--gs-success))" }} />
        </div>
        <div className="text-[17px] font-extrabold mb-1" style={{ color: "hsl(var(--gs-success))" }}>
          Opportunity Claimed!
        </div>
        <div className="text-[13px] text-muted-foreground leading-[1.5] mb-3.5 max-w-[300px] mx-auto">
          Connection verified successfully. You can proceed with the introduction.
        </div>

        {matchedSource && (
          <div
            className="flex items-center gap-2.5 p-2.5 px-3.5 rounded-[10px] bg-background border mb-3.5 text-left"
            style={{ borderColor: "hsl(var(--gs-success) / 0.15)" }}
          >
            <div
              className={cn(
                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg",
                matchedSource === "linkedin" && "bg-gs-linkedin/100",
                matchedSource === "google" && "bg-gs-oauth-google-surface/100",
                matchedSource === "microsoft" && "bg-gs-oauth-microsoft-surface/100",
                matchedSource === "apple" && "bg-secondary",
                matchedSource === "csv" && "bg-gs-sky/10",
              )}
            >
              {matchedSource === "linkedin" && <VerifySourceLinkedInInverseIcon />}
              {matchedSource === "google" && VERIFY_SOURCE_ICONS.google}
              {matchedSource === "microsoft" && VERIFY_SOURCE_ICONS.microsoft}
              {matchedSource === "apple" && VERIFY_SOURCE_ICONS.apple}
              {matchedSource === "csv" && VERIFY_SOURCE_ICONS.csv}
            </div>
            <div className="text-[12px] text-muted-foreground flex-1">
              <strong className="text-foreground">
                Matched via {formatSourceName(matchedSource)}
              </strong>{" "}
              — Found as a 1st-degree connection
            </div>
            <div className="text-[16px] font-bold flex-shrink-0" style={{ color: "hsl(var(--gs-success))" }}>
              <GettingStartedIconBadge name="check" size="md" />
            </div>
          </div>
        )}

        <Button
          type="button"
          disabled={!onDismiss}
          onClick={onDismiss}
          className="w-full text-[15px] font-bold py-3 h-auto rounded-xl text-white shadow-lg disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, hsl(var(--gs-success)), #22C55E)",
          }}
        >
          Proceed with Introduction →
        </Button>
      </div>
    );
  }

  return null;
}
