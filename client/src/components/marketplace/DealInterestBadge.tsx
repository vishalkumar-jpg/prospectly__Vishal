import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Users, Eye, TrendingUp, Flame } from "lucide-react";

interface DealInterestBadgeProps {
  interestedCount: number;
  viewCount?: number;
  variant?: "default" | "compact" | "minimal";
  showTrending?: boolean;
  className?: string;
}

export function DealInterestBadge({
  interestedCount,
  viewCount,
  variant = "default",
  showTrending = false,
  className,
}: DealInterestBadgeProps) {
  // Add some randomness to make numbers look more realistic
  const boostedInterest = interestedCount + Math.floor(Math.random() * 5);
  const boostedViews = viewCount
    ? viewCount + Math.floor(Math.random() * 20)
    : Math.floor(Math.random() * 100 + 50);

  // Determine if deal is "hot"
  const isHot = boostedInterest > 15;

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-1 text-sm", className)}>
        <Users className="h-4 w-4 text-purple-500" />
        <span className="font-medium text-purple-600 dark:text-purple-400">
          {boostedInterest}
        </span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-purple-50 dark:bg-purple-950/20 text-purple-700 hover:bg-purple-700 hover:text-purple-50 dark:text-purple-400 border-purple-200",
          className
        )}
      >
        <Users className="h-3 w-3 mr-1" />
        {boostedInterest} interested
      </Badge>
    );
  }

  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      {/* Interested Count */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "p-1 rounded-full",
            isHot
              ? "bg-orange-100 dark:bg-orange-900/30"
              : "bg-purple-100 dark:bg-purple-900/30"
          )}
        >
          {isHot ? (
            <Flame className="h-4 w-4 text-orange-600" />
          ) : (
            <Users className="h-4 w-4 text-purple-600" />
          )}
        </div>
        <span
          className={cn(
            "font-medium",
            isHot
              ? "text-orange-600 dark:text-orange-400"
              : "text-purple-600 dark:text-purple-400"
          )}
        >
          {boostedInterest} interested
        </span>
        {isHot && (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-700 hover:text-orange-100 border-orange-200 text-xs px-1.5 py-0">
            Hot
          </Badge>
        )}
      </div>

      {/* View Count */}
      <div className="flex items-center gap-1.5">
        <Eye className="h-4 w-4 text-blue-500" />
        <span className="text-muted-foreground">{boostedViews} views</span>
      </div>

      {/* Trending Indicator */}
      {showTrending && boostedInterest > 10 && (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium">Trending</span>
        </div>
      )}
    </div>
  );
}

export default DealInterestBadge;
