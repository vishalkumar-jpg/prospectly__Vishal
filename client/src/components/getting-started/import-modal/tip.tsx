import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ImportModalTipProps {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ImportModalTip({
  icon,
  children,
  className,
}: ImportModalTipProps) {
  return (
    <div
      className={cn(
        "mb-3.5 flex items-center gap-2 rounded-[10px] border border-sky-500/15 bg-sky-500/[0.06] px-3.5 py-2.5 text-xs leading-snug text-muted-foreground",
        className
      )}
    >
      {icon != null ? (
        <span className="shrink-0 text-sm leading-none">{icon}</span>
      ) : null}
      <div className="min-w-0 [&_strong]:font-semibold [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}
