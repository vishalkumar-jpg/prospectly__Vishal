import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import {
  MarketplaceCard,
  type MarketplaceDeal,
} from "@/components/marketplace";

interface BrowseDealsTabProps {
  filteredDeals: MarketplaceDeal[];
  isLoading: boolean;
  error?: unknown;
  refetch?: () => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  isDealShared: (dealId: string) => boolean;
  onShareClick: (
    dealId: string,
    platform: "facebook" | "twitter" | "linkedin" | "copy"
  ) => Promise<{ sharerCode: string; shareUrl: string } | null>;
  getSharerCode: (dealId: string) => string;
  totalDeals: number;
}

const GRID_CLASSES =
  "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6";

export function BrowseDealsTab({
  filteredDeals,
  isLoading,
  error,
  refetch,
  hasActiveFilters,
  clearFilters,
  isDealShared,
  onShareClick,
  getSharerCode,
  totalDeals,
}: BrowseDealsTabProps) {
  return (
    <div>
      {(totalDeals > 0 || isLoading) && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {filteredDeals.length}
              </span>{" "}
              {filteredDeals.length === 1 ? "deal" : "deals"}
              {hasActiveFilters && " (filtered)"}
            </span>
          </div>
        </div>
      )}

      {/* Deal Cards Grid */}
      {isLoading ? (
        <div className={GRID_CLASSES}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState refetch={refetch} />
      ) : filteredDeals.length === 0 ? (
        <EmptyState
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
        />
      ) : (
        <div className={GRID_CLASSES}>
          {filteredDeals.map((deal) => (
            <MarketplaceCard
              key={deal.id}
              deal={{ ...deal, isSharedByUser: isDealShared(deal.id) }}
              shareData={{
                dealId: deal.id,
                sharerCode: getSharerCode(deal.id),
                prospectName: deal.prospect.name,
                prospectCompany: deal.prospect.company,
                bountyAmount: deal.bountyAmount,
                meetingTitle: deal.meetingAgenda.title,
              }}
              onShareClick={onShareClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  hasActiveFilters,
  clearFilters,
}: {
  hasActiveFilters: boolean;
  clearFilters: () => void;
}) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
        <Search className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-xl font-bold">No introduction requests found</h3>
      <p className="mx-auto mb-6 max-w-md text-muted-foreground">
        {hasActiveFilters
          ? "Try adjusting your filters to discover more opportunities."
          : "New introduction requests are posted regularly. Check back soon for fresh opportunities!"}
      </p>
      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Clear All Filters
        </Button>
      )}
    </Card>
  );
}

function ErrorState({ refetch }: { refetch?: () => void }) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-destructive/10 text-brand-destructive">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-xl font-bold">Something went wrong</h3>
      <p className="mx-auto mb-6 max-w-md text-muted-foreground">
        Failed to load opportunities. Please try again.
      </p>
      {refetch && (
        <Button variant="outline" onClick={refetch} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </Card>
  );
}
