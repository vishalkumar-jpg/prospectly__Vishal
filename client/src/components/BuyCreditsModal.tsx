import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Zap, Star, Crown } from "lucide-react";

interface BuyCreditsModalProps {
  children?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

const creditPackages = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 900,
    price: 29,
    description: "Perfect for getting started",
    icon: Zap,
    popular: false,
  },
  {
    id: "professional",
    name: "Professional Pack",
    credits: 3000,
    price: 89,
    description: "Best value for professionals",
    icon: Star,
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise Pack",
    credits: 6000,
    price: 159,
    description: "For high-volume outreach",
    icon: Crown,
    popular: false,
  },
];

export const BuyCreditsModal = ({
  children,
  isOpen: controlledIsOpen,
  onClose,
}: BuyCreditsModalProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Use controlled state if provided, otherwise use internal state
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen =
    onClose !== undefined
      ? (value: boolean) => {
          if (!value) onClose();
        }
      : setInternalIsOpen;

  const handlePurchase = async (packageId: string) => {
    const pkg = creditPackages.find((p) => p.id === packageId);
    if (!pkg) return;

    setSelectedPackage(packageId);
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast({
      title: "Credits purchased successfully!",
      description: `${pkg.credits} credits have been added to your account.`,
    });

    setIsProcessing(false);
    setSelectedPackage(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Buy Credits
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {creditPackages.map((pkg) => {
            const Icon = pkg.icon;
            return (
              <Card
                key={pkg.id}
                className={`relative ${pkg.popular ? "ring-2 ring-primary" : ""}`}
              >
                {pkg.popular && (
                  <Badge
                    variant="default"
                    className="absolute -top-2 left-1/2 transform -translate-x-1/2"
                  >
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 p-2 rounded-full bg-primary/10 w-fit">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div>
                    <div className="text-3xl font-bold">
                      {pkg.credits.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Credits</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">${pkg.price}</div>
                    <div className="text-sm text-muted-foreground">
                      ${((pkg.price / pkg.credits) * 1000).toFixed(2)} per 1,000
                      credits
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={isProcessing}
                    variant={pkg.popular ? "default" : "outline"}
                  >
                    {isProcessing && selectedPackage === pkg.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      `Buy ${pkg.credits.toLocaleString()} Credits`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              • Credits are used for AI outreach (1 credit per email/LinkedIn
              action)
            </p>
            <p>• Meeting credits are consumed when meetings are booked</p>
            <p>• Credits never expire and can be used across all campaigns</p>
            <p>• Secure payment processing powered by Stripe</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
