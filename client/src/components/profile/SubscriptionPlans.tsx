import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Check, Flame } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { toUTC } from "@/lib/dayjs";
import type { AnyType } from "@/types/common";

interface SubscriptionPlanPrice {
  id: string;
  price: string;
  stripePriceId: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: SubscriptionPlanPrice | null;
  yearlyPrice: SubscriptionPlanPrice | null;
  features: AnyType;
  isDefault: boolean;
}

interface SubscriptionPlansResponse {
  plans: SubscriptionPlan[];
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
  priceId?: string;
  interval?: string;
  amount?: string;
}

const formatPrice = (price: string | null): string => {
  if (!price) return "N/A";
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numPrice);
};

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

const extractCredits = (
  description: string,
  features: AnyType
): string | null => {
  const creditsMatch = description.match(/(\d{1,3}(?:,\d{3})*)\s*credits\/mo/i);
  if (creditsMatch) {
    return `${creditsMatch[1]} credits/mo`;
  }

  const featureList = getFeatures(features);
  for (const feature of featureList) {
    const match = String(feature).match(/(\d{1,3}(?:,\d{3})*)\s*credits\/mo/i);
    if (match) {
      return `${match[1]} credits/mo`;
    }
  }

  return null;
};

type PlanActionButtonProps = {
  planId: string;
  isDefault: boolean;
  hasSelectedPrice: boolean;
  isPopular: boolean;
  isCurrent: boolean;
  isUpgrading: boolean;
  onUpgrade: (planId: string) => void;
};

function PlanActionButton({
  planId,
  isDefault,
  hasSelectedPrice,
  isPopular,
  isCurrent,
  isUpgrading,
  onUpgrade,
}: PlanActionButtonProps) {
  if (isCurrent) {
    return (
      <Badge
        variant="secondary"
        className="w-full justify-center py-2 sm:py-2.5 text-xs sm:text-sm font-semibold"
      >
        Active Plan
      </Badge>
    );
  }

  if (isDefault) {
    return <div className="w-full py-2 sm:py-2.5"></div>;
  }

  if (hasSelectedPrice) {
    return (
      <Button
        onClick={() => onUpgrade(planId)}
        disabled={isUpgrading}
        className={`w-full text-xs sm:text-sm transition-all ${
          isPopular
            ? "bg-brand-gradient text-white shadow-brand-cta hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
            : "border-brand-amethyst text-brand-amethyst hover:bg-brand-amethyst hover:text-white"
        }`}
        variant={isPopular ? "default" : "outline"}
      >
        {isUpgrading ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Subscribe"
        )}
      </Button>
    );
  }

  return (
    <Button disabled className="w-full text-xs sm:text-sm" variant="outline">
      Pricing not available
    </Button>
  );
}

type SubscriptionPlanCardProps = {
  plan: SubscriptionPlan;
  index: number;
  isYearly: boolean;
  upgradingPlanId: string | null;
  checkIsCurrentPlan: (
    planId: string,
    isYearlyView: boolean,
    isDefaultPlan: boolean
  ) => boolean;
  onUpgrade: (planId: string) => void;
};

function SubscriptionPlanCard({
  plan,
  index,
  isYearly,
  upgradingPlanId,
  checkIsCurrentPlan,
  onUpgrade,
}: SubscriptionPlanCardProps) {
  const selectedPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  const features = getFeatures(plan.features);
  const credits = extractCredits(plan.description, plan.features);
  const isPopular = index === 1;
  const isCurrent = checkIsCurrentPlan(plan.id, isYearly, plan.isDefault);

  return (
    <Card
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isPopular
          ? "border-brand-amethyst shadow-brand-card"
          : "border-border hover:-translate-y-0.5 hover:border-brand-amethyst/50 hover:shadow-brand-card"
      }`}
    >
      {isPopular && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
          <Badge className="bg-brand-gradient text-white shadow-brand-cta rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs">
            <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
            Popular
          </Badge>
        </div>
      )}

      <CardHeader className="relative z-10 pb-3 p-4 lg:p-6">
        <div className="space-y-1">
          <CardTitle
            className={`text-xl sm:text-2xl font-extrabold ${
              isPopular ? "text-brand-amethyst" : "text-foreground"
            }`}
          >
            {plan.name}
          </CardTitle>
          {credits && (
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {credits}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4 sm:space-y-6 p-4 lg:p-6 pt-0">
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold">
              {selectedPrice ? formatPrice(selectedPrice.price) : "N/A"}
            </span>
            {selectedPrice && (
              <span className="text-muted-foreground text-sm sm:text-base ml-1">
                /{isYearly ? "Annually" : "Monthly"}
              </span>
            )}
          </div>
          {!selectedPrice && (
            <p className="text-sm text-muted-foreground">
              {isYearly
                ? "Yearly pricing not available"
                : "Monthly pricing not available"}
            </p>
          )}
        </div>

        <div className="space-y-2 min-h-[44px] flex items-end">
          <PlanActionButton
            planId={plan.id}
            isDefault={plan.isDefault}
            hasSelectedPrice={Boolean(selectedPrice)}
            isPopular={isPopular}
            isCurrent={isCurrent}
            isUpgrading={upgradingPlanId === plan.id}
            onUpgrade={onUpgrade}
          />
        </div>

        {features.length > 0 && (
          <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t">
            <h4 className="font-semibold text-xs sm:text-sm text-foreground">
              What you will get
            </h4>
            <ul className="space-y-2 sm:space-y-2.5">
              {features.map((feature: string, featureIndex: number) => (
                <li
                  key={featureIndex}
                  className="flex items-start gap-2 sm:gap-2.5"
                >
                  <Check
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0 ${
                      isPopular ? "text-brand-amethyst" : "text-brand-success"
                    }`}
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SubscriptionPlans() {
  const [isYearly, setIsYearly] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [, setIsSyncing] = useState(false);

  useEffect(() => {
    const upgradeStatus = searchParams.get("upgrade");
    if (upgradeStatus === "success") {
      const syncSubscription = async () => {
        setIsSyncing(true);
        try {
          await api.subscriptions.sync();
          await queryClient.invalidateQueries({
            queryKey: ["/api/subscriptions/current"],
          });
          toast({
            title: "Subscription Updated",
            description: "Your subscription has been successfully updated.",
          });
          // Remove the query param
          navigate("/profile/subscriptions", {
            replace: true,
          });
        } catch {
          toast({
            title: "Sync Failed",
            description: "Failed to sync your subscription. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsSyncing(false);
        }
      };

      syncSubscription();
    }
  }, [searchParams, queryClient, navigate, toast]);

  const { data, error } = useQuery<SubscriptionPlansResponse>({
    queryKey: ["/api/subscriptions/plans"],
    queryFn: async () => {
      return api.subscriptions.getPlans();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: currentSubscription } =
    useQuery<CurrentSubscriptionData | null>({
      queryKey: ["/api/subscriptions/current"],
      queryFn: async () => {
        return api.subscriptions.getCurrentSubscription();
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

  const calculateSavings = (
    monthlyPrice: string | null,
    yearlyPrice: string | null
  ): number | null => {
    if (!monthlyPrice || !yearlyPrice) return null;
    const monthly = parseFloat(monthlyPrice);
    const yearly = parseFloat(yearlyPrice);
    if (isNaN(monthly) || isNaN(yearly) || monthly === 0) return null;
    const yearlyEquivalent = monthly * 12;
    const savings = ((yearlyEquivalent - yearly) / yearlyEquivalent) * 100;
    return Math.round(savings);
  };

  // Determine the billing interval of the current subscription
  const getCurrentSubscriptionInterval = (): "month" | "year" | null => {
    if (!currentSubscription) return null;

    // Use backend provided interval if available
    if (currentSubscription.interval) {
      if (currentSubscription.interval === "month") return "month";
      if (currentSubscription.interval === "year") return "year";
    }

    const start = toUTC(currentSubscription.currentPeriodStart);
    const end = toUTC(currentSubscription.currentPeriodEnd);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Yearly subscriptions are typically 365 days (allow 360-370 for variance)
    if (diffDays >= 360 && diffDays <= 370) {
      return "year";
    }
    // Monthly subscriptions are typically 28-31 days
    if (diffDays >= 28 && diffDays <= 31) {
      return "month";
    }

    return null;
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setUpgradingPlanId(planId);
      const interval = isYearly ? "year" : "month";
      const response = await api.subscriptions.createUpgradePortalSession(
        planId,
        interval
      );
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error("No portal URL received");
      }
    } catch (error) {
      toast({
        title: "Failed to open upgrade portal",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred. Please try again.",
        variant: "destructive",
      });
      setUpgradingPlanId(null);
    }
  };

  const isCurrentPlan = (
    planId: string,
    isYearlyView: boolean,
    isDefaultPlan: boolean
  ): boolean => {
    if (!currentSubscription || currentSubscription.plan.id !== planId) {
      return false;
    }

    // Special case: Free/default plan shows "Active Plan" in both monthly and yearly views
    if (isDefaultPlan && currentSubscription.plan.isDefault) {
      return true;
    }

    const currentInterval = getCurrentSubscriptionInterval();
    if (!currentInterval) {
      // If we can't determine interval, default to monthly check
      return !isYearlyView;
    }

    // Match both plan ID and interval
    const viewInterval = isYearlyView ? "year" : "month";
    return currentInterval === viewInterval;
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-center">
            Failed to load subscription plans. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const plans = data?.plans || [];

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No subscription plans available at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate maximum savings percentage across all plans
  const maxSavings = Math.max(
    ...plans
      .map((plan) =>
        calculateSavings(
          plan.monthlyPrice?.price || null,
          plan.yearlyPrice?.price || null
        )
      )
      .filter((savings): savings is number => savings !== null),
    0
  );

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border p-4 lg:p-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-extrabold tracking-tight sm:text-xl">
              Subscription Plans
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Choose the perfect plan for your needs. Switch between monthly and
              yearly billing.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 sm:space-y-8 p-4 lg:p-6">
        {/* Price Toggle Switch */}
        <div className="flex flex-col items-center gap-4 pb-4">
          <div className="relative inline-flex w-full items-center gap-1 rounded-xl border border-border bg-muted p-[3px] sm:w-auto">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`relative w-full flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-xs font-semibold transition-all sm:min-w-[160px] sm:text-sm ${
                !isYearly
                  ? "bg-card text-brand-amethyst shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`relative w-full flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-xs font-semibold transition-all sm:min-w-[160px] sm:text-sm ${
                isYearly
                  ? "bg-card text-brand-amethyst shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annually
              {maxSavings > 0 && (
                <span className="ml-1 sm:ml-1.5 text-[10px] sm:text-xs font-bold text-brand-success">
                  ({maxSavings}% off)
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <SubscriptionPlanCard
              key={plan.id}
              plan={plan}
              index={index}
              isYearly={isYearly}
              upgradingPlanId={upgradingPlanId}
              checkIsCurrentPlan={isCurrentPlan}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
