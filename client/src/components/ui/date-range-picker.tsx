import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import { subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { formatDateRange, formatDateForPicker } from "@/utils/dateFormatting";
import { toUTC } from "@/lib/dayjs";

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type DatePreset =
  | "all"
  | "last7days"
  | "last30days"
  | "last3months"
  | "lastyear"
  | "custom";

export interface DateRangeValue {
  preset: DatePreset;
  startDate?: Date;
  endDate?: Date;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
  showPresets?: boolean;
  presetButtonSize?: "sm" | "default";
  testIdPrefix?: string;
}

const PRESETS: {
  value: DatePreset;
  label: string;
  getRange: () => { from: Date; to: Date } | null;
}[] = [
  {
    value: "all",
    label: "All Time",
    getRange: () => null,
  },
  {
    value: "last7days",
    label: "Last 7 Days",
    getRange: () => ({
      from: startOfDay(subDays(toUTC(), 6)),
      to: endOfDay(toUTC()),
    }),
  },
  {
    value: "last30days",
    label: "Last 30 Days",
    getRange: () => ({
      from: startOfDay(subDays(toUTC(), 29)),
      to: endOfDay(toUTC()),
    }),
  },
  {
    value: "last3months",
    label: "Last 3 Months",
    getRange: () => ({
      from: startOfDay(subMonths(toUTC(), 3)),
      to: endOfDay(toUTC()),
    }),
  },
  {
    value: "lastyear",
    label: "Last Year",
    getRange: () => ({
      from: startOfDay(subYears(toUTC(), 1)),
      to: endOfDay(toUTC()),
    }),
  },
];

function formatDateRangeDisplay(startDate?: Date, endDate?: Date): string {
  if (!startDate) return "Select dates";
  if (!endDate || startDate.toDateString() === endDate.toDateString()) {
    return formatDateForPicker(startDate);
  }
  return formatDateRange(startDate, endDate);
}

export function DateRangePicker({
  value,
  onChange,
  className,
  showPresets = true,
  presetButtonSize = "sm",
  testIdPrefix = "date",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(
    value.startDate ? { from: value.startDate, to: value.endDate } : undefined
  );

  useEffect(() => {
    if (value.startDate) {
      setTempRange({ from: value.startDate, to: value.endDate });
    } else {
      setTempRange(undefined);
    }
  }, [value.startDate, value.endDate]);

  const handlePresetClick = (preset: DatePreset) => {
    const presetConfig = PRESETS.find((p) => p.value === preset);
    if (presetConfig) {
      const range = presetConfig.getRange();
      onChange({
        preset,
        startDate: range?.from,
        endDate: range?.to,
      });
    }
  };

  const handleApply = () => {
    if (tempRange?.from) {
      onChange({
        preset: "custom",
        startDate: tempRange.from,
        endDate: tempRange.to || tempRange.from,
      });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange({ preset: "all" });
    setTempRange(undefined);
  };

  const getDisplayLabel = () => {
    if (value.preset === "custom" && value.startDate) {
      return formatDateRangeDisplay(value.startDate, value.endDate);
    }
    return PRESETS.find((p) => p.value === value.preset)?.label || "All Time";
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {showPresets && (
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant="outline"
              size={presetButtonSize}
              className={cn(
                "rounded-lg",
                presetButtonSize === "sm" ? "h-7 text-xs" : "h-8 text-sm",
                value.preset === preset.value &&
                  "border-transparent bg-brand-amethyst text-brand-foreground hover:bg-brand-amethyst/90 hover:text-brand-foreground"
              )}
              onClick={() => handlePresetClick(preset.value)}
              data-testid={`button-${testIdPrefix}-${preset.value}`}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size={presetButtonSize}
            className={cn(
              "gap-1.5 rounded-lg font-normal",
              presetButtonSize === "sm" ? "h-7 text-xs" : "h-8 text-sm",
              value.preset === "custom" &&
                "min-w-[140px] border-transparent bg-brand-amethyst text-brand-foreground hover:bg-brand-amethyst/90 hover:text-brand-foreground"
            )}
            data-testid={`button-${testIdPrefix}-custom`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>
              {value.preset === "custom" ? getDisplayLabel() : "Custom"}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 shadow-lg border bg-popover"
          align="start"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
        >
          <div className="p-2.5">
            <div className="mb-2">
              <h4 className="font-semibold text-xs">Select Date Range</h4>
              <p className="text-[11px] text-muted-foreground">
                Click a start date, then an end date
              </p>
            </div>

            <div className="rounded-lg border bg-card p-1.5 mb-2.5">
              <Calendar
                mode="range"
                selected={tempRange}
                onSelect={setTempRange}
                numberOfMonths={1}
                disabled={(date) => date > toUTC()}
                defaultMonth={tempRange?.from || toUTC()}
                classNames={{
                  months:
                    "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-1.5",
                  caption:
                    "flex justify-center pt-0.5 relative items-center h-7",
                  caption_label: "text-xs font-semibold",
                  nav: "space-x-1 flex items-center",
                  nav_button: cn(
                    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                    "h-6 w-6 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                  ),
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse",
                  head_row: "flex",
                  head_cell:
                    "text-muted-foreground w-7 font-semibold text-[0.6rem] uppercase tracking-wider h-6 flex items-center justify-center",
                  row: "flex w-full mt-0.5",
                  cell: cn(
                    "relative p-0 text-center text-xs focus-within:relative focus-within:z-20 h-7 w-7",
                    "[&:has([aria-selected])]:bg-brand-amethyst/10",
                    "[&:has(.day-range-start)]:rounded-l-lg [&:has(.day-range-end)]:rounded-r-lg",
                    "[&:has([aria-selected].day-outside)]:bg-brand-amethyst/5",
                    "first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg"
                  ),
                  day: cn(
                    "inline-flex items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    "h-7 w-7 p-0 aria-selected:opacity-100",
                    "hover:bg-brand-amethyst/20 hover:text-brand-amethyst",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst/40",
                    "disabled:pointer-events-none disabled:opacity-40"
                  ),
                  day_range_start:
                    "day-range-start rounded-lg bg-brand-gradient font-extrabold text-brand-foreground shadow-brand-cta hover:bg-brand-gradient hover:text-brand-foreground focus:bg-brand-gradient focus:text-brand-foreground",
                  day_range_end:
                    "day-range-end rounded-lg bg-brand-gradient font-extrabold text-brand-foreground shadow-brand-cta hover:bg-brand-gradient hover:text-brand-foreground focus:bg-brand-gradient focus:text-brand-foreground",
                  day_selected: "font-extrabold",
                  day_today:
                    "rounded-lg border border-brand-amethyst/40 font-bold text-brand-amethyst",
                  day_outside:
                    "day-outside text-muted-foreground opacity-50 aria-selected:bg-brand-amethyst/5 aria-selected:text-muted-foreground",
                  day_disabled:
                    "text-muted-foreground opacity-40 cursor-not-allowed",
                  day_range_middle:
                    "aria-selected:bg-transparent aria-selected:text-brand-amethyst aria-selected:rounded-none",
                  day_hidden: "invisible",
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTempRange(
                    value.startDate
                      ? { from: value.startDate, to: value.endDate }
                      : undefined
                  );
                  setIsOpen(false);
                }}
                className="h-7 px-2.5 text-xs text-muted-foreground"
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                {tempRange?.from && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTempRange(undefined)}
                    className="h-7 px-2.5 text-xs"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={!tempRange?.from}
                  className="h-7 rounded-lg px-3 text-xs bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
                >
                  Apply Range
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {value.preset !== "all" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          data-testid={`button-clear-${testIdPrefix}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function useDateRangeFilter(initialPreset: DatePreset = "all") {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: initialPreset,
  });

  const getQueryParams = () => {
    return {
      datePreset: dateRange.preset,
      startDate: dateRange.startDate
        ? toLocalDateString(dateRange.startDate)
        : undefined,
      endDate: dateRange.endDate
        ? toLocalDateString(dateRange.endDate)
        : undefined,
    };
  };

  const reset = () => {
    setDateRange({ preset: "all" });
  };

  return {
    value: dateRange,
    onChange: setDateRange,
    getQueryParams,
    reset,
    isFiltered: dateRange.preset !== "all",
  };
}
