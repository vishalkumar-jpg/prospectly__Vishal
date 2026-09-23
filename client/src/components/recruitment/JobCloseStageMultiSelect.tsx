import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  JOB_CLOSE_INDIVIDUAL_STAGE_KEYS,
  JOB_CLOSE_INDIVIDUAL_STAGE_OPTIONS,
  JOB_CLOSE_NOTIFY_ALL_STAGES,
  areAllJobCloseStagesSelected,
  areSomeJobCloseStagesSelected,
  getJobCloseStageTriggerLabel,
} from "@/lib/job-close-notification.constants";

interface JobCloseStageMultiSelectProps {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function JobCloseStageMultiSelect({
  id,
  value,
  onChange,
  disabled = false,
  className,
}: JobCloseStageMultiSelectProps) {
  const allSelected = areAllJobCloseStagesSelected(value);
  const someSelected = areSomeJobCloseStagesSelected(value);

  const handleToggleAll = (checked: boolean) => {
    onChange(checked ? [...JOB_CLOSE_INDIVIDUAL_STAGE_KEYS] : []);
  };

  const handleToggleStage = (stageId: string, checked: boolean) => {
    const withoutAll = value.filter((id) => id !== JOB_CLOSE_NOTIFY_ALL_STAGES);
    if (checked) {
      onChange([...withoutAll, stageId]);
      return;
    }
    onChange(withoutAll.filter((id) => id !== stageId));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between rounded-lg border-border bg-background px-3 text-sm font-normal",
            value.length > 0 && "text-foreground",
            className
          )}
        >
          <span className="min-w-0 truncate text-left">
            {getJobCloseStageTriggerLabel(value)}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
        <div className="space-y-0.5">
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/60">
            <Checkbox
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
              onCheckedChange={(checked) => handleToggleAll(checked === true)}
              disabled={disabled}
              aria-label="All Stages"
            />
            <span className="text-sm font-medium text-foreground">
              All Stages
            </span>
          </label>
          <div className="my-1 border-t border-border/60" />
          {JOB_CLOSE_INDIVIDUAL_STAGE_OPTIONS.map((stage) => (
            <label
              key={stage.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/60"
            >
              <Checkbox
                checked={value.includes(stage.id)}
                onCheckedChange={(checked) =>
                  handleToggleStage(stage.id, checked === true)
                }
                disabled={disabled}
                aria-label={stage.label}
              />
              <span className="text-sm text-foreground">{stage.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
