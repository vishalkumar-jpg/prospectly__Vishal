import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  Loader2,
  CreditCard,
  Calendar,
  DollarSign,
} from "lucide-react";

interface ManageSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ManageSubscriptionModal = ({
  open,
  onOpenChange,
}: ManageSubscriptionModalProps) => {
  const [loading, setLoading] = useState(false);

  const handleOpenStripePortal = async () => {
    setLoading(true);

    // Simulate API call to create Stripe portal session
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate opening Stripe Customer Portal
    alert("Redirecting to Stripe Customer Portal...");
    window.open(
      "https://billing.stripe.com/p/session/test_portal_session",
      "_blank"
    );

    setLoading(false);
    onOpenChange(false);
  };

  const currentSubscription = {
    plan: "Starter",
    status: "Active",
    billingCycle: "Monthly",
    nextBilling: "February 15, 2024",
    amount: "$49.00",
    paymentMethod: "Visa •••• 4242",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Your Subscription</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Current Plan
                <Badge
                  variant="default"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {currentSubscription.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium">{currentSubscription.plan}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billing</p>
                  <p className="font-medium">
                    {currentSubscription.billingCycle}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Amount: {currentSubscription.amount}/month
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Next billing: {currentSubscription.nextBilling}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Payment: {currentSubscription.paymentMethod}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                What you can do in Stripe:
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Update payment method</li>
                <li>• Change billing address</li>
                <li>• Download invoices</li>
                <li>• Cancel subscription</li>
                <li>• Update billing cycle</li>
                <li>• View payment history</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Close
            </Button>
            <Button
              onClick={handleOpenStripePortal}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Stripe Portal
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageSubscriptionModal;
