import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CANDIDATE_SEARCH_PAGE_SIZES } from "@/lib/recruitment/candidate-search.criteria";

export interface CandidateSearchPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/** First page, last page, and the current page's neighbours. */
function pageWindow(page: number, totalPages: number): number[] {
  return Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (candidate) =>
      candidate === 1 ||
      candidate === totalPages ||
      Math.abs(candidate - page) <= 1
  );
}

export function CandidateSearchPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: CandidateSearchPaginationProps) {
  // Hidden entirely when everything fits one page (§9.5).
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = pageWindow(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-3">
      <span className="text-xs tabular-nums text-muted-foreground">
        Showing {from}–{to} of {total.toLocaleString()}
      </span>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="candidate-search-rows"
            className="whitespace-nowrap text-xs text-muted-foreground"
          >
            Rows per page
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              id="candidate-search-rows"
              className="h-8 w-[72px] text-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CANDIDATE_SEARCH_PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav className="flex items-center gap-1" aria-label="Pagination">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pages.map((value, index) => (
            <span key={value} className="flex items-center gap-1">
              {index > 0 && pages[index - 1] !== value - 1 ? (
                <span
                  className="px-1 text-xs text-muted-foreground"
                  aria-hidden
                >
                  …
                </span>
              ) : null}
              <Button
                variant={value === page ? "brand" : "outline"}
                size="icon"
                className="h-8 w-8 text-xs tabular-nums transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
                aria-current={value === page ? "page" : undefined}
                aria-label={`Page ${value}`}
                onClick={() => onPageChange(value)}
              >
                {value}
              </Button>
            </span>
          ))}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
