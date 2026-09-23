import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { RouteSearchInput } from "@/components/ui/route-search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface FinanceFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /**
   * Primary filters (e.g. status) — shown inline on the right of the search row
   * on desktop. Rendered again inside the mobile Sheet, so controls must be
   * fully controlled by the parent.
   */
  renderInlineFilters?: () => ReactNode;
  /**
   * Secondary filters (e.g. date range) — shown on their own row below the
   * search on desktop, and inside the mobile Sheet.
   */
  renderSecondaryFilters?: () => ReactNode;
  activeFilterCount?: number;
  className?: string;
}

export function FinanceFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  renderInlineFilters,
  renderSecondaryFilters,
  activeFilterCount = 0,
  className,
}: FinanceFilterBarProps) {
  const [open, setOpen] = useState(false);
  const hasFilters = Boolean(renderInlineFilters || renderSecondaryFilters);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2 lg:gap-3">
        <RouteSearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1"
          inputClassName="bg-background"
        />

        {/* Mobile-only trigger */}
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            className="h-10 shrink-0 gap-2 rounded-xl transition-colors hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-0.5 rounded-full border-0 bg-brand-amethyst/10 px-1.5 py-0 text-[11px] font-bold text-brand-amethyst"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}

        {/* Desktop: primary filters inline, right side */}
        {renderInlineFilters && (
          <div className="hidden shrink-0 items-center gap-3 lg:flex lg:flex-wrap lg:justify-end">
            {renderInlineFilters()}
          </div>
        )}
      </div>

      {/* Desktop: secondary filters (e.g. date) on a second line */}
      {renderSecondaryFilters && (
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          {renderSecondaryFilters()}
        </div>
      )}

      {/* Mobile: all filters in a left Sheet */}
      {hasFilters && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-[320px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-5">
              {renderInlineFilters?.()}
              {renderSecondaryFilters?.()}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
