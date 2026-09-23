import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CandidateSearchSort } from "@/lib/recruitment/candidate-search.criteria";
import type { SortDirection } from "./ResultsToolbar";

export interface SortableColumnHeadProps {
  label: string;
  sortKey: CandidateSearchSort;
  activeSort: CandidateSearchSort;
  sortDir: SortDirection;
  onSort: (sort: CandidateSearchSort) => void;
  className?: string;
}

export function SortableColumnHead({
  label,
  sortKey,
  activeSort,
  sortDir,
  onSort,
  className,
}: SortableColumnHeadProps) {
  const isActive = activeSort === sortKey;
  const SortIcon = !isActive
    ? ArrowUpDown
    : sortDir === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <TableHead
      scope="col"
      className={className}
      aria-sort={
        isActive ? (sortDir === "asc" ? "ascending" : "descending") : undefined
      }
    >
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-auto gap-1 p-0 text-[10px] uppercase tracking-wider font-bold text-muted-foreground",
          "hover:bg-transparent hover:text-foreground",
          isActive && "text-foreground"
        )}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <SortIcon
          className={cn("h-3 w-3", isActive ? "text-primary" : "opacity-40")}
          aria-hidden
        />
      </Button>
    </TableHead>
  );
}
