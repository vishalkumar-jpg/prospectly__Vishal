import { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Check, ChevronDown } from "lucide-react";

interface SearchableSelectProps {
  value: string;
  onValueChange: (v: string) => void;
  items: Array<{ id: number | string; name: string }>;
  loading?: boolean;
  placeholder: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (search: string) => void;
  error?: string;
  disabled?: boolean;
  showSearch?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  items,
  loading,
  placeholder,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  error,
  disabled,
  showSearch = true,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((i) => String(i.id) === value);

  const latestOnSearchChangeRef = useRef(onSearchChange);

  useEffect(() => {
    latestOnSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  // Clear search on close if search is controlled
  useEffect(() => {
    if (!open && latestOnSearchChangeRef.current) {
      latestOnSearchChangeRef.current("");
    }
  }, [open]);

  return (
    <div className={cn("w-full", className)}>
      <Popover
        open={disabled ? false : open}
        onOpenChange={(next) => {
          if (!disabled) setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between h-10 bg-white border-slate-300 hover:bg-white hover:text-black hover:border-slate-400 font-normal px-3",
              error && "border-red-500 hover:border-red-500",
              disabled && "opacity-60"
            )}
          >
            {loading && !items.length ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : selectedItem ? (
              <span className="truncate flex-1 text-left">
                {selectedItem.name}
              </span>
            ) : (
              <span className="text-muted-foreground truncate flex-1 text-left">
                {placeholder}
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command shouldFilter={!onSearchChange}>
            {showSearch && (
              <CommandInput
                placeholder={searchPlaceholder}
                value={searchValue}
                onValueChange={onSearchChange}
              />
            )}
            <CommandList className="dropdown-scroll">
              <CommandEmpty>
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  </div>
                ) : (
                  "No results found."
                )}
              </CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={String(item.id)}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue);
                      setOpen(false);
                    }}
                    className="group flex items-center gap-2 px-2 py-2"
                  >
                    <div className="flex-shrink-0 w-4 flex items-center justify-center">
                      <Check
                        className={cn(
                          "h-4 w-4 transition-colors",
                          value === String(item.id)
                            ? "opacity-100 text-brand-amethyst"
                            : "opacity-0"
                        )}
                      />
                    </div>
                    <span className="truncate flex-1 text-sm">{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
