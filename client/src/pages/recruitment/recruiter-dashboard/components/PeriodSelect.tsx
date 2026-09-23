import { useState } from "react";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DASHBOARD_PERIOD_OPTIONS, type DashboardPeriodValue } from "../types";
import {
  DASHBOARD_FILTER_TRIGGER_CLASS,
  DASHBOARD_FILTER_WIDTH_CLASS,
} from "./dashboardFilter.styles";

type PeriodSelectProps = {
  value: DashboardPeriodValue;
  onChange: (value: DashboardPeriodValue) => void;
  className?: string;
};

export function PeriodSelect({
  value,
  onChange,
  className,
}: PeriodSelectProps) {
  const [open, setOpen] = useState(false);
  const selected =
    DASHBOARD_PERIOD_OPTIONS.find((option) => option.value === value)?.label ??
    "Last 30 days";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            DASHBOARD_FILTER_TRIGGER_CLASS,
            DASHBOARD_FILTER_WIDTH_CLASS,
            className
          )}
          aria-label="Filter by date range"
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <Calendar
              className="h-4 w-4 shrink-0 text-brand-amethyst"
              aria-hidden
            />
            <span className="truncate">{selected}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="end">
        <div className="space-y-0.5">
          {DASHBOARD_PERIOD_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected &&
                    "bg-brand-rose/10 text-brand-rose hover:bg-brand-rose/10"
                )}
              >
                <span>{option.label}</span>
                {isSelected ? (
                  <Check className="h-4 w-4 text-brand-rose" />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
