import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption {
  value: string;
  label: string;
  /**
   * Tailwind classes applied when this option is selected. Must use the
   * `data-[state=on]:` variant so it overrides the base toggle styles, e.g.
   * `"data-[state=on]:text-brand-success"`.
   */
  activeClassName?: string;
  disabled?: boolean;
}

interface SegmentedControlProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SegmentedControlOption[];
  className?: string;
  "aria-label"?: string;
}

/**
 * Single-select segmented toggle built on the Radix ToggleGroup primitive so
 * keyboard navigation, ARIA roles, focus-visible rings and disabled states
 * match the rest of the `ui/` component set.
 */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Radix emits "" when the active item is re-clicked; a segmented control
      // is never empty, so ignore deselection.
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex gap-0 rounded-xl border border-border bg-secondary p-1",
        className
      )}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            "h-auto rounded-lg px-4 py-2 text-[13px] font-bold text-muted-foreground transition-all hover:bg-transparent hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
            option.activeClassName
          )}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export default SegmentedControl;
