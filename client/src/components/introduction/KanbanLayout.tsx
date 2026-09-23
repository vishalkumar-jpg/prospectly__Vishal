import React from "react";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KanbanBoardProps {
  children: React.ReactNode;
  className?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  children,
  className,
}) => {
  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex h-full min-h-0 min-w-max items-stretch gap-4",
          className
        )}
      >
        {children}
      </div>
    </TooltipProvider>
  );
};

interface KanbanColumnProps {
  title: string;
  count: number;
  description?: string;
  children: React.ReactNode;
  headerColor?: string;
  paymentPercentage?: string;
  paymentLabel?: string;
  className?: string;
  bgColor?: string;
  textColor?: string;
  dotColor?: string;
  /** 2px colored bottom border on the column head */
  headBorder?: string;
  /** Soft ring around the stage dot */
  dotRing?: string;
  /** Count pill background */
  countBg?: string;
  /** Count pill text */
  countText?: string;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  count,
  description,
  children,
  className,
  bgColor,
  textColor,
  dotColor,
  headBorder,
  dotRing,
  countBg,
  countText,
}) => {
  return (
    <div
      className={cn(
        "flex-shrink-0 w-[340px] flex flex-col h-full min-h-0 bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "px-4 py-3.5 flex-shrink-0 bg-white border-b-2",
          headBorder || "border-slate-300"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "h-[9px] w-[9px] rounded-full ring-[3px] flex-shrink-0",
                dotColor || "bg-slate-400",
                dotRing || "ring-slate-400/20"
              )}
            />
            <h3 className="font-bold text-sm text-slate-800 truncate min-w-0">
              {title}
            </h3>
            {description && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button className="text-slate-400 hover:text-primary transition-colors focus:outline-none cursor-pointer">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-xs text-xs shadow-xl bg-white dark:bg-slate-950"
                >
                  <p className="font-medium leading-relaxed">{description}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <span
            className={cn(
              "text-xs font-bold rounded-full px-2.5 py-0.5 min-w-[26px] text-center",
              countBg || bgColor || "bg-slate-100",
              countText || textColor || "text-slate-600"
            )}
          >
            {count}
          </span>
        </div>
      </div>

      {/* Cards container — ScrollArea overlays scrollbar (no extra gutter like thin-scroll) */}
      <ScrollArea className="flex-1 min-h-0 p-2 bg-app [&>div:first-child>div]:!block">
        <div className="space-y-3 p-1">{children}</div>
      </ScrollArea>
    </div>
  );
};
