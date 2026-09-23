import React from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Award, MessageSquare, Loader2, Star, X } from "lucide-react";
import { LoadMoreLoader } from "@/components/ui/loader";
import { StarRating } from "@/components/shared/StarRating";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { useQuery } from "@tanstack/react-query";

interface Review {
  id?: string;
  rating: number;
  comments?: string;
  created_at: string;
  requester_name: string;
}

interface ReviewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectorName: string;
  trustScore: number;
  reviews?: Review[]; // Optional for backward compatibility
  stats?: {
    successfulIntros: number;
    completionRate: number;
    avgRating: number;
    totalReviews: number;
  };
  userId?: string; // New prop for dynamic fetching
}

export function ReviewsDialog({
  open,
  onOpenChange,
  connectorName,
  trustScore,
  reviews: staticReviews,
  stats: staticStats,
  userId,
}: ReviewsDialogProps) {
  // Fetch reviews dynamically if userId is provided
  const [currentPage, setCurrentPage] = React.useState(1);
  const [allReviews, setAllReviews] = React.useState<Review[]>([]);
  const limit = 10;
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const {
    data: reviewsData,
    isLoading: isLoadingReviews,
    isFetching: isFetchingReviews,
    refetch: refetchReviews,
  } = useQuery<{
    reviews: Review[];
    totalReviews: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    avgRating?: number;
  }>({
    queryKey: [
      `/api/introduction-requests/reviews/${userId}`,
      { page: currentPage, limit },
    ],
    enabled: !!userId && open,
    staleTime: 30 * 1000,
  });

  // Reset when dialog opens/closes or userId changes
  React.useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setCurrentPage(1);
      setAllReviews([]);
    } else if (open && userId) {
      // Reset to page 1 when dialog opens
      setCurrentPage(1);
      setAllReviews([]);
      // Refetch to ensure fresh data
      refetchReviews();
    }
  }, [open, userId, refetchReviews]);

  // Update allReviews when new data arrives
  React.useEffect(() => {
    if (reviewsData?.reviews && open) {
      if (currentPage === 1) {
        // Replace all reviews when on page 1
        setAllReviews(reviewsData.reviews);
      } else {
        // Append reviews when loading more pages
        setAllReviews((prev) => {
          // Helper function to generate dedupe key: prefer id, otherwise composite key
          const getDedupeKey = (r: Review) => {
            if (r.id) {
              return r.id;
            }
            return `${r.requester_name}-${r.created_at}`;
          };

          // Build existing keys from previous reviews using the same key logic
          const existingKeys = new Set(prev.map((r) => getDedupeKey(r)));

          // Filter reviews to only include those with non-empty dedupe key not in existingKeys
          const newReviews = reviewsData.reviews.filter((r) => {
            const key = getDedupeKey(r);
            return key && !existingKeys.has(key);
          });

          return [...prev, ...newReviews];
        });
      }
    }
  }, [reviewsData, currentPage, open]);

  // Use dynamic data if userId is provided, otherwise use static props
  const reviews = userId ? allReviews : staticReviews || [];
  const stats =
    userId && reviewsData
      ? {
          // Use API-provided avgRating and totalReviews
          avgRating: reviewsData.avgRating ?? 0,
          totalReviews: reviewsData.totalReviews,
          // Prefer staticStats for successfulIntros and completionRate if available
          // (these require introduction request data, not available from reviews API)
          successfulIntros: staticStats?.successfulIntros ?? 0,
          completionRate: staticStats?.completionRate ?? 0,
        }
      : staticStats || {
          successfulIntros: 0,
          completionRate: 0,
          avgRating: 0,
          totalReviews: 0,
        };

  // Determine current state
  const isInitialLoading =
    isLoadingReviews && currentPage === 1 && reviewsData === undefined;
  const hasReviews = reviews.length > 0;
  const isEmpty =
    !hasReviews && !isInitialLoading && (reviewsData !== undefined || !userId);

  // Infinite scroll handler
  const handleScroll = React.useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (
        !scrollAreaRef.current ||
        !userId ||
        !reviewsData?.hasNextPage ||
        isFetchingReviews
      ) {
        return;
      }

      // Find the viewport element (Radix ScrollArea viewport)
      // Try multiple selectors to find the viewport
      const viewport =
        (scrollAreaRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) as HTMLElement) ||
        (scrollAreaRef.current.querySelector(
          ".h-full.w-full"
        ) as HTMLElement) ||
        (scrollAreaRef.current.firstElementChild as HTMLElement);

      if (!viewport) return;

      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      // Load more when scrolled to 80% of the content
      if (scrollPercentage >= 0.8) {
        setCurrentPage((prev) => prev + 1);
      }
    }, 100); // Debounce scroll events
  }, [userId, reviewsData?.hasNextPage, isFetchingReviews]);

  // Attach scroll listener
  React.useEffect(() => {
    if (!scrollAreaRef.current || !open) return;

    let viewport: HTMLElement | null = null;

    // Use a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      // Try multiple selectors to find the viewport
      viewport =
        (scrollAreaRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) as HTMLElement) ||
        (scrollAreaRef.current?.querySelector(
          ".h-full.w-full"
        ) as HTMLElement) ||
        (scrollAreaRef.current?.firstElementChild as HTMLElement);

      if (viewport) {
        viewport.addEventListener("scroll", handleScroll, { passive: true });
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (viewport) {
        viewport.removeEventListener("scroll", handleScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, open]);

  const reviewCount =
    stats.totalReviews > 0 ? stats.totalReviews : reviews.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] min-h-0 max-w-2xl flex-col overflow-hidden overflow-x-hidden !gap-0 !p-0"
        mobileFullscreen
        hideCloseButton
      >
        {/* Gradient hero header band */}
        <div className="relative flex-shrink-0 overflow-hidden bg-brand-hero-gradient px-5 py-5 text-brand-foreground sm:px-7 sm:py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
              <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-brand-foreground/20 bg-brand-foreground/15">
                <Award className="h-5 w-5 text-brand-foreground" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="break-words text-lg font-bold leading-tight text-brand-foreground sm:text-xl">
                  {connectorName}'s Trust Profile
                </DialogTitle>
                <DialogDescription className="mt-1 break-words text-xs text-brand-foreground/90 sm:text-sm">
                  Verified performance metrics and reviews from past
                  introductions
                </DialogDescription>
              </div>
            </div>
            <DialogClose className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-brand-foreground/25 bg-brand-foreground/15 text-brand-foreground transition-colors hover:bg-brand-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/70">
              <X className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </div>

        {/* Full-screen loading state */}
        {isInitialLoading ? (
          <div className="flex min-h-[40vh] flex-1 items-center justify-center p-5 sm:p-7">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-base font-medium text-muted-foreground">
                Loading reviews...
              </p>
            </div>
          </div>
        ) : isEmpty ? (
          /* Full-screen empty state */
          <div className="flex min-h-[40vh] flex-1 items-center justify-center p-5 sm:p-7">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-base font-medium text-muted-foreground">
                No reviews yet
              </p>
            </div>
          </div>
        ) : (
          /* Populated state: hero score card + section label + reviews list */
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-5 sm:gap-5 sm:p-7">
            {/* Hero score card */}
            {hasReviews && (
              <div className="grid flex-shrink-0 grid-cols-1 items-center gap-4 rounded-2xl border border-brand-amethyst/15 bg-gradient-to-br from-brand-amethyst/[0.08] to-brand-rose/[0.05] p-5 text-center sm:grid-cols-[auto_1fr_auto] sm:gap-5 sm:p-6 sm:text-left">
                {/* Gold star icon box */}
                <div className="mx-auto grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-star-gradient text-brand-foreground shadow-lg sm:mx-0">
                  <Star className="h-6 w-6 fill-current" strokeWidth={0} />
                </div>

                {/* Average rating */}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Average Rating
                  </p>
                  <div className="mt-1 flex items-baseline justify-center gap-2 sm:justify-start">
                    <span className="text-brand-gradient text-4xl font-extrabold leading-none">
                      {stats.avgRating.toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      / 5.0
                    </span>
                  </div>
                  <div className="mt-2 flex justify-center sm:justify-start">
                    <StarRating
                      rating={stats.avgRating}
                      size="lg"
                      colorScheme="yellow"
                    />
                  </div>
                </div>

                {/* Total reviews */}
                <div className="flex-shrink-0 border-t border-brand-amethyst/15 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Reviews
                  </p>
                  <p className="mt-1 text-3xl font-extrabold leading-none text-foreground">
                    {stats.totalReviews}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {stats.totalReviews === 1
                      ? "verified review"
                      : "verified reviews"}
                  </p>
                </div>
              </div>
            )}

            {/* Section label */}
            {hasReviews && (
              <div className="flex flex-shrink-0 items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5 text-brand-amethyst" />
                Recent Reviews ({reviewCount})
              </div>
            )}

            {/* Scrollable Reviews Section */}
            <ScrollArea
              ref={scrollAreaRef}
              className="-mr-2 min-h-0 flex-1 pr-2 sm:h-[36vh] sm:flex-none"
            >
              <div className="space-y-2.5 sm:space-y-3">
                {reviews.map((review, idx) => (
                  <div
                    key={review.id || idx}
                    className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand-amethyst/20"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-foreground">
                        {review.requester_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground sm:text-xs">
                        • {formatLocalizedShortDateTime(review.created_at)}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand-star/10 px-2.5 py-1 text-xs font-bold text-brand-star">
                        <Star
                          className="h-3 w-3 fill-current"
                          strokeWidth={0}
                        />
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    {review.comments && (
                      <p className="break-words text-sm leading-relaxed text-foreground/80">
                        {review.comments}
                      </p>
                    )}
                  </div>
                ))}
                {/* Loading indicator for infinite scroll */}
                {userId && isFetchingReviews && reviewsData?.hasNextPage && (
                  <LoadMoreLoader className="py-4" />
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
