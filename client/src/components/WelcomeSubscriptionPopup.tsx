import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Check, Loader2, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { AnyType } from "@/types/common";
import { Loader } from "./ui/loader";

interface WelcomeSubscriptionPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CurrentSubscriptionData {
  id: string;
  plan: {
    id: string;
    name: string;
    description: string;
    features: AnyType;
    isDefault: boolean;
  };
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
}

const PRIMARY_CTA_CLASS =
  "bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: {
    id: string;
    price: string;
    stripePriceId: string;
  } | null;
  yearlyPrice: {
    id: string;
    price: string;
    stripePriceId: string;
  } | null;
  features: AnyType;
  isDefault: boolean;
}

export function WelcomeSubscriptionPopup({
  isOpen,
  onClose,
}: WelcomeSubscriptionPopupProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [isMarkingSeen, setIsMarkingSeen] = useState(false);

  const { data: currentSubscription, isLoading: isLoadingSubscription } =
    useQuery<CurrentSubscriptionData | null>({
      queryKey: ["/api/subscriptions/current"],
      queryFn: async () => {
        return api.subscriptions.getCurrentSubscription();
      },
      enabled: isOpen,
      staleTime: 5 * 60 * 1000,
    });

  const { data: plansData, isLoading: isLoadingPlans } = useQuery<{
    plans: SubscriptionPlan[];
  }>({
    queryKey: ["/api/subscriptions/plans"],
    queryFn: async () => {
      return api.subscriptions.getPlans();
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const getFeatures = (features: AnyType): string[] => {
    if (!features) return [];
    if (Array.isArray(features)) return features;
    if (typeof features === "object") {
      if (features.list && Array.isArray(features.list)) {
        return features.list;
      }
      if (features.features && Array.isArray(features.features)) {
        return features.features;
      }
    }
    return [];
  };

  const handleMarkAsSeen = async () => {
    try {
      setIsMarkingSeen(true);
      await api.profiles.markWelcomePopupSeen();
      await refreshUser();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMarkingSeen(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setIsMarkingSeen(true);
      await api.profiles.markWelcomePopupSeen();
      await refreshUser();
      navigate("/profile/subscriptions");
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMarkingSeen(false);
    }
  };

  const handleSkip = async () => {
    await handleMarkAsSeen();
  };

  const handleClose = async () => {
    // When user clicks X button or presses ESC, mark as seen before closing
    if (!isMarkingSeen) {
      await handleMarkAsSeen();
    }
  };

  const isLoading = isLoadingSubscription || isLoadingPlans;
  const currentPlan = currentSubscription?.plan;
  const isFreePlan = currentPlan?.isDefault || !currentSubscription;
  const availablePlans = plansData?.plans || [];
  const upgradePlans = availablePlans.filter((plan) => !plan.isDefault);

  // Get first few features to display
  const planFeatures = currentPlan
    ? getFeatures(currentPlan.features).slice(0, 3)
    : [];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // When dialog tries to close (open becomes false), mark as seen
        if (!open && !isMarkingSeen) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="max-w-[calc(100vw-2rem)] sm:max-w-[600px] p-0 overflow-hidden [&>button]:hidden max-h-[85vh] overflow-y-auto"
        onInteractOutside={(e) => {
          // Prevent closing by clicking outside, require explicit action
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Allow ESC to close, but mark as seen first
          if (!isMarkingSeen) {
            e.preventDefault();
            handleClose();
          }
        }}
      >
        <div className="relative">
          <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-5 text-brand-foreground sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              disabled={isMarkingSeen}
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg border-0 bg-brand-foreground/15 p-0 text-brand-foreground shadow-none transition-colors hover:bg-brand-foreground/25 hover:text-brand-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/60 disabled:pointer-events-none disabled:opacity-50"
            >
              {isMarkingSeen ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span className="sr-only">Close</span>
            </button>
            <div className="relative flex items-start gap-3 pr-9 sm:gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-foreground/20 backdrop-blur sm:h-11 sm:w-11">
                <Crown className="h-5 w-5 text-brand-warning" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-left text-lg font-extrabold tracking-tight text-brand-foreground sm:text-2xl">
                  Welcome to Prospectly!
                </DialogTitle>
                <DialogDescription className="mt-1 text-left text-xs leading-relaxed text-brand-foreground/90 sm:text-sm">
                  Let's get you set up with the perfect plan
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader />
              </div>
            ) : (
              <>
                {/* Current Plan Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Your Current Plan
                    </h3>
                    {currentPlan && (
                      <Badge
                        variant={isFreePlan ? "secondary" : "default"}
                        className="text-xs"
                      >
                        {isFreePlan ? "Free" : "Active"}
                      </Badge>
                    )}
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <h4 className="font-semibold text-lg">
                          {currentPlan?.name || "Free Plan"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {currentPlan?.description ||
                            "Get started with our free plan"}
                        </p>
                        {planFeatures.length > 0 && (
                          <ul className="space-y-1.5 mt-3">
                            {planFeatures.map((feature, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2 text-sm"
                              >
                                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">
                                  {String(feature)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upgrade Section */}
                {isFreePlan && upgradePlans.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Upgrade to Unlock More
                      </h3>
                    </div>
                    <div className="rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Upgrade to access premium features, more credits, and
                        enhanced capabilities.
                      </p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-purple-600" />
                          More introduction requests
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-purple-600" />
                          Priority support
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isMarkingSeen || isLoading}
                className="flex-1"
              >
                {isMarkingSeen ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : isFreePlan ? (
                  "Continue with Free"
                ) : (
                  "Get Started"
                )}
              </Button>
              <Button
                onClick={handleUpgrade}
                disabled={isMarkingSeen || isLoading}
                className={cn("flex-1", PRIMARY_CTA_CLASS)}
              >
                {isMarkingSeen ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    {isFreePlan ? "Upgrade Plan" : "View Plans"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
