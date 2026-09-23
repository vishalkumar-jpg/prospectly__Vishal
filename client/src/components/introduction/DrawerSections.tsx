import { type ReactNode } from "react";
import { DollarSign, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerSectionProps {
  icon: ReactNode;
  iconTint: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export function DrawerSection({
  icon,
  iconTint,
  title,
  children,
  className,
}: DrawerSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4 sm:p-5",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className={cn(
            "grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg",
            iconTint
          )}
        >
          {icon}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function PayoutHero({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <div className="flex items-center gap-3.5">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
          <DollarSign className="h-[18px] w-[18px]" />
        </span>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </div>
          <div className="text-lg font-bold leading-none tracking-tight text-brand-gradient">
            {value}
          </div>
        </div>
      </div>
      <div className="hidden h-9 w-px bg-border sm:block" />
      <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
        {note}
      </p>
    </div>
  );
}

export interface MetaCell {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tint: string;
  alert?: boolean;
}

export function MetaStrip({ cells }: { cells: MetaCell[] }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border",
        cells.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
      )}
    >
      {cells.map((cell, i) => (
        <div key={i} className="flex items-center gap-3 bg-card p-3.5">
          <span
            className={cn(
              "grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg",
              cell.tint
            )}
          >
            {cell.icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {cell.label}
              {cell.alert && (
                <AlertTriangle className="h-3 w-3 text-brand-destructive" />
              )}
            </div>
            <div className="truncate text-[13px] font-bold">{cell.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
