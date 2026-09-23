import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, ArrowRight, X, PartyPopper, CheckCircle } from "lucide-react";
import type { ActiveRequestClaim } from "@/contexts/RequestClaimContext";

interface DealClaimProgressBannerProps {
  activeClaim: ActiveRequestClaim;
  completedStepsCount: number;
  onDismiss: () => void;
  onAbandon?: () => void;
}

export function DealClaimProgressBanner({
  activeClaim,
  completedStepsCount,
  onDismiss,
  onAbandon,
}: DealClaimProgressBannerProps) {
  const navigate = useNavigate();

  // WON STATE BANNER
  if (activeClaim.outcome === "claimed" && activeClaim.prospect.name) {
    return (
      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 text-white shadow-lg">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm">
                <PartyPopper className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Deal Won!</span>
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm">
                  {activeClaim.prospect.name}
                </span>
                {activeClaim.prospect.company && (
                  <span className="text-emerald-100 text-xs sm:text-sm">
                    @ {activeClaim.prospect.company}
                  </span>
                )}
              </div>
              {activeClaim.claimerShare && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-sm font-bold">
                  ${activeClaim.claimerShare}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-emerald-600 hover:bg-emerald-600 hover:text-emerald-50 hover:bg-emerald-50 font-semibold h-8 px-3"
                onClick={() => navigate("/dashboard/introduction-requests")}
              >
                View Details
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Hide banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PENDING/IN PROGRESS BANNER
  if (activeClaim.outcome === "pending" && activeClaim.prospect.name) {
    return (
      <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white shadow-lg">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm">
                <Trophy className="h-4 w-4" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="font-semibold text-sm">
                  Claiming: {activeClaim.prospect.name}
                </span>
                {activeClaim.prospect.company && (
                  <span className="text-white/80 text-xs sm:text-sm">
                    at {activeClaim.prospect.company}
                  </span>
                )}
              </div>
              {activeClaim.claimerShare && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-sm font-bold">
                  ${activeClaim.claimerShare}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-orange-600 hover:bg-orange-600 hover:text-orange-50 hover:bg-orange-50 font-semibold h-8 px-3"
                onClick={() => navigate("/getting-started")}
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Hide banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOST STATE BANNER
  if (activeClaim.outcome === "failed" && activeClaim.prospect.name) {
    return (
      <div className="sticky top-0 z-50 bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white shadow-lg">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm">
                <X className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Deal Lost</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm">
                  {activeClaim.prospect.name}
                </span>
                <span className="text-red-100 text-xs sm:text-sm hidden sm:inline">
                  - {activeClaim.lostReason || "Verification failed"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onAbandon?.();
                  onDismiss();
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if no valid claim data
  return null;
}
