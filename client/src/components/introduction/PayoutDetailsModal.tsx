import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, AlertCircle } from "lucide-react";
import {
  PayoutDetailsContent,
  PayoutRecord,
} from "@/components/finance/PayoutDetailsContent";
import { api } from "@/lib/api";

interface PayoutDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  introductionRequestId: string;
  prospectName?: string;
}

export function PayoutDetailsModal({
  open,
  onOpenChange,
  introductionRequestId,
  prospectName = "Introduction",
}: PayoutDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutData, setPayoutData] = useState<PayoutRecord | null>(null);

  useEffect(() => {
    async function fetchPayoutData() {
      if (!open || !introductionRequestId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await api.finances.getRequestPayout(introductionRequestId);
        setPayoutData(data);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load payout details";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchPayoutData();
  }, [open, introductionRequestId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl lg:max-w-4xl !ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=open]:!duration-500 data-[state=closed]:!duration-300 will-change-transform"
        data-testid="payout-details-drawer"
      >
        <div className="flex-1 overflow-y-auto bg-app [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
          <div className="space-y-6 p-4 sm:p-6">
            <section className="relative overflow-hidden rounded-2xl bg-brand-hero-gradient p-5 text-white shadow-brand-card sm:p-7">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
              />
              <div className="relative flex items-center gap-3.5 pr-10">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
                    Payout Details
                  </SheetTitle>
                  <SheetDescription asChild>
                    <div className="mt-1 truncate text-[13px] leading-relaxed text-white/90">
                      {prospectName}
                      {" — View your earnings and payout progress"}
                    </div>
                  </SheetDescription>
                </div>
              </div>
            </section>

            {loading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
                <Skeleton className="h-64 w-full" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
                <p className="font-medium">Failed to load payout details</p>
                <p className="text-sm">Please try again later</p>
              </div>
            ) : payoutData ? (
              <PayoutDetailsContent payout={payoutData} />
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
