import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Gift,
  X,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { usePendingClaim, type PendingClaim } from "@/hooks/use-pending-claim";
import { useRequestClaim } from "@/contexts/RequestClaimContext";
import { AnimatedCounter } from "@/components/ui/innovative";
import { cn } from "@/lib/utils";

const BANNER_DISMISSED_KEY = "prospectly_claim_banner_dismissed";

interface PendingClaimBannerProps {
  onStartClaim: (claim: PendingClaim) => void;
}

export function PendingClaimBanner({ onStartClaim }: PendingClaimBannerProps) {
  const { pendingClaim, hasPendingClaim, clearPendingClaim } =
    usePendingClaim();
  const {
    activeClaim,
    hasActiveClaim,
    completedStepsCount,
    isLoading,
    refreshClaimStatus,
  } = useRequestClaim();

  // Session-based dismissal
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(BANNER_DISMISSED_KEY) === "true";
  });

  // Reset dismissal when claim changes
  useEffect(() => {
    if (!hasActiveClaim && !hasPendingClaim) {
      sessionStorage.removeItem(BANNER_DISMISSED_KEY);
      setDismissed(false);
    }
  }, [hasActiveClaim, hasPendingClaim]);

  // Case 1: Active claim in progress - show progress
  if (hasActiveClaim && activeClaim?.outcome === "pending" && !dismissed) {
    const totalSteps = 5;
    const progressPercent = (completedStepsCount / totalSteps) * 100;

    const handleDismiss = () => {
      setDismissed(true);
      sessionStorage.setItem(BANNER_DISMISSED_KEY, "true");
    };

    const handleRefresh = async () => {
      await refreshClaimStatus();
    };

    return (
      <Card className="mb-6 border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-lg animate-in slide-in-from-top duration-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon with spinner */}
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                {isLoading ? (
                  <Loader2 className="h-7 w-7 text-white animate-spin" />
                ) : (
                  <Gift className="h-7 w-7 text-white" />
                )}
              </div>
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white animate-pulse" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-emerald-900">
                  Claim In Progress
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-800"
                >
                  <RefreshCw
                    className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")}
                  />
                  Refresh
                </Button>
              </div>
              <p className="text-sm text-emerald-700">
                Verifying connection to{" "}
                <span className="font-semibold">
                  {activeClaim.prospect.name}
                </span>
                {activeClaim.prospect.company && (
                  <>
                    {" "}
                    at{" "}
                    <span className="font-semibold">
                      {activeClaim.prospect.company}
                    </span>
                  </>
                )}
              </p>
              {/* Progress bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-600">
                    Verification progress
                  </span>
                  <span className="font-semibold text-emerald-700">
                    {completedStepsCount}/{totalSteps} steps
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-800 hover:text-emerald-100 hover:bg-emerald-100"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
                onClick={() => (window.location.href = "/verify-connection")}
              >
                View Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Case 2: Pending claim waiting to start - show original banner
  if (hasPendingClaim && pendingClaim && !dismissed) {
    const handleDismiss = () => {
      setDismissed(true);
      sessionStorage.setItem(BANNER_DISMISSED_KEY, "true");
      clearPendingClaim();
    };

    const handleContinue = () => {
      onStartClaim(pendingClaim);
    };

    return (
      <Card className="mb-6 border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg animate-in slide-in-from-top duration-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
                <Gift className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center animate-bounce">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-bold text-lg text-amber-900">
                Continue Your Claim!
              </h3>
              <p className="text-sm text-amber-700">
                You started claiming the deal for{" "}
                <span className="font-semibold">
                  {pendingClaim.prospectName}
                </span>{" "}
                at{" "}
                <span className="font-semibold">
                  {pendingClaim.prospectCompany}
                </span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-amber-600">
                  Potential earnings:
                </span>
                <AnimatedCounter
                  value={Math.floor(pendingClaim.bountyAmount / 2)}
                  prefix="$"
                  className="text-sm font-bold text-amber-700"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-amber-600 hover:text-amber-800 hover:bg-amber-800 hover:text-amber-100 hover:bg-amber-100"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                onClick={handleContinue}
              >
                Continue Claim
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
