import { Wallet } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { PayoutDetailsContent } from "./PayoutDetailsContent";
import type { PayoutRecord } from "@/hooks/useTransactionHistory";

interface PayoutDetailsDrawerProps {
  payout: PayoutRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayoutDetailsDrawer({
  payout,
  open,
  onOpenChange,
}: PayoutDetailsDrawerProps) {
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
                      {payout?.contactName || "Introduction"}
                      {" — View your earnings and payout progress"}
                    </div>
                  </SheetDescription>
                </div>
              </div>
            </section>

            {payout && <PayoutDetailsContent payout={payout} />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
