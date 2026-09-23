import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ShareDealData } from "./ShareDealPopover";
import {
  type MarketplaceDeal,
  CardHeader,
  CardBountySection,
  CardActionFooter,
} from "./marketplace-card";
import { UserOrganizationsSection } from "@/components/shared/UserOrganizationsSection";

export type { MarketplaceDeal } from "./marketplace-card";

interface MarketplaceCardProps {
  deal: MarketplaceDeal;
  shareData?: ShareDealData;
  onShareClick?: (
    dealId: string,
    platform: "facebook" | "twitter" | "linkedin" | "copy"
  ) => Promise<{ sharerCode: string; shareUrl: string } | null>;
  className?: string;
}

export function MarketplaceCard({
  deal,
  shareData,
  onShareClick,
  className,
}: MarketplaceCardProps) {
  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand-card",
        className
      )}
    >
      <CardContent className="flex flex-1 flex-col p-0">
        <CardHeader deal={deal} />
        {deal.contactOrganizations && deal.contactOrganizations.length > 0 && (
          <div className="border-b border-border/60 px-4 pb-3 pt-0 sm:px-5 lg:px-6">
            <UserOrganizationsSection
              organizations={deal.contactOrganizations}
            />
          </div>
        )}
        <CardBountySection bountyAmount={deal.bountyAmount} />
        <CardActionFooter
          linkedinUrl={deal.prospect.linkedinUrl}
          interestedCount={deal.interestedCount}
          viewsCount={deal.viewsCount}
          shareData={shareData}
          onShareClick={onShareClick}
        />
      </CardContent>
    </Card>
  );
}

export default MarketplaceCard;
