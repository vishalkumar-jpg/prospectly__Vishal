import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ImportModalActionCardProps {
  visual?: ReactNode;
  /** When omitted, the uppercase label row is not rendered (Apple open-ID card). */
  label?: string;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Override size for icon/visual (default text-4xl per .m-action-visual). */
  visualClassName?: string;
}

export function ImportModalActionCard({
  visual,
  label,
  title,
  description,
  children,
  className,
  visualClassName = "text-4xl",
}: ImportModalActionCardProps) {
  return (
    <div
      className={cn(
        "mb-4 rounded-[14px] border-[1.5px] border-border bg-muted/40 px-5 py-5 text-center transition-colors",
        "hover:border-gs-amethyst/50 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {visual != null ? (
        <div className={cn("mb-2.5 leading-none", visualClassName)}>{visual}</div>
      ) : null}
      {label != null && label !== "" ? (
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gs-amethyst">
          {label}
        </div>
      ) : null}
      <h4 className="mb-1 text-base font-bold text-foreground">{title}</h4>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  );
}
