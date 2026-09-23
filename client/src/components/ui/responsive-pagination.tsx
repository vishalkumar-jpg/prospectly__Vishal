import { Fragment } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Page-size options shared across all responsive layouts. */
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface RowsPerPageSelectProps {
  selectId: string;
  testId?: string;
  value: number;
  onValueChange: (value: string) => void;
  label?: string;
  labelClassName?: string;
  triggerClassName?: string;
}

/** Reusable "Rows per page" label + select, used by every layout. */
function RowsPerPageSelect({
  selectId,
  testId,
  value,
  onValueChange,
  label = "Rows per page:",
  labelClassName = "text-sm text-muted-foreground whitespace-nowrap",
  triggerClassName = "w-[70px] focus:ring-brand-amethyst/30",
}: RowsPerPageSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={selectId} className={labelClassName}>
        {label}
      </Label>
      <Select value={String(value)} onValueChange={onValueChange}>
        <SelectTrigger
          id={selectId}
          className={triggerClassName}
          data-testid={testId}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((option) => (
            <SelectItem
              key={option}
              value={String(option)}
              className="focus:bg-brand-amethyst/10 focus:text-brand-amethyst"
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ResponsivePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onItemsPerPageChange: (value: string) => void;
  itemLabel?: string;
  itemsPerPageSelectId?: string;
  itemsPerPageTestId?: string;
  prevTestId?: string;
  nextTestId?: string;
  pageTestIdPrefix?: string;
}

export function ResponsivePagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  startIndex,
  endIndex,
  onItemsPerPageChange,
  itemLabel = "items",
  itemsPerPageSelectId = "items-per-page",
  itemsPerPageTestId,
  prevTestId,
  nextTestId,
  pageTestIdPrefix = "button-page",
}: ResponsivePaginationProps) {
  const isPrevDisabled = currentPage <= 1 || totalPages === 0;
  const isNextDisabled = totalPages === 0 || currentPage >= totalPages;

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, i) => i + 1
  ).filter(
    (page) =>
      page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
  );

  return (
    <div className="px-3 sm:px-6 py-3 sm:py-4 border-t">
      {/* Mobile layout (< md): count on its own line, then rows-per-page + nav */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* Row 1: Showing count (centered, full width) */}
        <p className="text-center text-xs text-muted-foreground">
          Showing {startIndex + 1} to {endIndex} of {totalItems} {itemLabel}
        </p>

        {/* Row 2: Rows per page (left) + Prev / Page X of Y / Next (right) */}
        <div className="flex items-center justify-between gap-2">
          <RowsPerPageSelect
            selectId={itemsPerPageSelectId}
            testId={itemsPerPageTestId}
            value={itemsPerPage}
            onValueChange={onItemsPerPageChange}
            label="Rows:"
            labelClassName="text-xs text-muted-foreground whitespace-nowrap"
            triggerClassName="h-8 w-[64px] focus:ring-brand-amethyst/30"
          />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={isPrevDisabled}
              aria-label="Go to previous page"
              data-testid={prevTestId}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-foreground whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={isNextDisabled}
              aria-label="Go to next page"
              data-testid={nextTestId}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tablet layout (md–lg): simplified like mobile - two rows */}
      <div className="hidden md:flex lg:hidden flex-col gap-3">
        {/* Row 1: Showing + Rows per page */}
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Showing {startIndex + 1} to {endIndex} of {totalItems} {itemLabel}
          </span>
          <RowsPerPageSelect
            selectId={`${itemsPerPageSelectId}-tablet`}
            testId={itemsPerPageTestId}
            value={itemsPerPage}
            onValueChange={onItemsPerPageChange}
          />
        </div>

        {/* Row 2: Icon-only Prev / Page X of Y / icon-only Next */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={isPrevDisabled}
            aria-label="Go to previous page"
            data-testid={prevTestId}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={isNextDisabled}
            aria-label="Go to next page"
            data-testid={nextTestId}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Desktop layout (≥ lg): single row — Showing on left, Rows-per-page + nav on right */}
      <div className="hidden lg:flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {endIndex} of {totalItems} {itemLabel}
        </span>

        <div className="flex items-center gap-2 lg:gap-4">
          <RowsPerPageSelect
            selectId={`${itemsPerPageSelectId}-desktop`}
            testId={itemsPerPageTestId}
            value={itemsPerPage}
            onValueChange={onItemsPerPageChange}
          />

          {/* Full page-number nav */}
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className={cn(
                    isPrevDisabled
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                  )}
                  data-testid={prevTestId}
                />
              </PaginationItem>

              {pageNumbers.map((page, index, array) => (
                <Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => onPageChange(page)}
                      isActive={currentPage === page}
                      className={cn(
                        "cursor-pointer hover:bg-brand-amethyst/10 hover:text-brand-amethyst aria-[current=page]:border-transparent aria-[current=page]:bg-brand-gradient aria-[current=page]:text-brand-foreground aria-[current=page]:shadow-brand-cta aria-[current=page]:hover:text-brand-foreground"
                      )}
                      data-testid={`${pageTestIdPrefix}-${page}`}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                </Fragment>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  className={cn(
                    isNextDisabled
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                  )}
                  data-testid={nextTestId}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
