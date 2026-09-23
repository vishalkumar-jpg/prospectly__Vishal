import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpendingTablePaginationProps {
  page: number;
  limit: number;
  /** Counts jobs, not charges — the table pages one job group at a time. */
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const WINDOW_SIZE = 5;

function getPageWindow(page: number, totalPages: number): number[] {
  const size = Math.min(WINDOW_SIZE, totalPages || 1);
  return Array.from({ length: size }, (_, index) => {
    if (totalPages <= WINDOW_SIZE) return index + 1;
    if (page <= 3) return index + 1;
    if (page >= totalPages - 2) return totalPages - 4 + index;
    return page - 2 + index;
  });
}

export function SpendingTablePagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: SpendingTablePaginationProps) {
  const firstItem = total === 0 ? 0 : (page - 1) * limit + 1;

  return (
    <div className="flex flex-col items-center justify-between gap-4 px-1 pt-2 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing <b className="font-semibold text-foreground">{firstItem}</b> to{" "}
        <b className="font-semibold text-foreground">
          {Math.min(page * limit, total)}
        </b>{" "}
        of <b className="font-semibold text-foreground">{total}</b> jobs
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Previous</span>
        </Button>
        <div className="flex items-center gap-1 px-2">
          {getPageWindow(page, totalPages).map((pageNumber) => (
            <Button
              key={pageNumber}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                page === pageNumber
                  ? "border-transparent bg-brand-gradient text-brand-foreground shadow-brand-cta hover:text-brand-foreground"
                  : "hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
              )}
              onClick={() => onPageChange(pageNumber)}
              aria-label={`Go to page ${pageNumber}`}
              aria-current={page === pageNumber ? "page" : undefined}
            >
              {pageNumber}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <span className="mr-1 hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
