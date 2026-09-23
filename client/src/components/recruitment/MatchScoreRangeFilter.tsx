import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MatchScoreRangeOptions } from "./MatchScoreRangeOptions";
import { getMatchScoreRangeTriggerLabel } from "@/lib/recruitment/match-score-range-filter.utils";

interface MatchScoreRangeFilterProps {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

export function MatchScoreRangeFilter({
  value,
  onChange,
  className,
}: MatchScoreRangeFilterProps) {
  const isAllSelected = value.length === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-[260px] shrink-0 items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm ring-offset-background transition-all",
            "hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !isAllSelected && "text-foreground",
            className
          )}
          aria-label="Filter by match score"
        >
          <span className="truncate">
            {getMatchScoreRangeTriggerLabel(value)}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[260px] p-2" align="end">
        <MatchScoreRangeOptions
          value={value}
          onChange={onChange}
          scrollAreaClassName="max-h-[200px]"
        />
      </PopoverContent>
    </Popover>
  );
}
