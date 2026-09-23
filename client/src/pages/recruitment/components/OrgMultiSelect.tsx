import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOrganisations } from "@/hooks/useJobNotifications";

interface OrgMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * Searchable multi-select of active organisations. Search is server-side
 * (debounced), and each option shows the org's active-member count so the
 * recruiter can make an informed selection.
 */
export default function OrgMultiSelect({
  value,
  onChange,
  disabled,
}: OrgMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { organisations, loading } = useOrganisations(debouncedSearch);

  // id -> name cache so selected badges keep their label even after the
  // search results change and no longer include the selected org.
  const [nameCache, setNameCache] = useState<Record<string, string>>({});
  useEffect(() => {
    if (organisations.length === 0) return;
    setNameCache((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const org of organisations) {
        if (next[org.id] !== org.name) {
          next[org.id] = org.name;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [organisations]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
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
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <Building2 className="h-4 w-4" />
              {value.length > 0
                ? `${value.length} Organization${value.length > 1 ? "s" : ""} selected`
                : "Select Organization…"}
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
              placeholder="Search Organization…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading…
                </div>
              ) : (
                <>
                  <CommandEmpty>No organizations found.</CommandEmpty>
                  <CommandGroup>
                    {organisations.map((org) => {
                      const selected = value.includes(org.id);
                      return (
                        <CommandItem
                          key={org.id}
                          value={org.id}
                          onSelect={() => toggle(org.id)}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0",
                                selected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{org.name}</span>
                          </span>
                          <span className="text-xs text-slate-500 shrink-0">
                            {org.memberCount.toLocaleString()} user
                            {org.memberCount === 1 ? "" : "s"}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Badge
              key={id}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              <span className="truncate max-w-[180px]">
                {nameCache[id] ?? "Organization"}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="rounded-full hover:bg-slate-300/60 p-0.5"
                  aria-label="Remove organization"
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
