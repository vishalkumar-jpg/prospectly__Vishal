import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  CreditCard,
  Loader2,
  Shield,
  Lock,
  CheckCircle2,
  Calendar,
  KeyRound,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Use the same environment variable name as UpdateCardModal.tsx
const stripePublishableKey =
  import.meta.env.VITE_STRIPE_PUBLIC_KEY ||
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hasExistingCards?: boolean;
}

const elementStyle = {
  style: {
    base: {
      fontSize: "16px",
      color: "hsl(var(--foreground))",
      fontFamily: "inherit",
      "::placeholder": {
        color: "#9ca3af",
      },
    },
    invalid: {
      color: "hsl(var(--destructive))",
      iconColor: "hsl(var(--destructive))",
    },
  },
};

function PaymentMethodForm({
  onSuccess,
  onClose,
  hasExistingCards,
}: {
  onSuccess: () => void;
  onClose: () => void;
  hasExistingCards?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [setAsPrimary, setSetAsPrimary] = useState(!hasExistingCards);
  const [cardComplete, setCardComplete] = useState(false);
  const [expiryComplete, setExpiryComplete] = useState(false);
  const [cvcComplete, setCvcComplete] = useState(false);

  const isFormComplete = cardComplete && expiryComplete && cvcComplete;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);

    try {
      // Use centralized API request which handles CSRF tokens and automatic token refresh
      const setupData = await apiRequest<{ clientSecret: string }>(
        "/stripe/setup-intent",
        {
          method: "POST",
        }
      );

      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) throw new Error("Card element not found");

      const { setupIntent, error: confirmError } =
        await stripe.confirmCardSetup(setupData.clientSecret, {
          payment_method: {
            card: cardNumberElement,
          },
        });

      if (confirmError) throw confirmError;

      if (!setupIntent?.payment_method) {
        throw new Error("Stripe did not return a payment method ID");
      }

      if (setAsPrimary) {
        // Use centralized API request which handles CSRF tokens and automatic token refresh
        await apiRequest(
          `/stripe/payment-methods/${setupIntent.payment_method}/set-default`,
          {
            method: "PATCH",
          }
        );
      }

      toast.success(
        setAsPrimary
          ? "Payment method added and set as primary"
          : "Payment method added successfully"
      );
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add payment method";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-[22px] py-[18px]">
        {/* Secure Payment Authorization callout */}
        <div className="flex gap-3 rounded-xl border border-brand-amethyst/15 bg-brand-amethyst/5 p-4">
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-brand-amethyst/15 text-brand-amethyst">
            <Shield className="h-[17px] w-[17px]" />
          </span>
          <div className="space-y-1">
            <h4 className="text-[13.5px] font-extrabold text-foreground">
              Secure Payment Authorization
            </h4>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              This is for{" "}
              <span className="font-bold text-foreground">authorization only</span>
              . You won't be charged until your introduction request is accepted
              and milestones are achieved.
            </p>
          </div>
        </div>

        {/* How Payment Works */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-amethyst/10 text-brand-amethyst">
              <Lock className="h-[15px] w-[15px]" />
            </span>
            <h4 className="text-[13.5px] font-extrabold text-foreground">
              How Payment Works
            </h4>
          </div>
          <ul className="space-y-1.5 text-[12.5px]">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-[15px] w-[15px] shrink-0 text-brand-amethyst" />
              <span className="text-muted-foreground">
                <span className="font-extrabold text-foreground">
                  Authorization:
                </span>{" "}
                Card is validated but not charged
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-[15px] w-[15px] shrink-0 text-brand-amethyst" />
              <span className="text-muted-foreground">
                <span className="font-extrabold text-foreground">
                  Email Delivered:
                </span>{" "}
                5% charged when intro email is sent
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-[15px] w-[15px] shrink-0 text-brand-amethyst" />
              <span className="text-muted-foreground">
                <span className="font-extrabold text-foreground">
                  Meeting Booked:
                </span>{" "}
                95% charged when prospect books meeting
              </span>
            </li>
          </ul>
        </div>

        {/* Trust chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-brand-amethyst" />
            Stripe Secure
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-brand-amethyst" />
            SSL Encrypted
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-amethyst" />
            PCI Compliant
          </span>
        </div>

        {/* Card form */}
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label
              htmlFor="card-number"
              className="flex items-center gap-2 text-[12.5px] font-bold text-foreground"
            >
              <CreditCard className="h-[15px] w-[15px] text-muted-foreground" />
              Card Number
            </Label>
            <div className="rounded-[11px] border border-border bg-background px-[14px] py-[13px] transition focus-within:border-brand-amethyst focus-within:ring-2 focus-within:ring-brand-amethyst/20">
              <CardNumberElement
                id="card-number"
                options={{
                  ...elementStyle,
                  showIcon: true,
                  placeholder: "1234 5678 9012 3456",
                }}
                onChange={(e) => setCardComplete(e.complete)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="card-expiry"
                className="flex items-center gap-2 text-[12.5px] font-bold text-foreground"
              >
                <Calendar className="h-[15px] w-[15px] text-muted-foreground" />
                Expiry Date
              </Label>
              <div className="rounded-[11px] border border-border bg-background px-[14px] py-[13px] transition focus-within:border-brand-amethyst focus-within:ring-2 focus-within:ring-brand-amethyst/20">
                <CardExpiryElement
                  id="card-expiry"
                  options={{
                    ...elementStyle,
                    placeholder: "MM / YY",
                  }}
                  onChange={(e) => setExpiryComplete(e.complete)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="card-cvc"
                className="flex items-center gap-2 text-[12.5px] font-bold text-foreground"
              >
                <KeyRound className="h-[15px] w-[15px] text-muted-foreground" />
                Security Code
              </Label>
              <div className="rounded-[11px] border border-border bg-background px-[14px] py-[13px] transition focus-within:border-brand-amethyst focus-within:ring-2 focus-within:ring-brand-amethyst/20">
                <CardCvcElement
                  id="card-cvc"
                  options={{
                    ...elementStyle,
                    placeholder: "CVC",
                  }}
                  onChange={(e) => setCvcComplete(e.complete)}
                />
              </div>
            </div>
          </div>
        </div>

        {hasExistingCards && (
          <div className="flex items-center space-x-2 rounded-[11px] bg-muted/30 p-3">
            <Checkbox
              id="set-primary"
              checked={setAsPrimary}
              onCheckedChange={(checked) => setSetAsPrimary(checked as boolean)}
            />
            <Label
              htmlFor="set-primary"
              className="cursor-pointer text-[12.5px] font-bold text-foreground"
            >
              Set as primary payment method
            </Label>
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-[10px] border-t border-border bg-card px-[22px] py-[14px] sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 rounded-[11px] px-[18px] py-[11px] text-[13.5px] font-bold sm:flex-none"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isLoading || !isFormComplete}
          className="flex-1 rounded-[11px] bg-brand-gradient px-[18px] py-[11px] text-[13.5px] font-bold text-brand-foreground shadow-brand-cta transition-all hover:shadow-brand-cta-lg sm:flex-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Add Payment Method
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function AddPaymentMethodModal({
  isOpen,
  onClose,
  onSuccess,
  hasExistingCards = false,
}: AddPaymentMethodModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // iOS Safari overlays the on-screen keyboard on top of the layout viewport
  // (it does NOT shrink it), so a position:fixed fullscreen sheet keeps its full
  // height and its bottom footer ends up behind the keyboard. iOS can also
  // scroll a fixed element when an input/iframe inside it is focused. Make the
  // sheet keyboard-aware by sizing/positioning it to the visual viewport and
  // re-applying on every event iOS may fire (incl. focusin).
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const reset = () => {
      const el = contentRef.current;
      if (!el) return;
      el.style.height = "";
      el.style.top = "";
      el.style.bottom = "";
      el.style.transform = "";
    };

    const apply = () => {
      const el = contentRef.current;
      if (!el) return;
      // Desktop: leave the centered dialog untouched.
      if (window.matchMedia("(min-width: 640px)").matches) {
        reset();
        return;
      }
      // Counter the page scroll iOS performs when focusing the card iframe,
      // which would otherwise drag the fixed sheet out of view.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      el.style.height = `${vv.height}px`;
      el.style.top = "0px";
      el.style.bottom = "auto";
      el.style.transform = `translateY(${vv.offsetTop}px)`;
    };

    // Re-apply after the keyboard finishes animating (vv.height settles late).
    const applyDeferred = () => {
      raf = requestAnimationFrame(apply);
      if (timer) clearTimeout(timer);
      timer = setTimeout(apply, 100);
    };

    applyDeferred();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    document.addEventListener("focusin", applyDeferred);
    document.addEventListener("focusout", applyDeferred);

    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      document.removeEventListener("focusin", applyDeferred);
      document.removeEventListener("focusout", applyDeferred);
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      reset();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        ref={contentRef}
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 max-sm:overflow-hidden sm:max-w-[560px]"
        mobileFullscreen
        hideCloseButton
      >
        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3.5 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                Add Payment Method
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-relaxed text-white/90">
                Securely save a card for introductions
              </DialogDescription>
            </div>
          </div>
        </div>
        {!stripePromise ? (
          <div className="p-6">
            <Alert variant="destructive">
              <KeyRound className="h-4 w-4" />
              <AlertDescription>
                Stripe is not configured. Please set VITE_STRIPE_PUBLIC_KEY
                environment variable.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <Elements stripe={stripePromise}>
            <PaymentMethodForm
              onSuccess={onSuccess}
              onClose={onClose}
              hasExistingCards={hasExistingCards}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
