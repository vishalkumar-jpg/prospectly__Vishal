import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Zap } from "lucide-react";

interface MarketplaceQuickFiltersProps {
  urgencyFilter: string[];
  setUrgencyFilter: (filter: string[]) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

export function MarketplaceQuickFilters({
  urgencyFilter,
  setUrgencyFilter,
  sortBy,
  setSortBy,
}: MarketplaceQuickFiltersProps) {
  const toggleUrgent = () => {
    if (urgencyFilter.includes("urgent")) {
      setUrgencyFilter(urgencyFilter.filter((u) => u !== "urgent"));
    } else {
      setUrgencyFilter([...urgencyFilter, "urgent"]);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Badge
        variant={urgencyFilter.includes("urgent") ? "default" : "outline"}
        className="cursor-pointer hover:bg-primary/90 transition-colors"
        onClick={toggleUrgent}
      >
        <Clock className="h-3 w-3 mr-1" />
        Ending Soon
      </Badge>
      <Badge
        variant={sortBy === "bounty-high" ? "default" : "outline"}
        className="cursor-pointer hover:bg-primary/90 transition-colors"
        onClick={() => setSortBy("bounty-high")}
      >
        <TrendingUp className="h-3 w-3 mr-1" />
        Top Referral Payout
      </Badge>
      <Badge
        variant={sortBy === "interest" ? "default" : "outline"}
        className="cursor-pointer hover:bg-primary/90 transition-colors"
        onClick={() => setSortBy("interest")}
      >
        <Zap className="h-3 w-3 mr-1" />
        Most Interest
      </Badge>
    </div>
  );
}
