import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared shell for kanban column cards — matches My Job Posts `KanbanCandidateCard`. */
export const CONNECTOR_KANBAN_CARD_SHELL =
  "rounded-xl border border-slate-200 bg-white p-[15px] shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D2D6E0] hover:shadow-[0_4px_14px_rgba(11,16,32,0.06)]";

/** @deprecated Prefer ScrollArea like JobDetailWithKanban; kept for any leftover callers. */
export const KANBAN_COLUMN_BODY_CLASS =
  "min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-app p-2";

export const CONNECTOR_CARD_BTN =
  "h-auto gap-1.5 rounded-[9px] px-2.5 py-[7px] text-xs font-bold transition-all";

export const CONNECTOR_CARD_BTN_NEUTRAL = cn(
  CONNECTOR_CARD_BTN,
  "hover:border-brand-amethyst/30 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
);

export const CONNECTOR_CARD_BTN_REJECT = cn(
  CONNECTOR_CARD_BTN,
  "border-brand-destructive/30 bg-brand-destructive/10 text-brand-destructive hover:border-brand-destructive/50 hover:bg-brand-destructive/15 hover:text-brand-destructive"
);

export const CONNECTOR_CARD_BTN_PRIMARY = cn(
  CONNECTOR_CARD_BTN,
  "border-transparent bg-brand-gradient text-white shadow-brand-cta hover:-translate-y-px hover:text-white"
);

export function ConnectorCardActionRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex gap-[7px]", className)}>{children}</div>;
}
