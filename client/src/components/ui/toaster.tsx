import * as React from "react";

import { ToastCard, type ToastPosition } from "@/components/ui/toast";
import {
  cancelAutoDismiss,
  scheduleAutoDismiss,
  setToastPaused,
  toast as toastFn,
  useToast,
  type ToasterToast,
} from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ALL_POSITIONS: ToastPosition[] = [
  "top-right",
  "top-left",
  "bottom-right",
  "bottom-left",
];

const POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-right": "top-5 right-5 items-end",
  "top-left": "top-5 left-5 items-start",
  "bottom-right": "bottom-5 right-5 items-end",
  "bottom-left": "bottom-5 left-5 items-start",
};

const MOBILE_POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-right": "max-[560px]:top-3 max-[560px]:right-3 max-[560px]:left-3",
  "top-left": "max-[560px]:top-3 max-[560px]:left-3 max-[560px]:right-3",
  "bottom-right": "max-[560px]:bottom-3 max-[560px]:right-3 max-[560px]:left-3",
  "bottom-left": "max-[560px]:bottom-3 max-[560px]:left-3 max-[560px]:right-3",
};

const RESUME_DISMISS_MS = 1200;
const FALLBACK_DURATION = 8000;

export interface ToasterProps {
  /**
   * Default position used when a `toast()` call does not specify one.
   * Individual calls can override via `toast({ position: 'bottom-left' })`.
   */
  position?: ToastPosition;
}

export function Toaster({
  position: defaultPosition = "top-right",
}: ToasterProps) {
  const { toasts } = useToast();

  const grouped = React.useMemo(() => {
    const map: Record<ToastPosition, ToasterToast[]> = {
      "top-right": [],
      "top-left": [],
      "bottom-right": [],
      "bottom-left": [],
    };
    toasts.forEach((t) => {
      const pos = t.position ?? defaultPosition;
      map[pos].push(t);
    });
    return map;
  }, [toasts, defaultPosition]);

  return (
    <>
      {ALL_POSITIONS.map((pos) => {
        const items = grouped[pos];
        if (items.length === 0) return null;
        const isBottom = pos.startsWith("bottom");
        return (
          <div
            key={pos}
            className={cn(
              "pointer-events-none fixed z-[1000] flex w-[380px] max-w-[calc(100vw-32px)] gap-3 max-[560px]:w-auto",
              isBottom ? "flex-col-reverse" : "flex-col",
              POSITION_CLASSES[pos],
              MOBILE_POSITION_CLASSES[pos]
            )}
          >
            {items.map((t) => {
              // Resolve once: an unset duration falls back to the default,
              // an explicit Infinity (e.g. toast.loading) stays Infinity.
              const resolvedDuration = t.duration ?? FALLBACK_DURATION;
              const isPersistent = !(
                Number.isFinite(resolvedDuration) && resolvedDuration > 0
              );
              return (
                <ToastCard
                  key={t.id}
                  variant={t.variant}
                  position={pos}
                  title={t.title}
                  description={t.description}
                  duration={resolvedDuration}
                  open={t.open ?? true}
                  paused={t.paused ?? false}
                  onClose={() => toastFn.dismiss(t.id)}
                  onMouseEnter={() => {
                    cancelAutoDismiss(t.id);
                    setToastPaused(t.id, true);
                  }}
                  onMouseLeave={() => {
                    setToastPaused(t.id, false);
                    if (!isPersistent) {
                      scheduleAutoDismiss(t.id, RESUME_DISMISS_MS);
                    }
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
}
