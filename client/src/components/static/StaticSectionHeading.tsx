import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StaticSectionHeadingProps {
  /** Short uppercase eyebrow, e.g. "Proven Results". */
  eyebrow?: ReactNode;
  /** The section title. Provide a string, or a ReactNode (e.g. with gradient span). */
  title: ReactNode;
  /** Optional short description below the title. */
  description?: ReactNode;
  /** DOM id — used with `aria-labelledby` on the parent StaticSection. */
  id?: string;
  /** Text alignment (default: center). */
  align?: "center" | "left";
  className?: string;
}

/**
 * Canonical section heading block (eyebrow + h2 + lede) matching the
 * homepage sections (GiveToGet / Results / Pledge / Audience etc.).
 *
 * Type scale + tracking is pinned to:
 *   - eyebrow: `text-[11px] font-bold uppercase tracking-widest text-home-amethyst`
 *   - h2:      `text-[28px] lg:text-[38px] font-extrabold tracking-tight`
 *   - lede:    `text-base text-home-muted max-w-[500px]`
 */
export function StaticSectionHeading({
  eyebrow,
  title,
  description,
  id,
  align = "center",
  className,
}: StaticSectionHeadingProps) {
  const alignClass =
    align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={cn("mb-10 max-w-[720px]", alignClass, className)}>
      {eyebrow && (
        <div
          className={cn(
            "mb-2.5 text-[11px] font-bold uppercase tracking-widest text-home-amethyst",
          )}
        >
          {eyebrow}
        </div>
      )}
      <h2
        id={id}
        className={cn(
          "mb-2.5 text-[28px] font-extrabold leading-tight tracking-tight text-home-fg",
          "max-[900px]:text-[28px] lg:text-[38px] lg:tracking-[-1px]",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "text-base leading-relaxed text-home-muted",
            align === "center" && "mx-auto max-w-[500px]",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
