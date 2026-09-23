import { useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { FacetValue } from "@/lib/api/recruitment-candidate-search";

export interface FacetMultiSelectProps {
  /** Accessible name of the listbox and of each remove button. */
  label: string;
  id: string;
  placeholder: string;
  options: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
  /**
   * Clears the facet. An empty selection already means "every value", so the
   * "All …" row is not a value to select — it is the absence of a filter, and
   * clearing is exactly what expresses that.
   *
   * Optional: without it the row is hidden rather than rendered inert.
   */
  onClear?: () => void;
  loading?: boolean;
}

/**
 * Popover + listbox multi-select (§9.9).
 *
 * `role="listbox"` + `aria-multiselectable` + `aria-selected` per option, arrow
 * keys move between options, and Radix owns Escape and focus return to the
 * trigger. A bare `<select multiple>` fails review (§9.8).
 */
export function FacetMultiSelect({
  label,
  id,
  placeholder,
  options,
  selected,
  onToggle,
  onClear,
  loading,
}: FacetMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = q
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(q) ||
            option.value.toLowerCase().includes(q)
        )
      : options;
    // Selected first: a facet with 400 values must never hide what is on.
    return [...matched].sort(
      (a, b) =>
        Number(selected.includes(b.value)) - Number(selected.includes(a.value))
    );
  }, [options, search, selected]);

  const labelOf = useCallback(
    (value: string) =>
      options.find((option) => option.value === value)?.label ?? value,
    [options]
  );

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ??
        []
    );
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? current + 1 : current - 1;
    items[(next + items.length) % items.length]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            className="h-9 w-full justify-between px-3 text-sm font-normal transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
          >
            <span
              className={cn(
                "truncate",
                selected.length === 0 && "text-muted-foreground"
              )}
            >
              {selected.length === 0
                ? placeholder
                : `${selected.length} selected`}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          onKeyDown={onListKeyDown}
        >
          <div className="border-b p-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label}`}
              className="h-8 text-sm"
            />
          </div>
          <div
            ref={listRef}
            role="listbox"
            aria-multiselectable
            aria-label={label}
            className="max-h-56 overflow-y-auto p-1"
          >
            {onClear ? (
              <button
                type="button"
                role="option"
                aria-selected={selected.length === 0}
                onClick={() => onClear()}
                className={cn(
                  "mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-all duration-200",
                  "hover:bg-brand-amethyst/10 hover:text-brand-amethyst",
                  "focus-visible:bg-brand-amethyst/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst",
                  selected.length === 0 &&
                    "bg-brand-amethyst/10 font-medium text-brand-amethyst"
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    selected.length === 0 ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden
                />
                <span className="truncate">{placeholder}</span>
              </button>
            ) : null}

            {loading ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Loading options…
              </p>
            ) : visible.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No matching values.
              </p>
            ) : (
              visible.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onToggle(option.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-all duration-200",
                      // hover:bg-accent would be indigo here: --accent and
                      // --primary are the same value in this theme.
                      "hover:bg-brand-amethyst/10 hover:text-brand-amethyst",
                      "focus-visible:bg-brand-amethyst/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst",
                      // A chosen option stays visibly chosen while the list is
                      // open — the tick alone is easy to lose when scanning.
                      isSelected &&
                        "bg-brand-amethyst/10 font-medium text-brand-amethyst"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{option.label}</span>
                    {/* Hidden for now. The count is computed over the whole
                        accessible pipeline, so it disagrees with the result
                        count as soon as anything else narrows the search — the
                        dropdown said "United States 1" beside a table reading
                        "3 candidates match out of 4". Restore once the counts
                        are recomputed against the applied criteria. */}
                    {/* <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                      {option.count.toLocaleString()}
                    </span> */}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <Badge
              key={value}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              <span className="max-w-[180px] truncate">{labelOf(value)}</span>
              <button
                type="button"
                onClick={() => onToggle(value)}
                aria-label={`Remove ${labelOf(value)} from ${label}`}
                className="rounded-full p-0.5 transition-all duration-200 hover:bg-brand-rose/15 hover:text-brand-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
