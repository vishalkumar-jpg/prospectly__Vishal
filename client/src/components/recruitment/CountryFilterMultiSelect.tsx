import { ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PAYOUT_COUNTRIES } from "@/lib/stripe-connect";
import {
  COUNTRY_FILTER_CODES,
  COUNTRY_FILTER_NONE,
  areAllCountriesSelected,
  areSomeCountriesSelected,
  getCountryFilterTriggerLabel,
  isCountryFilterNone,
  isCountrySelectedInFilter,
  normalizeCountryFilterSelection,
} from "@/lib/recruitment/country-filter.utils";

interface CountryFilterMultiSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

export function CountryFilterMultiSelect({
  value,
  onChange,
  className,
}: CountryFilterMultiSelectProps) {
  const noneSelected = isCountryFilterNone(value);
  const allSelected = areAllCountriesSelected(value);
  const someSelected = areSomeCountriesSelected(value);

  const handleToggleAll = (checked: boolean) => {
    onChange(checked ? [] : [COUNTRY_FILTER_NONE]);
  };

  const handleToggle = (code: string, checked: boolean) => {
    if (noneSelected) {
      if (checked) onChange([code]);
      return;
    }

    if (allSelected) {
      if (!checked) {
        // From "all", uncheck one country — keep every other country selected.
        onChange(
          normalizeCountryFilterSelection(
            COUNTRY_FILTER_CODES.filter((item) => item !== code)
          )
        );
      }
      return;
    }

    const next = checked
      ? [...value, code]
      : value.filter((item) => item !== code);

    onChange(normalizeCountryFilterSelection(next));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-10 w-full min-w-0 justify-between rounded-xl border-border bg-card px-3 text-sm font-medium shadow-sm sm:w-[220px] sm:shrink-0",
            "hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst",
            (someSelected || noneSelected) && "text-foreground",
            className
          )}
          aria-label="Filter by country"
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <Globe
              className="h-4 w-4 shrink-0 text-brand-amethyst"
              aria-hidden
            />
            <span className="truncate">
              {getCountryFilterTriggerLabel(value)}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="end">
        <div className="space-y-1">
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50">
            <Checkbox
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
              onCheckedChange={(checked) => handleToggleAll(checked === true)}
              aria-label="All countries"
            />
            <span className="text-sm font-medium text-foreground">
              All Countries
            </span>
          </label>
          <div className="border-t border-border/60 pt-1">
            <div className="space-y-0.5">
              {PAYOUT_COUNTRIES.map((country) => (
                <label
                  key={country.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={isCountrySelectedInFilter(value, country.value)}
                    onCheckedChange={(nextChecked) =>
                      handleToggle(country.value, nextChecked === true)
                    }
                    aria-label={country.label}
                  />
                  <span className="truncate text-sm text-foreground">
                    {country.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
