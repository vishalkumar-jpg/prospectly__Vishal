import { Star } from "lucide-react";
import { StarRating } from "@/components/shared/StarRating";

interface FeedbackStatsCardProps {
  stats: {
    averageRating: number;
    totalCount: number;
    ratingDistribution: { [rating: number]: number };
  };
}

export function FeedbackStatsCard({ stats }: FeedbackStatsCardProps) {
  // Calculate percentage for each rating
  const getRatingPercentage = (rating: number) => {
    if (stats.totalCount === 0) return 0;
    return ((stats.ratingDistribution[rating] || 0) / stats.totalCount) * 100;
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-4 sm:p-5">
      <h4 className="mb-4 text-sm font-extrabold tracking-tight text-foreground">
        Peer Feedback Summary
      </h4>

      {/* Average Rating */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Average Rating
          </p>
          <div className="flex flex-wrap items-baseline gap-2">
            <StarRating
              rating={stats.averageRating}
              size="lg"
              colorScheme="yellow"
            />
            <span className="text-2xl font-extrabold tracking-tight text-foreground">
              {stats.averageRating.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/ 5.0</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold leading-none text-foreground">
            {stats.totalCount}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {stats.totalCount === 1 ? "Review" : "Reviews"}
          </p>
        </div>
      </div>

      {/* Rating Distribution */}
      {stats.totalCount > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-muted-foreground">
            Rating Distribution
          </p>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating] || 0;
            const percentage = getRatingPercentage(rating);
            return (
              <div key={rating} className="flex items-center gap-2.5">
                <div className="flex min-w-[24px] items-center gap-1 text-xs font-bold text-foreground">
                  <span>{rating}</span>
                  <Star className="h-3 w-3 fill-brand-warning text-brand-warning" />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-brand-warning transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="min-w-[54px] text-right text-[11px] tabular-nums text-muted-foreground">
                  {count} ({percentage.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      )}

      {stats.totalCount === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No feedback received yet
        </p>
      )}
    </div>
  );
}
