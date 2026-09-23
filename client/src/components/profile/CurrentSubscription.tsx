import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Crown,
  Loader2,
  Check,
  Calendar,
  CreditCard,
  ExternalLink,
  History,
} from "lucide-react";
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
import { formatLocalizedShortDate } from "@/utils/dateFormatter";
import { SubscriptionHistoryDialog } from "./SubscriptionHistoryDialog";
import type { AnyType } from "@/types/common";

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

export function CurrentSubscription() {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { toast } = useToast();
  const { data, error } = useQuery<CurrentSubscriptionData | null>({
    queryKey: ["/api/subscriptions/current"],
    queryFn: async () => {
      return api.subscriptions.getCurrentSubscription();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getFeatures = (features: AnyType): string[] => {
    if (!features) return [];
    let featureList: string[] = [];
    if (Array.isArray(features)) {
      featureList = features;
    } else if (typeof features === "object") {
      if (features.list && Array.isArray(features.list)) {
        featureList = features.list;
      } else if (features.features && Array.isArray(features.features)) {
        featureList = features.features;
      }
    }
    // Remove duplicates (case-insensitive) to avoid showing same info twice
    const seen = new Set<string>();
    return featureList.filter((feature) => {
      const normalized = feature.toLowerCase().trim();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  };

  const formatDate = (dateString: string): string => {
    return formatLocalizedShortDate(dateString);
  };

  const handleManageSubscription = async () => {
    try {
      setIsLoadingPortal(true);
      const response = await api.subscriptions.createPortalSession(
        window.location.href
      );
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error("No portal URL received");
      }
    } catch (error) {
      toast({
        title: "Failed to open subscription portal",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoadingPortal(false);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-center">
            Failed to load current subscription. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No active subscription found.
          </p>
        </CardContent>
      </Card>
    );
  }

  const features = getFeatures(data.plan.features);
  const isActive = data.status.toLowerCase() === "active";

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
              <Crown className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CardTitle className="text-lg sm:text-xl">
                  Current Subscription
                </CardTitle>
                <Badge className="border-0 bg-brand-gradient text-xs font-semibold text-white shadow-brand-cta">
                  {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                {data.plan.name}
                {data.plan.isDefault && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Default Plan
                  </Badge>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 w-full sm:w-auto justify-center sm:justify-start"
              onClick={() => setIsHistoryOpen(true)}
            >
              <History className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">Subscription History</span>
              <span className="sm:hidden">History</span>
            </Button>
            {!data.plan.isDefault && (
              <Button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                size="sm"
                className="flex-shrink-0 h-8 text-xs w-full sm:w-auto justify-center sm:justify-start bg-brand-gradient text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
              >
                {isLoadingPortal ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                    Manage
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        {/* Compact Plan Details */}
        <div className="space-y-3">
          {/* Billing Period - Compact Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  Current Period
                </p>
                <p className="text-xs font-semibold leading-tight break-words">
                  {formatDate(data.currentPeriodStart)} -{" "}
                  {formatDate(data.currentPeriodEnd)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  {isActive ? "Renews on" : "Expires on"}
                </p>
                <p className="text-xs font-semibold leading-tight break-words">
                  {formatDate(data.currentPeriodEnd)}
                </p>
              </div>
            </div>
          </div>

          {/* Cancel Warning - Compact */}
          {data.cancelAtPeriodEnd && (
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Your subscription will be canceled at the end of the current
                billing period.
              </p>
            </div>
          )}

          {/* Features List - Compact Grid */}
          {features.length > 0 && (
            <div className="pt-2 border-t">
              <h4 className="text-xs font-semibold mb-2 sm:mb-2.5 text-muted-foreground">
                Plan Features
              </h4>
              <div className="flex flex-col gap-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-1.5">
                    <Check className="h-3 w-3 text-brand-success mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground leading-relaxed break-words">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <SubscriptionHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />
    </Card>
  );
}
