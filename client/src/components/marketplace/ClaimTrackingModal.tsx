import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, X, AlertCircle } from "lucide-react";
import {
  WorkflowProgressTracker,
  WorkflowStep,
} from "@/components/finance/PayoutDetailsContent";
import { api } from "@/lib/api";

interface ClaimTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  introductionRequestId: string;
  contactName?: string;
}

interface PayoutData {
  workflowProgress?: WorkflowStep[];
  currentTrustScore?: number | null;
  qualifiesForImmediatePayout?: boolean;
}

export function ClaimTrackingModal({
  open,
  onOpenChange,
  introductionRequestId,
  contactName = "Introduction",
}: ClaimTrackingModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutData, setPayoutData] = useState<PayoutData | null>(null);

  useEffect(() => {
    async function fetchPayoutData() {
      if (!open || !introductionRequestId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await api.marketplace.getSharerTrackingDetails(
          introductionRequestId
        );
        setPayoutData({
          workflowProgress: data.workflowProgress,
          currentTrustScore: data.currentTrustScore,
          qualifiesForImmediatePayout: data.qualifiesForImmediatePayout,
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load tracking details";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchPayoutData();
  }, [open, introductionRequestId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden [&>button]:hidden"
        data-testid="claim-tracking-modal"
        mobileFullscreen
      >
        <DialogHeader className="sticky top-0 z-50 bg-background border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Clock className="h-6 w-6 text-blue-600" />
                Progress Tracker - {contactName}
              </DialogTitle>
              <DialogDescription>
                Track the status and timeline of this introduction request
              </DialogDescription>
            </div>
            <DialogClose className="z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 text-red-500" />
              <p className="font-medium">Failed to load tracking details</p>
              <p className="text-sm">Please try again later</p>
            </div>
          ) : payoutData?.workflowProgress &&
            payoutData.workflowProgress.length > 0 ? (
            <WorkflowProgressTracker
              steps={payoutData.workflowProgress}
              currentTrustScore={payoutData.currentTrustScore}
              qualifiesForImmediatePayout={
                payoutData.qualifiesForImmediatePayout
              }
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 text-slate-400" />
              <p className="font-medium">No tracking information available</p>
              <p className="text-sm">
                Progress details will appear here once available
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
