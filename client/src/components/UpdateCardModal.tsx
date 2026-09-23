import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";
import { CreditCard, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useToast } from "@/hooks/use-toast";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { apiRequest } from "@/lib/api";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface UpdateCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PaymentForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Error Adding Card",
          description:
            error.message || "Failed to add payment method. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Card Added Successfully",
          description: "Your new payment method has been added.",
        });
        onSuccess();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      toast({
        title: "Error Adding Card",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={loading}
          data-testid="button-cancel-add-card"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !stripe || !elements}
          className="flex-1"
          data-testid="button-submit-add-card"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding Card...
            </>
          ) : (
            "Add Card"
          )}
        </Button>
      </div>
    </form>
  );
}

const UpdateCardModal = ({ open, onOpenChange }: UpdateCardModalProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const { toast } = useToast();
  const { fetchPaymentMethods } = usePaymentMethods();

  const createSetupIntent = async () => {
    setSetupLoading(true);
    try {
      // Use centralized API request which handles CSRF tokens and automatic token refresh
      const data = await apiRequest<{ clientSecret: string }>(
        "/stripe/setup-intent",
        {
          method: "POST",
        }
      );
      setClientSecret(data.clientSecret);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load payment form. Please try again.";
      toast({
        title: "Error Loading Payment Form",
        description: errorMessage,
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setSetupLoading(false);
    }
  };

  useEffect(() => {
    if (open && !clientSecret) {
      createSetupIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientSecret]); // createSetupIntent is stable and doesn't need to be in deps

  const handleSuccess = () => {
    setClientSecret(null);
    fetchPaymentMethods();
    onOpenChange(false);
  };

  const handleCancel = () => {
    setClientSecret(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleCancel();
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent
        className="max-w-md"
        data-testid="modal-add-card"
        mobileFullscreen
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Payment Method
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
            {setupLoading ? (
              <Loader message="Loading payment form..." />
            ) : !stripePromise ? (
              <div className="text-center py-8 text-muted-foreground">
                Stripe is not configured. Please set VITE_STRIPE_PUBLIC_KEY
                environment variable.
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />
              </Elements>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load payment form. Please try again.
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateCardModal;
