import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  colorScheme?: "yellow" | "amber";
}

export function StarRating({
  rating,
  size = "md",
  showValue = false,
  colorScheme = "yellow",
}: StarRatingProps) {
  const sizeClasses = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };
  const colors = {
    yellow: {
      filled: "fill-yellow-400 text-yellow-400",
      empty: "text-gray-300",
    },
    amber: {
      filled: "fill-amber-400 text-amber-400",
      empty: "text-amber-200 dark:text-amber-700",
    },
  };

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => {
        const isFullStar = i < Math.floor(rating);
        const isHalfStar = i === Math.floor(rating) && rating % 1 >= 0.5;

        if (isFullStar) {
          return (
            <Star
              key={i}
              className={cn(sizeClasses[size], colors[colorScheme].filled)}
            />
          );
        }
        if (isHalfStar) {
          return (
            <div key={i} className="relative flex-shrink-0">
              <Star
                className={cn(sizeClasses[size], colors[colorScheme].empty)}
              />
              <div
                className="absolute inset-0 overflow-hidden w-[50%] z-10"
                aria-hidden="true"
              >
                <Star
                  className={cn(sizeClasses[size], colors[colorScheme].filled)}
                />
              </div>
            </div>
          );
        }
        return (
          <Star
            key={i}
            className={cn(sizeClasses[size], colors[colorScheme].empty)}
          />
        );
      })}
      {showValue && (
        <span className="text-sm font-medium ml-1">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
