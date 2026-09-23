import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, Receipt } from "lucide-react";

interface ArchiveCardActionsProps {
  onOpenFinance: () => void;
  onOpenDetails: () => void;
}

const BUTTON_CLASS =
  "h-9 px-4 rounded-xl border border-border bg-card text-foreground font-semibold transition-colors hover:bg-brand-amethyst/10 hover:text-brand-amethyst hover:border-brand-amethyst/20 active:scale-[0.98] w-full sm:w-auto";

export function ArchiveCardActions({
  onOpenFinance,
  onOpenDetails,
}: ArchiveCardActionsProps) {
  return (
    <div
      className="mt-4 pt-4 border-t border-dashed border-border flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3"
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenFinance();
            }}
            className={BUTTON_CLASS}
            aria-label="View transactions"
          >
            <Receipt className="h-4 w-4" />
            <span className="text-[12.5px]">Finance</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>View transactions</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            className={BUTTON_CLASS}
            aria-label="View details"
          >
            <Eye className="h-4 w-4" />
            <span className="text-[12.5px]">Details</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>View details</TooltipContent>
      </Tooltip>
    </div>
  );
}
