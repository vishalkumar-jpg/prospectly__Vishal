import type { ReactNode } from "react";

export interface FilterGroupProps {
  /** Micro typography, matching `variants.css:97`. */
  title: string;
  /** Active filters inside this group only. Hidden at zero (§9.3). */
  activeCount: number;
  children: ReactNode;
}

/**
 * One titled section of the All-filters drawer.
 *
 * Group order is content order — the drawer renders these in reference order and
 * never reorders them per breakpoint (§9.3).
 */
export function FilterGroup({
  title,
  activeCount,
  children,
}: FilterGroupProps) {
  return (
    <section className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0">
      <div className="flex items-center gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {activeCount > 0 ? (
          <span
            className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-secondary-foreground"
            aria-label={`${activeCount} active in ${title}`}
          >
            {activeCount}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}
