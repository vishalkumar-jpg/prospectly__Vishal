import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DetailSectionCard({
  title,
  icon: Icon,
  trailing,
  children,
  compact = false,
  className,
}: {
  title?: string;
  icon?: LucideIcon;
  trailing?: ReactNode;
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
        compact ? "p-4" : "p-6",
        className
      )}
    >
      {title ? (
        <h2
          className={cn(
            "mb-3 flex items-center gap-2 font-semibold tracking-tight",
            compact ? "text-sm" : "text-xl"
          )}
        >
          {Icon ? (
            <Icon className="h-4 w-4 text-brand-amethyst" aria-hidden />
          ) : null}
          <span className="flex-1">{title}</span>
          {trailing}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
