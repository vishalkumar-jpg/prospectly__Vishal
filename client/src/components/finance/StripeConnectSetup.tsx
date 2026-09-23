import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Settings2,
  RefreshCw,
} from "lucide-react";

export function StripeConnectSetup() {
  const { user } = useAuth();
  const {
    status,
    isLoading,
    isError: hasError,
    refresh,
    refetch,
  } = usePayoutStatus({ poll: true });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [countryOverride, setCountryOverride] = useState<string | null>(null);
  const [isSavingCountry, setIsSavingCountry] = useState(false);

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
      const data = await api.stripe.createPayoutAccount();
      if (data.url) {
        openExternalUrlInNewTab(data.url);
        // Recipient account now exists; refresh so polling activates and the
        // card flips to Connected once the bank is added (no manual click).
        await refresh();
      } else {
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
        openExternalUrlInNewTab(data.url);
        await refresh();
      } else {
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

  if (isLoading) {
    return (
      <Card className="shadow-lg border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
          </div>
        </CardHeader>
        <CardContent
          className="space-y-6"
          aria-busy
          aria-label="Loading payout settings"
        >
          <Skeleton className="h-[4.5rem] w-full rounded-xl" />
          <div className="flex items-center gap-4 rounded-xl border p-4">
            <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const setupComplete = isStripePayoutSetupComplete(status);
  const isConnected = status?.isConnected ?? false;
  const canAddBank = Boolean(country) && !isSavingCountry;
  const currency = getPayoutCurrencyForCountry(country);

  // active = capability live; verifying = bank added, Stripe checking;
  // attention = account exists but no bank yet (information still needed).
  const accountState = getPayoutAccountState(status);
  const accountBadge = {
    active: { label: "Active", className: "bg-emerald-500" },
    verifying: { label: "Verifying", className: "bg-amber-500" },
    attention: { label: "Information Needed", className: "bg-amber-500" },
  }[accountState];

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Payout Settings</CardTitle>
                <CardDescription>
                  Set up your bank account for referral payouts
                </CardDescription>
              </div>
            </div>
            {setupComplete && (
              <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-50 dark:text-emerald-400 border-emerald-500/30 px-3 py-1">
                <CheckCircle2 className="h-3 w-3 mr-1.5" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasError && (
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
          )}

          {!hasError && !isConnected && (
            <>
              {/* Why we ask for bank details + reassurance */}
              <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">
                    Why we need your bank details
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    This is where we send the money you earn from referrals.
                    Your details are encrypted and handled securely by Stripe —
                    we never see or store them.
                  </p>
                </div>
              </div>

              {/* How it works — 3 step guide */}
              <div className="space-y-4 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">How it works</h4>
                </div>

                {/* Step 1 — choose country */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-extrabold text-brand-foreground shadow-brand-cta">
                      1
                    </span>
                    <div className="mt-1 w-px flex-1 bg-border" />
                  </div>
                  <div className="flex-1 pb-1 pt-0.5">
                    <p className="text-sm font-bold leading-snug text-foreground">
                      Choose your country
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Tells us which currency to pay you in.
                    </p>
                  </div>
                </div>

                {/* Step 2 — add bank */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-extrabold text-brand-foreground shadow-brand-cta">
                      2
                    </span>
                    <div className="mt-1 w-px flex-1 bg-border" />
                  </div>
                  <div className="flex-1 pb-1 pt-0.5">
                    <p className="text-sm font-bold leading-snug text-foreground">
                      Add your bank account
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      We&apos;ll take you to Stripe to add it securely — it only
                      takes a minute.
                    </p>
                  </div>
                </div>

                {/* Step 3 — ready */}
                <div className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-extrabold text-brand-foreground shadow-brand-cta">
                    3
                  </span>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-bold leading-snug text-foreground">
                      You&apos;re ready to earn
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Once your account is approved, your payouts arrive in your
                      bank automatically.
                    </p>
                  </div>
                </div>
              </div>

              {/* Country selector — standalone, prominent field */}
              <div className="space-y-2 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Select your country</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Where your bank account is located — this sets your payout
                  currency.
                </p>
                <Select
                  value={country || undefined}
                  onValueChange={handleCountryChange}
                  disabled={isSavingCountry}
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
                    <span className="text-muted-foreground">
                      You&apos;ll be paid in:
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 font-semibold"
                    >
                      {getPayoutCurrencySymbol(currency)} {currency}
                    </Badge>
                  </div>
                ) : null}
                {isSavingCountry ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving country…
                  </p>
                ) : null}
              </div>

              {/* Primary action + trust signals */}
              <div className="space-y-3">
                <Button
                  onClick={handleAddBankAccount}
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                  disabled={isConnecting || !canAddBank}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-5 w-5" />
                      Add Bank Account
                    </>
                  )}
                </Button>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" /> Secure payment
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" /> Powered by Stripe
                  </span>
                </div>
              </div>
            </>
          )}

          {!hasError && isConnected && status && (
            <div className="space-y-6">
              {accountState === "attention" && (
                <Alert className="border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <AlertDescription className="text-amber-900 dark:text-amber-100">
                    <p className="font-semibold">Information Needed</p>
                    <p className="text-sm mt-1">
                      Finish adding your bank account in Stripe to start
                      receiving payouts.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

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
                      className={`${accountBadge.className} text-white border-0 text-[10px] px-2 py-0.5 font-semibold uppercase`}
                    >
                      {accountBadge.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono mt-0.5">
                    {status.accountId}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
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
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
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
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  {!setupComplete && (
                    <Button
                      onClick={handleRefreshLink}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={isConnecting}
                      data-testid="button-manage-stripe"
                    >
                      {isConnecting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      Continue Setup
                    </Button>
                  )}

                  <Button
                    onClick={() => setShowDisconnectDialog(true)}
                    variant="outline"
                    className="border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isDisconnecting}
                    data-testid="button-disconnect-stripe"
                  >
                    <Unplug className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> Secure payment
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" /> Powered by Stripe
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
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
              onClick={handleDisconnect}
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
    </div>
  );
}
