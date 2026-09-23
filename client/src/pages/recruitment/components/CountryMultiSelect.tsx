import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PAYOUT_COUNTRIES } from "@/lib/stripe-connect";

interface CountryMultiSelectProps {
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
  hasError?: boolean;
}

function countryLabel(code: string): string {
  return PAYOUT_COUNTRIES.find((c) => c.value === code)?.label ?? code;
}

/**
 * Searchable multi-select of supported payout countries (US, IN, PH, MX, ZA).
 */
export default function CountryMultiSelect({
  value,
  onChange,
  disabled,
  hasError,
}: CountryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [...PAYOUT_COUNTRIES];
    return PAYOUT_COUNTRIES.filter(
      (c) =>
        c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q)
    );
  }, [search]);

  const toggle = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code));
    } else {
      onChange([...value, code]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-12 w-full justify-between font-normal",
              hasError && "border-destructive focus:border-destructive"
            )}
          >
            <span className="text-slate-600">
              {value.length > 0
                ? `${value.length} countr${value.length > 1 ? "ies" : "y"} selected`
                : "Select country"}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search country…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No countries found.</CommandEmpty>
              <CommandGroup>
                {filtered.map((country) => {
                  const selected = value.includes(country.value);
                  return (
                    <CommandItem
                      key={country.value}
                      value={country.value}
                      onSelect={() => toggle(country.value)}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{country.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {country.value}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((code) => (
            <Badge
              key={code}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              <span className="truncate max-w-[180px]">
                {countryLabel(code)}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  className="rounded-full p-0.5 hover:bg-slate-300/60"
                  aria-label={`Remove ${countryLabel(code)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
