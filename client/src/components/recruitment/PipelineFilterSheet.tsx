import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MatchScoreRangeOptions } from "@/components/recruitment/MatchScoreRangeOptions";
import { cn } from "@/lib/utils";

export interface PipelineFilterStage {
  id: string;
  label: string;
  color: string;
}

interface PipelineFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchScoreRanges: string[];
  onMatchScoreRangesChange: (next: string[]) => void;
  /** Every board stage, including ones currently filtered out. */
  stages: PipelineFilterStage[];
  /** Selected stage keys. Empty means "All Stages". */
  selectedStages: string[];
  onSelectedStagesChange: (next: string[]) => void;
  getStageCount: (stageId: string) => number;
  onClearAll: () => void;
}

const GROUP_HEADING =
  "text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground";

/**
 * Filters live behind a single toolbar button rather than sitting inline: the
 * board's toolbar also carries Back, resume search and Refresh, and the two
 * filter controls were the widest things on it while being the least used.
 *
 * Fully controlled — every value and setter comes from the page, so toggles
 * apply to the board immediately rather than waiting for an Apply step. The
 * per-stage counts are the feedback for that, since the panel covers part of
 * the board it is filtering.
 */
export function PipelineFilterSheet({
  open,
  onOpenChange,
  matchScoreRanges,
  onMatchScoreRangesChange,
  stages,
  selectedStages,
  onSelectedStagesChange,
  getStageCount,
  onClearAll,
}: PipelineFilterSheetProps) {
  const hasActiveFilters =
    matchScoreRanges.length > 0 || selectedStages.length > 0;

  const handleToggleStage = (stageId: string, checked: boolean) => {
    onSelectedStagesChange(
      checked
        ? [...selectedStages, stageId]
        : selectedStages.filter((id) => id !== stageId)
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow the candidates shown on the board.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className={GROUP_HEADING}>Match score</h3>
              {matchScoreRanges.length > 0 && (
                <span className="text-xs font-semibold text-brand-amethyst">
                  {matchScoreRanges.length} selected
                </span>
              )}
            </div>
            <MatchScoreRangeOptions
              value={matchScoreRanges}
              onChange={onMatchScoreRangesChange}
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className={GROUP_HEADING}>Pipeline stages</h3>
              {selectedStages.length > 0 && (
                <span className="text-xs font-semibold text-brand-amethyst">
                  {selectedStages.length} selected
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="flex w-max cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/60">
                <Checkbox
                  checked={selectedStages.length === 0}
                  onCheckedChange={(checked) =>
                    checked && onSelectedStagesChange([])
                  }
                />
                <span className="whitespace-nowrap text-sm text-foreground">
                  All Stages
                </span>
              </label>

              <div className="border-t border-border/60 pt-1">
                {stages.map((stage) => (
                  <label
                    key={stage.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={selectedStages.includes(stage.id)}
                      onCheckedChange={(checked) =>
                        handleToggleStage(stage.id, checked === true)
                      }
                    />
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        stage.color
                      )}
                      aria-hidden
                    />
                    <span className="flex-1 text-sm text-foreground">
                      {stage.label}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {getStageCount(stage.id)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* A plain div, not SheetFooter, so this matches the footer every other
            dialog on this board uses — SheetFooter's own sm:space-x-2 would
            stack on top of the gap. */}
        <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-border bg-background px-6 py-4 max-sm:[&>button]:flex-1">
          <Button
            variant="outline"
            onClick={onClearAll}
            disabled={!hasActiveFilters}
          >
            Clear all
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
