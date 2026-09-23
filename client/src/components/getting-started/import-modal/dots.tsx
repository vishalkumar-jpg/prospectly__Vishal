import { cn } from "@/lib/utils";
import { importModalAccentGradient } from "@/components/getting-started/import-modal/modalStyles";

interface ImportModalDotsProps {
  /** 0-based index of the active step */
  activeIndex: number;
  total?: number;
  className?: string;
}

export function ImportModalDots({
  activeIndex,
  total = 3,
  className,
}: ImportModalDotsProps) {
  return (
    <div
      className={cn("mb-5 flex items-center justify-center gap-1.5", className)}
      role="presentation"
    >
      {Array.from({ length: total }, (_, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-200",
              done && "w-2 bg-emerald-500",
              active && cn("w-6 rounded-md", importModalAccentGradient),
              !done && !active && "w-2 bg-border"
            )}
          />
        );
      })}
    </div>
  );
}
