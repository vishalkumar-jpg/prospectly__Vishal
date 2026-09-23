import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RouteSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
}

export function RouteSearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  inputClassName,
  "aria-label": ariaLabel = "Search",
}: RouteSearchInputProps) {
  const hasValue = value.trim().length > 0;

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "rounded-xl border-border bg-muted pl-10 focus-visible:border-brand-amethyst/30 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-brand-amethyst/20 focus-visible:ring-offset-0",
          hasValue ? "pr-10" : "pr-3",
          inputClassName
        )}
        aria-label={ariaLabel}
      />
      {hasValue ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
