import * as React from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "destructive";

export type ToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

export type ToastProps = {
  variant?: ToastVariant;
  duration?: number;
  position?: ToastPosition;
};

const VARIANT_STYLES: Record<
  ToastVariant,
  {
    chip: string;
    bar: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }
> = {
  // Default mirrors the sample's `'ok'` fallback — a toast without a variant
  // is treated as success, so the progress bar shows green.
  default: {
    chip: "bg-emerald-500/10 text-emerald-700",
    bar: "bg-emerald-500",
    Icon: CheckCircle2,
  },
  success: {
    chip: "bg-emerald-500/10 text-emerald-700",
    bar: "bg-emerald-500",
    Icon: CheckCircle2,
  },
  destructive: {
    chip: "bg-red-500/10 text-red-600",
    bar: "bg-red-500",
    Icon: XCircle,
  },
};

const ENTER_ANIMATION: Record<ToastPosition, string> = {
  "top-right": "animate-toast-in",
  "bottom-right": "animate-toast-in",
  "top-left": "animate-toast-in-left",
  "bottom-left": "animate-toast-in-left",
};

const EXIT_ANIMATION: Record<ToastPosition, string> = {
  "top-right": "animate-toast-out",
  "bottom-right": "animate-toast-out",
  "top-left": "animate-toast-out-left",
  "bottom-left": "animate-toast-out-left",
};

type ToastCardProps = {
  variant?: ToastVariant;
  position: ToastPosition;
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration: number;
  open: boolean;
  paused: boolean;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export const ToastCard: React.FC<ToastCardProps> = ({
  variant = "default",
  position,
  title,
  description,
  duration,
  open,
  paused,
  onClose,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { chip, bar, Icon } = VARIANT_STYLES[variant];

  return (
    <div
      role="status"
      aria-live={variant === "destructive" ? "assertive" : "polite"}
      data-state={open ? "open" : "closed"}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "pointer-events-auto relative w-full overflow-hidden rounded-[14px] border border-border bg-background shadow-[0_20px_50px_rgba(11,16,32,0.16)]",
        open ? ENTER_ANIMATION[position] : EXIT_ANIMATION[position]
      )}
    >
      <div className="flex items-start gap-3 px-4 py-[15px]">
        <span
          className={cn(
            "grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px]",
            chip
          )}
        >
          <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          {title && (
            <div className="text-[13.5px] font-extrabold leading-tight text-foreground">
              {title}
            </div>
          )}
          {description && (
            <div className="mt-0.5 text-xs leading-[1.45] text-muted-foreground">
              {description}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X className="h-3 w-3" strokeWidth={2} aria-hidden />
          <span className="sr-only">Close</span>
        </button>
      </div>
      {Number.isFinite(duration) && duration > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute bottom-0 left-0 h-[3px] w-full origin-left animate-toast-shrink",
            bar
          )}
          style={{
            animationDuration: `${duration}ms`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      )}
    </div>
  );
};
