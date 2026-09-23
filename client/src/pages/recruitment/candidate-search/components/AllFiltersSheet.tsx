import {
  useCallback,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCandidateSearchCount } from "@/hooks/useCandidateSearchCount";
import {
  cloneCriteria,
  type CandidateSearchCriteria,
} from "@/lib/recruitment/candidate-search.criteria";
import type { CandidateSearchFacets } from "@/lib/api/recruitment-candidate-search";
import { cn } from "@/lib/utils";

import { CommitFooter } from "./CommitFooter";
import { FilterFields } from "./FilterFields";
import type { Mutate } from "./filter-fields.shared";

export interface AllFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: CandidateSearchCriteria;
  onDraftChange: Dispatch<SetStateAction<CandidateSearchCriteria>>;
  onApply: () => void;
  onClear: () => void;
  facets?: CandidateSearchFacets;
  facetsLoading?: boolean;
  trigger: ReactNode;
}

export function AllFiltersSheet({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  onApply,
  onClear,
  facets,
  facetsLoading,
  trigger,
}: AllFiltersSheetProps) {
  const isMobile = useIsMobile();
  const { count, textCounted, loading, error } = useCandidateSearchCount(
    draft,
    open
  );

  const patch = useCallback(
    (mutate: Mutate) =>
      onDraftChange((prev) => {
        const next = cloneCriteria(prev);
        mutate(next);
        return next;
      }),
    [onDraftChange]
  );

  const body = (
    <div className="flex-1 overflow-y-auto px-5 pb-2">
      <FilterFields
        draft={draft}
        facets={facets}
        facetsLoading={facetsLoading}
        patch={patch}
      />
    </div>
  );

  const footer = (
    <CommitFooter
      count={count}
      textCounted={textCounted}
      loading={loading}
      failed={Boolean(error)}
      onClear={onClear}
      onApply={onApply}
    />
  );

  const reset = (
    <Button
      type="button"
      variant="link"
      onClick={onClear}
      className="ml-auto h-auto p-0 text-xs text-brand-rose"
    >
      Reset all
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[88vh]">
          <div className="flex items-center gap-2 px-5 pb-3 pt-4">
            <DrawerTitle className="text-lg font-semibold">
              All filters
            </DrawerTitle>
            {reset}
          </div>
          {body}
          {footer}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        overlayClassName="bg-[rgba(15,23,42,0.34)]"
        className={cn(
          "flex w-[min(440px,94vw)] max-w-none flex-col gap-0 p-0 sm:max-w-none",
          "ease-[cubic-bezier(.2,.7,.3,1)] data-[state=closed]:duration-[240ms] data-[state=open]:duration-[240ms]",
          "data-[state=open]:slide-in-from-right-[105%] data-[state=closed]:slide-out-to-right-[105%]",
          "motion-reduce:animate-none motion-reduce:transition-none"
        )}
        aria-describedby={undefined}
      >
        <div className="flex shrink-0 items-center gap-3 border-b px-5 py-4 pr-14">
          <SheetTitle className="text-lg font-semibold">All filters</SheetTitle>
          {reset}
        </div>
        {body}
        {footer}
      </SheetContent>
    </Sheet>
  );
}
