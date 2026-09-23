import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, DollarSign, Shield, Wallet, X } from "lucide-react";

interface ReferCandidateBankGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle?: string;
  onConnectBank: () => void;
  onSkip: () => void;
}

export function ReferCandidateBankGateModal({
  open,
  onOpenChange,
  jobTitle,
  onConnectBank,
  onSkip,
}: ReferCandidateBankGateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        mobileFullscreen
        hideCloseButton
      >
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-6 py-5 text-white sm:px-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3 pr-10">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                Connect your bank to earn
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] text-white/90">
                Set up payouts so you are ready when a referral is hired.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          {jobTitle ? (
            <p className="text-sm font-medium text-foreground">
              Referring for:{" "}
              <span className="text-brand-amethyst">{jobTitle}</span>
            </p>
          ) : null}
          <p className="text-sm leading-relaxed text-muted-foreground">
            You can refer a candidate now and connect your bank account anytime
            later from Account Setup or Payout Settings.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-brand-amethyst/15 bg-brand-amethyst/5 p-3.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-amethyst/10">
                <DollarSign className="h-4 w-4 text-brand-amethyst" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Get paid when referrals are hired
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Connector payouts are sent to your connected bank account
                  after a successful hire.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Secure Stripe payouts
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Bank details are handled securely by Stripe. You stay in
                  control of your payout settings.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card p-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={(event) => {
              event.preventDefault();
              onSkip();
            }}
            className="w-full sm:w-auto"
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={onConnectBank}
            className="w-full gap-2 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:w-auto"
          >
            Connect bank account
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
