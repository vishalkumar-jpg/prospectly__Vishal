import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const panelClassName =
  "w-full max-w-md rounded-3xl border border-border/80 bg-card px-8 py-8 shadow-xl";

export function OAuthCallbackShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className={cn(panelClassName, className)}>{children}</div>
    </div>
  );
}
