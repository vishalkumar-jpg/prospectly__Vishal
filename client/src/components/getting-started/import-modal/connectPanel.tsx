import type { ReactNode } from "react";
import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { cn } from "@/lib/utils";

interface ImportModalConnectPanelProps {
  title: string;
  description: string;
  timeHint?: string;
  icon?: ReactNode;
  tip?: ReactNode;
  socialProof?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ImportModalConnectPanel({
  title,
  description,
  timeHint = "~ 30 seconds",
  icon,
  tip,
  socialProof,
  error,
  children,
  className,
}: ImportModalConnectPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <ImportModalDots activeIndex={0} total={3} />

      {icon ? (
        <div className="flex justify-center" aria-hidden>
          {icon}
        </div>
      ) : null}

      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        <p className="mt-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {timeHint}
        </p>
      </div>

      {error}

      {children}

      {tip ? (
        <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left text-xs text-muted-foreground">
          {tip}
        </div>
      ) : null}

      {socialProof ? (
        <p className="text-center text-[11px] text-muted-foreground">
          {socialProof}
        </p>
      ) : null}
    </div>
  );
}
