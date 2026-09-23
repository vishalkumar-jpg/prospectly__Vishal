import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import type { FacetValue } from "@/lib/api/recruitment-candidate-search";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, hint, htmlFor, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
        {hint ? (
          <span className="ml-1 font-normal text-muted-foreground">
            · {hint}
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

interface ChipSetProps {
  label: string;
  options: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function ChipSet({ label, options, selected, onToggle }: ChipSetProps) {
  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No {label.toLowerCase()} values yet.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((option) => {
        const isOn = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isOn}
            onClick={() => onToggle(option.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst",
              isOn
                ? "border-brand-rose bg-brand-rose/10 font-medium text-brand-rose"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
