import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, RefreshCcw, Sparkles } from "lucide-react";
import { SharedDealCard, type SharedDeal } from "./my-shared-deals";

// Re-export types for backwards compatibility
export type { SharedDeal } from "./my-shared-deals";

interface MySharedDealsTabProps {
  sharedDeals: SharedDeal[];
  onReshare: (deal: SharedDeal) => void;
  isLoading?: boolean;
}

export function MySharedDealsTab({
  sharedDeals,
  onReshare,
  isLoading = false,
}: MySharedDealsTabProps) {
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <RefreshCcw className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm text-muted-foreground">
            Loading your shared introduction requests...
          </p>
        </div>
      </div>
    );
  }

  if (sharedDeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 -m-4"></div>
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
            <Share2 className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-2 text-foreground text-center">
          No shared introduction requests yet
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Share introduction requests from the Browse tab to start earning{" "}
          <span className="font-semibold text-amber-600">
            50% of referral payout
          </span>{" "}
          when your network claims and completes introductions.
        </p>
        <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md">
          <Sparkles className="h-4 w-4 mr-2" />
          Browse Opportunities to Share
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {sharedDeals.map((deal) => (
          <SharedDealCard
            key={deal.id}
            deal={deal}
            isExpanded={expandedDeal === deal.id}
            onToggleExpand={() =>
              setExpandedDeal(expandedDeal === deal.id ? null : deal.id)
            }
          />
        ))}
      </div>
    </div>
  );
}

export default MySharedDealsTab;
