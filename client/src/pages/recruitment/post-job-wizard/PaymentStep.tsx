import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Shield,
  Lock,
  Calendar,
  KeyRound,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { usePrimaryPaymentMethod } from "@/hooks/usePrimaryPaymentMethod";
import type { JobFormData, UpdateJobFormData } from "./types";

const stripePublishableKey =
  import.meta.env.VITE_STRIPE_PUBLIC_KEY ||
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

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

interface PaymentStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
}

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [expiryComplete, setExpiryComplete] = useState(false);
  const [cvcComplete, setCvcComplete] = useState(false);
  const { toast } = useToast();

  const isFormComplete = cardComplete && expiryComplete && cvcComplete;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    try {
      const setupData = await apiRequest<{ clientSecret: string }>(
        "/stripe/setup-intent",
        { method: "POST" }
      );

      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) throw new Error("Card element not found");

      const { setupIntent, error: confirmError } =
        await stripe.confirmCardSetup(setupData.clientSecret, {
          payment_method: { card: cardNumberElement },
        });

      if (confirmError) throw confirmError;

      if (!setupIntent?.payment_method) {
        throw new Error("Stripe did not return a payment method ID");
      }

      await apiRequest(
        `/stripe/payment-methods/${setupIntent.payment_method}/set-default`,
        { method: "PATCH" }
      );

      toast({
        title: "Card Added Successfully",
        description: "Your payment method has been saved and set as default.",
      });
      onSuccess();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add payment method";
      toast({
        title: "Error Adding Card",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="card-number"
            className="text-sm font-medium flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Card Number
          </Label>
          <div className="p-3 border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="card-expiry"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Expiry Date
            </Label>
            <div className="p-3 border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
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

          <div className="space-y-2">
            <Label
              htmlFor="card-cvc"
              className="text-sm font-medium flex items-center gap-2"
            >
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Security Code
            </Label>
            <div className="p-3 border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
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

      <Button
        type="submit"
        disabled={!stripe || isLoading || !isFormComplete}
        className="w-full bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Card...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" /> Save Payment Method
          </>
        )}
      </Button>
    </form>
  );
}

export default function PaymentStep({
  formData,
  updateFormData,
}: PaymentStepProps) {
  const { primaryPaymentMethod, loading: paymentLoading } =
    usePrimaryPaymentMethod();
  const [showChangeForm, setShowChangeForm] = useState(false);

  // Auto-set hasPaymentMethod if user already has a saved card
  useEffect(() => {
    if (!paymentLoading && primaryPaymentMethod && !formData.hasPaymentMethod) {
      updateFormData({ hasPaymentMethod: true });
    }
  }, [
    paymentLoading,
    primaryPaymentMethod,
    formData.hasPaymentMethod,
    updateFormData,
  ]);

  const handleSuccess = () => {
    updateFormData({ hasPaymentMethod: true });
    setShowChangeForm(false);
  };

  if (paymentLoading) {
    return (
      <div className="space-y-6">
        <div className="text-left mb-4 sm:mb-6 lg:mb-8">
          <h2 className="text-2xl font-extrabold text-foreground">
            Payment Method
          </h2>
          <p className="text-muted-foreground mt-2">
            Checking your payment details...
          </p>
        </div>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-amethyst" />
        </div>
      </div>
    );
  }

  if (formData.hasPaymentMethod && !showChangeForm) {
    return (
      <div className="space-y-6">
        <div className="text-left mb-4 sm:mb-6 lg:mb-8">
          <h2 className="text-2xl font-extrabold text-foreground">
            Payment Method
          </h2>
          <p className="text-muted-foreground mt-2">
            Your payment method is saved
          </p>
        </div>
        <div className="w-full">
          <Card className="rounded-2xl border border-brand-success/30 bg-brand-success/10 shadow-brand-card">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-brand-success mx-auto mb-3" />
              <p className="font-semibold text-brand-success mb-1">
                Payment method added
              </p>
              {primaryPaymentMethod && (
                <p className="text-sm text-brand-success font-medium mb-1">
                  {primaryPaymentMethod.brand.charAt(0).toUpperCase() +
                    primaryPaymentMethod.brand.slice(1)}{" "}
                  ending in {primaryPaymentMethod.last4} &middot; Expires{" "}
                  {String(primaryPaymentMethod.expMonth).padStart(2, "0")}/
                  {primaryPaymentMethod.expYear}
                </p>
              )}
              <p className="text-sm text-brand-success">
                You'll be charged only when you move a candidate to Hired.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowChangeForm(true)}
              >
                Change Payment Method
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-left mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">
          Secure Payment Setup
        </h2>
        <p className="text-muted-foreground mt-2">
          Add a payment method to publish your job post
        </p>
      </div>

      <div className="w-full space-y-6">
        {/* Card Form */}
        <Card className="rounded-2xl border border-border shadow-brand-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-brand-amethyst" />
              Credit Card Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stripePromise ? (
              <Alert variant="destructive">
                <KeyRound className="h-4 w-4" />
                <AlertDescription>
                  Stripe is not configured. Please set VITE_STRIPE_PUBLIC_KEY
                  environment variable.
                </AlertDescription>
              </Alert>
            ) : (
              <Elements stripe={stripePromise}>
                <PaymentForm onSuccess={handleSuccess} />
              </Elements>
            )}
          </CardContent>
        </Card>

        {/* Security Badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-brand-sky" />
            <span className="text-xs">Powered by Stripe</span>
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <Lock className="h-3.5 w-3.5 text-brand-success" />
            <span className="text-xs">Encrypted</span>
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-amethyst" />
            <span className="text-xs">PCI Compliant</span>
          </Badge>
        </div>

        {/* Reassurance Microcopy */}
        <p className="text-xs text-center text-muted-foreground">
          Your card information is encrypted end-to-end and never stored on our
          servers.
        </p>
      </div>
    </div>
  );
}
