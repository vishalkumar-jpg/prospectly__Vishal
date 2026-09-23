import { useCallback, useEffect, useRef, useState } from "react";
import { badgeVariants } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ResumeSearchConditionState } from "@/lib/api/recruitment";
import type { RelevanceItem } from "@/lib/recruitment/candidate-relevance.utils";

/** Keeps a collapsed requirement's state readable once its icon is gone. */
const CONDITION_SYMBOL: Record<ResumeSearchConditionState, string> = {
  met: "✓",
  missing: "✗",
  unknown: "?",
};

const CONDITION_SYMBOL_STYLES: Record<ResumeSearchConditionState, string> = {
  met: "text-emerald-600",
  missing: "text-red-600",
  unknown: "text-amber-600",
};

/** Spoken equivalent of the symbol, for assistive technology only. */
const CONDITION_LABEL: Record<ResumeSearchConditionState, string> = {
  met: "Meets",
  missing: "Missing",
  unknown: "Unknown",
};

/** Long enough for the pointer to cross the gap into the panel. */
const CLOSE_DELAY_MS = 120;

interface RelevanceOverflowProps {
  items: RelevanceItem[];
}

/**
 * The "+N" chip and the panel behind it.
 *
 * A Popover rather than a Tooltip, because this is the one element in the
 * relevance strip that hides content instead of explaining an icon — a tooltip
 * would be unreachable by click and unreachable altogether on the mobile
 * builds, where there is no hover. Hover is kept for desktop on top of that.
 */
export function RelevanceOverflow({ items }: RelevanceOverflowProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openNow = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const closeSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  // Mouse only — on touch the tap already fires the trigger's click, and
  // reacting to the synthetic pointerenter as well makes it open then close.
  const hoverOpen = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") openNow();
  };
  const hoverClose = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") closeSoon();
  };

  if (items.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(
          badgeVariants({ variant: "outline" }),
          "cursor-pointer text-[10px] font-normal text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        )}
        aria-label={`Show ${items.length} more match ${
          items.length === 1 ? "reason" : "reasons"
        }`}
        onPointerEnter={hoverOpen}
        onPointerLeave={hoverClose}
      >
        +{items.length}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-auto max-w-56 p-2 text-xs"
        // A panel opened by hover must not pull focus away from the board.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={openNow}
        onPointerLeave={hoverClose}
      >
        <ul className="space-y-1">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.label}`}
              className="flex items-start gap-1.5"
            >
              {item.kind === "condition" ? (
                <>
                  <span
                    className={cn(
                      "font-semibold",
                      CONDITION_SYMBOL_STYLES[item.state]
                    )}
                    aria-hidden
                  >
                    {CONDITION_SYMBOL[item.state]}
                  </span>
                  {/* The symbol is the only thing carrying met/missing/unknown,
                      and it is decorative to a screen reader. */}
                  <span className="sr-only">{CONDITION_LABEL[item.state]}</span>
                </>
              ) : null}
              <span className="min-w-0 break-words">{item.label}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
