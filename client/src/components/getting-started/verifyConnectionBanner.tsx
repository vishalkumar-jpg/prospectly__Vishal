import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Shield, RefreshCw } from "lucide-react";
import { useClaimVerification } from "@/hooks/use-claim-verification";
import {
  VERIFICATION_STATUS,
  type VerificationStatus,
} from "@/constants/claim-verification.constants";
import {
  VerifyBannerChevronIcon,
  VerifyStepCheckIcon,
  VerifyStepCircleIcon,
  VerifyStepPlusIcon,
} from "@/assets/getting-started/verify-svgs";
import { GettingStartedIconBadge } from "@/assets/getting-started/getting-started-icon-badge";
import { VerifyProspectCard } from "./VerifyProspectCard";
import { VerifyStatusPanel } from "./VerifyStatusPanel";

interface VerifyConnectionBannerProps {
  onDismiss?: () => void;
  onImportMore?: () => void;
  onVerify?: () => void;
  isVerifying?: boolean;
  verificationTriggered?: boolean;
}

export function VerifyConnectionBanner({
  onDismiss,
  onImportMore,
  onVerify,
  isVerifying = false,
  verificationTriggered = false,
}: VerifyConnectionBannerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    verification,
    isLoading,
    hasActiveVerification,
    refetch,
    isRefreshing,
    remainingSources,
  } = useClaimVerification();

  // Generate stable confetti positions to prevent layout jitter on re-renders
  const confetti = useMemo(() => {
    const colors = [
      "hsl(var(--gs-amethyst))",
      "hsl(var(--gs-rose))",
      "hsl(var(--gs-sky))",
      "hsl(var(--gs-success))",
      "#F59E0B",
    ];

    return Array.from({ length: 20 }).map((_, i) => ({
      color: colors[i % colors.length],
      left: (i * 5.26) + (Math.random() * 3), // Distribute evenly with slight randomness
      delay: (i % 5) * 0.1, // Stagger animation start
    }));
  }, []);

  if (isLoading || !verification) return null;

  if (
    !hasActiveVerification &&
    verification.status !== VERIFICATION_STATUS.CLAIMED_COMPLETED &&
    verification.status !== VERIFICATION_STATUS.NOT_CLAIMED_FAILED
  ) {
    return null;
  }

  const verificationStatus: VerificationStatus = verification.status;
  const sourcesChecked = verification.sourcesChecked || [];
  const prospectName = verification.prospectName || "Unknown Prospect";
  const prospectCompany = verification.prospectCompany || "";
  const prospectTitle = verification.prospectTitle || "";
  const claimerShare = verification.claimerShare || 0;
  const matchedSource = verification.matchedSource;

  const handleDismiss = () => {
    onDismiss?.();
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getTopBorderGradient = () => {
    switch (verificationStatus) {
      case VERIFICATION_STATUS.PENDING:
        return "linear-gradient(90deg, #F59E0B, #D97706)";
      case VERIFICATION_STATUS.NOT_CLAIMED_FAILED:
        return "linear-gradient(90deg, #E53E3E, #C53030)";
      case VERIFICATION_STATUS.CLAIMED_COMPLETED:
        return "linear-gradient(90deg, hsl(var(--gs-success)), #22C55E)";
      default:
        return "linear-gradient(90deg, hsl(var(--gs-amethyst)), hsl(var(--gs-rose)))";
    }
  };

  const getBorderColor = () => {
    switch (verificationStatus) {
      case VERIFICATION_STATUS.PENDING:
        return "rgba(245,158,11,0.25)";
      case VERIFICATION_STATUS.IN_PROGRESS:
        return "hsl(var(--gs-amethyst) / 0.15)";
      case VERIFICATION_STATUS.NOT_CLAIMED_FAILED:
        return "rgba(227,62,62,0.2)";
      case VERIFICATION_STATUS.CLAIMED_COMPLETED:
        return "hsl(var(--gs-success))";
      default:
        return "hsl(var(--border))";
    }
  };

  const getStepPillClass = (step: "marketplace" | "verify" | "proceed") => {
    const baseClass = "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold border-[1.5px] transition-all";

    if (step === "marketplace") {
      return `${baseClass} border-[hsl(var(--gs-success))] text-[hsl(var(--gs-success))]`;
    }

    if (step === "verify") {
      if (verificationStatus === VERIFICATION_STATUS.CLAIMED_COMPLETED) {
        return `${baseClass} border-[hsl(var(--gs-success))] text-[hsl(var(--gs-success))]`;
      }
      if (verificationStatus === VERIFICATION_STATUS.NOT_CLAIMED_FAILED) {
        return `${baseClass} border-[#E53E3E] text-[#E53E3E]`;
      }
      return `${baseClass} border-[hsl(var(--gs-amethyst))] text-[hsl(var(--gs-amethyst))]`;
    }

    if (step === "proceed") {
      if (verificationStatus === VERIFICATION_STATUS.CLAIMED_COMPLETED) {
        return `${baseClass} border-[hsl(var(--gs-success))] text-[hsl(var(--gs-success))]`;
      }
      return `${baseClass} border-border bg-background text-muted-foreground`;
    }

    return baseClass;
  };

  const getStepPillBackgroundStyle = (step: "marketplace" | "verify" | "proceed") => {
    if (step === "marketplace") {
      return { background: "hsl(var(--gs-success) / 0.06)" };
    }

    if (step === "verify") {
      if (verificationStatus === VERIFICATION_STATUS.CLAIMED_COMPLETED) {
        return { background: "hsl(var(--gs-success) / 0.06)" };
      }
      if (verificationStatus === VERIFICATION_STATUS.NOT_CLAIMED_FAILED) {
        return { background: "rgba(227,62,62,0.06)" };
      }
      return { background: "hsl(var(--gs-amethyst) / 0.1)" };
    }

    if (step === "proceed") {
      if (verificationStatus === VERIFICATION_STATUS.CLAIMED_COMPLETED) {
        return { background: "hsl(var(--gs-success) / 0.06)" };
      }
      return { background: "transparent" };
    }

    return {};
  };

  const getClaimerShareBadgeClasses = () => {
    return "text-[12px] font-extrabold px-2 py-0.5 rounded-md text-gs-rose bg-gs-rose/8";
  };

  return (
    <div
      className={cn(
        "bg-background border-[1.5px] rounded-[18px] mb-6 overflow-hidden relative transition-all duration-300",
        isCollapsed && "shadow-sm"
      )}
      style={{ borderColor: getBorderColor() }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: getTopBorderGradient() }}
      />

      {/* Confetti animation - only for claimed state */}
      {verificationStatus === VERIFICATION_STATUS.CLAIMED_COMPLETED && (
        <div className="absolute top-0 left-0 right-0 h-[60px] overflow-hidden pointer-events-none">
          {confetti.map((item, i) => (
            <div
              key={i}
              className="absolute w-[6px] h-[6px] rounded-sm animate-confetti-fall"
              style={{
                left: `${item.left}%`,
                backgroundColor: item.color,
                animationDelay: `${item.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-controls="verification-content"
        onClick={handleToggleCollapse}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleCollapse();
          }
        }}
        className={cn(
          "flex w-full items-center justify-between p-4 px-4 md:px-6 border-b border-border cursor-pointer select-none transition-all hover:bg-muted/5",
          "bg-transparent text-left font-inherit",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
          isCollapsed && "border-b-transparent"
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between w-full">
          {/* First row - Title and close button */}
          <div className="flex items-center justify-between w-full md:w-auto md:justify-start pr-2 md:pr-0">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border border-border bg-background transition-transform duration-300 mr-0.5",
                  isCollapsed && "-rotate-90"
                )}
              >
                <VerifyBannerChevronIcon />
              </div>
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--gs-amethyst)), hsl(var(--gs-rose)))",
                }}
              >
                <Shield className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="text-[16px] font-extrabold">Verify Your Connection</div>
              {/* Desktop collapsed state - inline with title */}
              {isCollapsed && (
                <div className="hidden md:flex items-center gap-2 ml-1">
                  <span className="text-[13px] font-semibold text-muted-foreground">
                    {prospectName}
                  </span>
                  <span className={getClaimerShareBadgeClasses()}>
                    ${claimerShare.toFixed(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Mobile close button only */}
            <div className="flex items-center gap-2 md:hidden">
              {onDismiss && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Dismiss"
                  title="Dismiss"
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
                  className="h-8 w-8 p-0 rounded-lg border border-border bg-background text-[14px] text-muted-foreground hover:bg-secondary hover:text-foreground flex-shrink-0"
                >
                  <GettingStartedIconBadge name="close" size="sm" bare />
                </Button>
              )}
            </div>
          </div>

          {/* Desktop layout - status indicators and buttons */}
          <div className="hidden md:flex md:flex-row md:items-center gap-2.5">

            {/* Desktop step pills */}
            <div className="flex gap-1">
              <div className={getStepPillClass("marketplace")} style={getStepPillBackgroundStyle("marketplace")}>
                <VerifyStepCheckIcon />
                Marketplace
              </div>
              <div className={getStepPillClass("verify")} style={getStepPillBackgroundStyle("verify")}>
                <VerifyStepCircleIcon />
                Verify Connection
              </div>
              <div className={getStepPillClass("proceed")} style={getStepPillBackgroundStyle("proceed")}>
                <VerifyStepPlusIcon />
                Proceed
              </div>
            </div>

            {/* Desktop refresh button with primary color on hover */}
            {(verificationStatus === VERIFICATION_STATUS.PENDING ||
              verificationStatus === VERIFICATION_STATUS.IN_PROGRESS) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Refresh"
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                    aria-hidden
                  />
                </Button>
              )}

            {/* Desktop close button */}
            {onDismiss && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Dismiss"
                title="Dismiss"
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="h-8 w-8 p-0 rounded-lg border border-border bg-background text-[14px] text-muted-foreground hover:bg-secondary hover:text-foreground flex-shrink-0"
              >
                <GettingStartedIconBadge name="close" size="sm" bare />
              </Button>
            )}
          </div>

          {/* Mobile second row - Status indicators and refresh button */}
          <div className="flex md:hidden items-center justify-between gap-2 mt-3 overflow-x-auto pb-1">
            {/* Status indicators on the left */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isCollapsed && (
                <div className="flex items-center gap-2 mr-3 flex-shrink-0">
                  <span className="text-[13px] font-semibold text-muted-foreground">
                    {prospectName}
                  </span>
                  <span className={getClaimerShareBadgeClasses()}>
                    ${claimerShare.toFixed(0)}
                  </span>
                </div>
              )}
              <div className={getStepPillClass("marketplace")} style={getStepPillBackgroundStyle("marketplace")}>
                <VerifyStepCheckIcon />
                Marketplace
              </div>
              <div className={getStepPillClass("verify")} style={getStepPillBackgroundStyle("verify")}>
                {verificationStatus === VERIFICATION_STATUS.CLAIMED_COMPLETED ? <VerifyStepCheckIcon /> : <VerifyStepCircleIcon />}
                {verificationStatus === VERIFICATION_STATUS.CLAIMED_COMPLETED ? "Verified" : verificationStatus === VERIFICATION_STATUS.NOT_CLAIMED_FAILED ? "Failed" : "Pending"}
              </div>
              <div className={getStepPillClass("proceed")} style={getStepPillBackgroundStyle("proceed")}>
                <VerifyStepPlusIcon />
                Proceed
              </div>
            </div>

            {/* Refresh button on the right */}
            {(verificationStatus === VERIFICATION_STATUS.PENDING ||
              verificationStatus === VERIFICATION_STATUS.IN_PROGRESS) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Refresh"
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  disabled={isRefreshing}
                  className="h-8 px-3 py-0 text-[12px] font-medium text-primary hover:text-primary hover:bg-primary/10 flex-shrink-0"
                >
                  <RefreshCw
                    className={cn("h-4 w-4 mr-1.5", isRefreshing && "animate-spin")}
                    aria-hidden
                  />
                  Refresh
                </Button>
              )}
          </div>
        </div>
      </div>

      <div
        id="verification-content"
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "max-h-0 opacity-0 py-0" : "max-h-[800px] opacity-100 py-6"
        )}
      >
        <div className="px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-start">
            <VerifyProspectCard
              prospectName={prospectName}
              prospectTitle={prospectTitle}
              prospectCompany={prospectCompany}
              claimerShare={claimerShare}
              showImportHint={verificationStatus === VERIFICATION_STATUS.PENDING}
            />
            <VerifyStatusPanel
              status={verificationStatus}
              sourcesChecked={sourcesChecked}
              remainingSources={remainingSources}
              matchedSource={matchedSource}
              onDismiss={onDismiss}
              onImportMore={onImportMore}
              onVerify={onVerify}
              isVerifying={isVerifying}
              verificationTriggered={verificationTriggered}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyConnectionBanner;
