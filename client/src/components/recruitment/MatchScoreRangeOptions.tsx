import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { RECRUITMENT_MATCH_SCORE_RANGE_OPTIONS } from "@/lib/recruitment/match-score-range-filter.utils";

interface MatchScoreRangeOptionsProps {
  /** Selected range keys. Empty means "All Match Scores". */
  value: string[];
  onChange: (next: string[]) => void;
  /**
   * Caps the decile grid and lets it scroll. Set by the popover, which has no
   * vertical room; omitted in the filter drawer, where the list can breathe.
   */
  scrollAreaClassName?: string;
  className?: string;
}

/**
 * The match-score checkbox list, shared by the toolbar popover
 * (MatchScoreRangeFilter) and the pipeline filter drawer, so the two surfaces
 * can never drift apart.
 */
export function MatchScoreRangeOptions({
  value,
  onChange,
  scrollAreaClassName,
  className,
}: MatchScoreRangeOptionsProps) {
  const isAllSelected = value.length === 0;

  const handleToggleRange = (range: string, checked: boolean) => {
    if (checked) {
      onChange([...value, range]);
      return;
    }
    onChange(value.filter((item) => item !== range));
  };

  const grid = (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
      {RECRUITMENT_MATCH_SCORE_RANGE_OPTIONS.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-2 hover:bg-muted/60"
        >
          <Checkbox
            checked={value.includes(option.value)}
            onCheckedChange={(nextChecked) =>
              handleToggleRange(option.value, nextChecked === true)
            }
          />
          <span className="whitespace-nowrap text-sm text-foreground">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );

  return (
    <div className={cn("space-y-1", className)}>
      <label className="flex w-max cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/60">
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={(checked) => checked && onChange([])}
        />
        <span className="whitespace-nowrap text-sm text-foreground">
          All Match Scores
        </span>
      </label>

      <div className="border-t border-border/60 pt-1">
        {scrollAreaClassName ? (
          <ScrollArea className={scrollAreaClassName}>{grid}</ScrollArea>
        ) : (
          grid
        )}
      </div>
    </div>
  );
}
