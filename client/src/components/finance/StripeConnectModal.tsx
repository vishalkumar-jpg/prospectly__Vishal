import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePayoutStatus } from "@/hooks/usePayoutStatus";
import type { PayoutStatus } from "@/lib/api/payments";
import {
  PAYOUT_COUNTRIES,
  getPayoutAccountState,
  getPayoutCurrencyForCountry,
  getPayoutCurrencySymbol,
  isStripePayoutSetupComplete,
  openExternalUrlInNewTab,
} from "@/lib/stripe-connect";
import {
  Wallet,
  CheckCircle2,
  Loader2,
  Shield,
  ShieldCheck,
  Lock,
  DollarSign,
  AlertCircle,
  Unplug,
  CreditCard,
  Globe,
  X,
  RefreshCw,
} from "lucide-react";

interface StripeConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onBeforeStripeRedirect?: () => void;
  connectReturnUrl?: string;
  connectRefreshUrl?: string;
}

function PayoutModalHero({ status }: { status: PayoutStatus | null }) {
  const showConnectedBadge = isStripePayoutSetupComplete(status);

  return (
    <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-5 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
      />
      <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogClose>
      <div className="relative flex flex-wrap items-center gap-3.5 pr-10">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
            Set Up Payouts
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-1 text-[13px] leading-relaxed text-white/90">
              {status?.isConnected
                ? "Manage your bank account for referral payouts."
                : "Choose your country and add a bank account to receive referral payouts."}
            </div>
          </DialogDescription>
        </div>
        {showConnectedBadge ? (
          <Badge className="border border-white/30 bg-white/20 text-white backdrop-blur hover:bg-white/25 hover:text-white px-3 py-1">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            Connected
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function PayoutWhyIntro() {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10">
        <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Why we need your bank details</h3>
        <p className="text-sm text-muted-foreground">
          This is where we send the money you earn from referrals. Your details
          are encrypted and handled securely by Stripe — we never see or store
          them.
        </p>
      </div>
    </div>
  );
}

function PayoutStepRow({
  step,
  title,
  description,
  isLast,
  children,
}: {
  step: number;
  title: string;
  description: string;
  isLast?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-extrabold text-brand-foreground shadow-brand-cta">
          {step}
        </span>
        {!isLast ? <div className="mt-1 w-px flex-1 bg-border" /> : null}
      </div>
      <div className={`flex-1 space-y-2 pt-0.5 ${isLast ? "" : "pb-1"}`}>
        <div>
          <p className="text-sm font-bold leading-snug text-foreground">
            {title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function PayoutSetupGuide() {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">How it works</h4>
      </div>

      <PayoutStepRow
        step={1}
        title="Choose your country"
        description="Tells us which currency to pay you in."
      />

      <PayoutStepRow
        step={2}
        title="Add your bank account"
        description="We'll take you to Stripe to add it securely — it only takes a minute."
      />

      <PayoutStepRow
        step={3}
        title="You're ready to earn"
        description="Once your account is approved, your payouts arrive in your bank automatically."
        isLast
      />
    </div>
  );
}

function PayoutCountryField({
  country,
  onCountryChange,
  isSaving,
  disabled,
}: {
  country: string;
  onCountryChange: (value: string) => void;
  isSaving: boolean;
  disabled?: boolean;
}) {
  const currency = getPayoutCurrencyForCountry(country);

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Select your country</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Where your bank account is located — this sets your payout currency.
      </p>
      <Select
        value={country || undefined}
        onValueChange={onCountryChange}
        disabled={isSaving || disabled}
      >
        <SelectTrigger
          className="w-full"
          data-testid="select-payout-country"
          aria-label="Payout country"
        >
          <SelectValue placeholder="Select your country" />
        </SelectTrigger>
        <SelectContent>
          {PAYOUT_COUNTRIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {currency ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">You'll be paid in:</span>
          <Badge
            variant="outline"
            className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 font-semibold"
          >
            {getPayoutCurrencySymbol(currency)} {currency}
          </Badge>
        </div>
      ) : null}
      {isSaving ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving country…
        </p>
      ) : null}
    </div>
  );
}

function PayoutTrustSignals() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> Secure payment
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" /> Powered by Stripe
      </span>
    </div>
  );
}

const PAYOUT_BADGE_COPY = {
  active: { label: "Active", className: "bg-emerald-500" },
  verifying: { label: "Verifying", className: "bg-amber-500" },
  attention: { label: "Information Needed", className: "bg-amber-500" },
} as const;

function PayoutConnectedStatus({ status }: { status: PayoutStatus }) {
  // active = capability live; verifying = bank added, Stripe checking;
  // attention = account exists but no bank yet (information still needed).
  const accountState = getPayoutAccountState(status);
  const payoutsReady = accountState === "active";
  const badge = PAYOUT_BADGE_COPY[accountState];

  return (
    <div className="space-y-6">
      {accountState === "attention" ? (
        <Alert className="border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            <p className="font-semibold">Information Needed</p>
            <p className="text-sm mt-1">
              Finish adding your bank account in Stripe to start receiving
              payouts.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
        <div className="h-11 w-11 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-sm uppercase tracking-wide">
              Payout Account
            </h3>
            <Badge
              className={`${badge.className} text-white border-0 text-[10px] px-2 py-0.5 font-semibold uppercase`}
            >
              {badge.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">
            {status.accountId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Globe className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Country</p>
              <p className="text-xs text-muted-foreground">
                {status.countryName || status.country || "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Currency</p>
              <p className="text-xs text-muted-foreground">
                {status.payoutCurrency
                  ? `${getPayoutCurrencySymbol(status.payoutCurrency)} ${status.payoutCurrency}`
                  : "—"}
              </p>
            </div>
          </div>
          {payoutsReady ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : null}
        </div>
      </div>

      <PayoutTrustSignals />
    </div>
  );
}

function PayoutModalBodySkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading payout settings">
      <Skeleton className="h-[4.5rem] w-full rounded-xl" />
      <div className="flex items-center gap-4 rounded-xl border p-4">
        <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-[4.5rem] rounded-xl" />
        <Skeleton className="h-[4.5rem] rounded-xl" />
      </div>
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

function PayoutModalFooterSkeleton() {
  return (
    <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
      <Skeleton className="h-10 w-full rounded-md sm:w-32" />
      <Skeleton className="h-10 w-full rounded-md sm:w-36" />
    </div>
  );
}

function PayoutDisconnectDialog({
  open,
  onOpenChange,
  isDisconnecting,
  onDisconnect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDisconnecting: boolean;
  onDisconnect: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Unplug className="h-5 w-5 text-destructive" />
            Disconnect payout account?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <span className="block">
              Are you sure you want to disconnect your payout account? This
              will:
            </span>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Remove your bank account connection</li>
              <li>Stop automatic payouts for future earnings</li>
              <li>Require reconnection to receive payments again</li>
            </ul>
            <span className="block text-sm font-medium text-amber-600 dark:text-amber-400">
              Note: This will not affect any payouts already in progress.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisconnecting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Unplug className="mr-2 h-4 w-4" />
                Disconnect
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function StripeConnectModal({
  isOpen,
  onClose,
  onSuccess,
  onBeforeStripeRedirect,
  connectReturnUrl,
  connectRefreshUrl,
}: StripeConnectModalProps) {
  const { user } = useAuth();
  // Shared payout status: re-fetches on window focus (e.g. returning from the
  // Stripe onboarding tab) and polls while a connected account is verifying, so
  // the popup updates with no manual click.
  const {
    status,
    isLoading,
    isError: hasError,
    refresh,
    refetch,
  } = usePayoutStatus({
    enabled: isOpen,
    poll: isOpen,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [countryOverride, setCountryOverride] = useState<string | null>(null);
  const [isSavingCountry, setIsSavingCountry] = useState(false);

  // Country shown in the selector: the user's local edit, else the server value.
  const country =
    countryOverride ??
    status?.country ??
    (user as { country?: string } | null)?.country ??
    "";

  const handleCountryChange = async (value: string) => {
    setCountryOverride(value);
    setIsSavingCountry(true);
    try {
      await api.profiles.update({ country: value });
      // Re-read the server-verified payout status (it returns the saved country
      // + currency). No need to refresh the whole auth user — that fires an
      // extra GET /auth/me and cascades unrelated refetches on every change.
      await refresh();
      toast.success("Payout country saved");
    } catch (error: unknown) {
      setCountryOverride(null);
      const message =
        error instanceof Error ? error.message : "Failed to save country";
      toast.error(message);
    } finally {
      setIsSavingCountry(false);
    }
  };

  const handleAddBankAccount = async () => {
    setIsConnecting(true);
    try {
      const body =
        connectReturnUrl || connectRefreshUrl
          ? { returnUrl: connectReturnUrl, refreshUrl: connectRefreshUrl }
          : undefined;
      const data = await api.stripe.createPayoutAccount(body);

      if (data.url) {
        onBeforeStripeRedirect?.();
        openExternalUrlInNewTab(data.url);
        // The recipient account now exists; refresh so polling activates and the
        // popup flips to Connected once the bank is added (no manual click).
        await refresh();
      } else {
        // Already onboarded — show the connected state instead of erroring.
        toast.success("Your bank account is already connected");
        await refresh();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to start bank setup";
      toast.error(message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshLink = async () => {
    setIsConnecting(true);
    try {
      const data = await api.stripe.getPayoutAccountLink();
      if (data.url) {
        onBeforeStripeRedirect?.();
        openExternalUrlInNewTab(data.url);
        await refresh();
      } else {
        // Already onboarded — refresh status to render the connected view.
        toast.success("Your bank account is already connected");
        await refresh();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to continue bank setup";
      toast.error(message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await api.stripe.disconnectPayoutAccount();
      toast.success("Payout account disconnected successfully");
      setShowDisconnectDialog(false);
      setCountryOverride(null);
      await refresh();
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to disconnect payout account";
      toast.error(message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const setupComplete = isStripePayoutSetupComplete(status);
  const isConnected = status?.isConnected ?? false;
  const canAddBank = Boolean(country) && !isSavingCountry;

  const renderBody = () => {
    if (isLoading) return <PayoutModalBodySkeleton />;

    if (hasError) {
      return (
        <Alert className="border-destructive/50">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertDescription className="space-y-3">
            <p className="font-medium text-destructive">
              Something went wrong loading your payout settings.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (isConnected && status) {
      return <PayoutConnectedStatus status={status} />;
    }

    return (
      <>
        <PayoutWhyIntro />
        <PayoutSetupGuide />
        <PayoutCountryField
          country={country}
          onCountryChange={handleCountryChange}
          isSaving={isSavingCountry}
        />
        <PayoutTrustSignals />
      </>
    );
  };

  const renderFooter = () => {
    if (hasError) return null;

    if (!isConnected) {
      return (
        <Button
          type="button"
          onClick={handleAddBankAccount}
          disabled={isConnecting || !canAddBank}
          className="flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:flex-none"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting to Stripe...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Add Bank Account
            </>
          )}
        </Button>
      );
    }

    return (
      <>
        <Button
          type="button"
          onClick={() => setShowDisconnectDialog(true)}
          disabled={isDisconnecting}
          variant="outline"
          data-testid="button-disconnect-stripe"
          className="flex-1 border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none"
        >
          <Unplug className="mr-2 h-4 w-4" />
          Disconnect
        </Button>
        {!setupComplete ? (
          <Button
            type="button"
            onClick={handleRefreshLink}
            disabled={isConnecting}
            data-testid="button-manage-stripe"
            className="flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:flex-none"
          >
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            Continue Setup
          </Button>
        ) : null}
      </>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
          mobileFullscreen
          hideCloseButton
        >
          <PayoutModalHero status={status} />

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {renderBody()}
          </div>

          {!isLoading ? (
            <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
              {renderFooter()}
            </div>
          ) : (
            <PayoutModalFooterSkeleton />
          )}
        </DialogContent>
      </Dialog>

      <PayoutDisconnectDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        isDisconnecting={isDisconnecting}
        onDisconnect={handleDisconnect}
      />
    </>
  );
}
