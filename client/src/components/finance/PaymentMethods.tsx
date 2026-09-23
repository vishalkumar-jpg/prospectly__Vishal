import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Loader } from "@/components/ui/loader";
import { CreditCard, Loader2, Shield, Plus } from "lucide-react";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { PaymentMethodCard } from "./PaymentMethodCard";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PaymentMethodsProps {
  onAddCardClick: () => void;
}

const getCardIcon = (brand: string) => {
  const brandLower = brand.toLowerCase();
  const brandColor =
    {
      visa: "text-blue-600",
      mastercard: "text-orange-600",
      amex: "text-green-600",
      discover: "text-purple-600",
    }[brandLower] || "text-muted-foreground";

  return <CreditCard className={cn("h-5 w-5", brandColor)} />;
};

const getBrandColor = (brand: string) => {
  const brandLower = brand.toLowerCase();
  return (
    {
      visa: "from-blue-500 to-blue-600",
      mastercard: "from-orange-500 to-orange-600",
      amex: "from-green-500 to-green-600",
      discover: "from-purple-500 to-purple-600",
    }[brandLower] || "from-gray-500 to-gray-600"
  );
};

export function PaymentMethods({ onAddCardClick }: PaymentMethodsProps) {
  const {
    paymentMethods,
    loading,
    hasPaymentMethods,
    removePaymentMethod,
    setPrimaryPaymentMethod,
  } = usePaymentMethods();

  const [cardToRemove, setCardToRemove] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

  const handleRemoveCard = async () => {
    if (!cardToRemove) return;

    setIsRemoving(true);
    await removePaymentMethod(cardToRemove);
    setIsRemoving(false);
    setCardToRemove(null);
  };

  const handleSetPrimary = async (cardId: string) => {
    setSettingPrimary(cardId);
    await setPrimaryPaymentMethod(cardId);
    setSettingPrimary(null);
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border border-border shadow-md bg-white">
        <CardContent className="space-y-6 p-4 md:p-6">
          {/* Add Card Button - Only show when user has existing payment methods */}
          {!loading && hasPaymentMethods && (
            <div className="flex justify-end">
              <Button
                onClick={onAddCardClick}
                size="lg"
                className="gap-2 bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
              >
                <Plus className="h-4 w-4" />
                Add Card
              </Button>
            </div>
          )}

          {loading ? (
            <Loader message="Loading payment methods..." />
          ) : (
            <>
              {!hasPaymentMethods ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 px-4 md:px-12">
                    <div className="mb-4 rounded-full bg-brand-amethyst/10 p-4">
                      <CreditCard className="h-8 w-8 text-brand-amethyst" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-center md:text-left">
                      No Payment Methods Added Yet
                    </h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                      Add a payment method to start sending introduction
                      requests and manage your referral payouts
                    </p>
                    <Button
                      onClick={onAddCardClick}
                      className="gap-2 bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First Card
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <h3 className="text-lg font-semibold">Your Cards</h3>

                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(220px,280px))] px-2 sm:px-0">
                    {paymentMethods.map((method) => (
                      <PaymentMethodCard
                        key={method.id}
                        method={method}
                        onSetPrimary={handleSetPrimary}
                        onRemove={setCardToRemove}
                        isProcessing={
                          settingPrimary === method.id ||
                          (isRemoving && cardToRemove === method.id)
                        }
                      />
                    ))}
                  </div>
                </>
              )}

              <Alert className="border-brand-amethyst/20 bg-brand-amethyst/5">
                <Shield className="h-4 w-4 text-brand-amethyst" />
                <AlertDescription className="text-sm">
                  <div className="space-y-1">
                    <p className="font-semibold flex items-center gap-2">
                      Secure Payment Processing
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
                      <li>
                        Your payment information is securely stored and
                        encrypted by Stripe
                      </li>
                      <li>
                        Primary payment method is used for introduction requests
                        and referral payouts
                      </li>
                      <li>
                        Funds are held in escrow until milestones are completed
                      </li>
                      <li>You can manage your payment methods anytime</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!cardToRemove}
        onOpenChange={(open) => {
          if (!open && !isRemoving) setCardToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this payment method? This action
              cannot be undone.
              {paymentMethods.find((pm) => pm.id === cardToRemove)
                ?.isPrimary && (
                <p className="mt-2 font-semibold text-amber-600">
                  ⚠️ This is your primary payment method. Another card will be
                  automatically set as primary.
                </p>
              )}
            </AlertDialogDescription>
            {isRemoving && (
              <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Removing payment method...</span>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleRemoveCard}
              disabled={isRemoving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Card"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
