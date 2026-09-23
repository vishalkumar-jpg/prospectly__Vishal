import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/components/home/useScrollReveal";

interface StaticSectionProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Use elevated background (home-bg-elevated) for alternating section rhythm. */
  elevated?: boolean;
  /** Add the animated ambient SVG background (uses StaticPageBgSvg default variant). */
  withBackground?: boolean;
  /** aria-labelledby target — id of the section heading. */
  ariaLabelledBy?: string;
  /** Vertical padding override. Defaults match homepage section rhythm. */
  verticalPadding?: "default" | "narrow" | "cta";
  /** Content. */
  children: ReactNode;
  /** Override inner max-width; defaults to the homepage 1200px frame. */
  innerClassName?: string;
  /** Disable the scroll reveal (e.g. for the above-the-fold hero). */
  disableReveal?: boolean;
}

/**
 * Shared wrapper for every static-page section.
 *
 * Mirrors the homepage rhythm (`max-w-[1200px]` +
 * `px-4 sm:px-6 md:px-10 max-[900px]:px-5 max-[600px]:px-4` +
 * `py-16 max-[900px]:py-12`) and attaches the `home-reveal` /
 * `home-reveal-visible` scroll-reveal via `useScrollReveal`
 * — exactly matching `GiveToGet`, `ResultsSection`, `PledgeSection`,
 * `AudienceSection`.
 */
export function StaticSection({
  elevated = false,
  withBackground = false,
  ariaLabelledBy,
  verticalPadding = "default",
  innerClassName,
  disableReveal = false,
  className,
  children,
  ...rest
}: StaticSectionProps) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  const pad =
    verticalPadding === "narrow"
      ? "py-12 max-[900px]:py-10"
      : verticalPadding === "cta"
        ? "py-16 max-[900px]:py-14"
        : "py-16 max-[900px]:py-12";

  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "relative overflow-hidden",
        elevated ? "bg-home-bg-elevated" : "bg-home-bg",
        className,
      )}
      {...rest}
    >
      {withBackground && (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          {/* deferred import via dynamic component to avoid circular load */}
          <StaticSectionOrbs />
        </div>
      )}
      <div
        ref={ref}
        className={cn(
          "relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 md:px-10 max-[900px]:px-5 max-[600px]:px-4",
          pad,
          !disableReveal && "home-reveal",
          !disableReveal && visible && "home-reveal-visible",
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Low-weight ambient orbs (two radial glows) — avoids importing the full SVG component for perf. */
function StaticSectionOrbs() {
  return (
    <>
      <div
        className="absolute -right-[5%] -top-[15%] h-[60%] w-[35%] rounded-full bg-[radial-gradient(ellipse,hsl(var(--home-amethyst)/0.05),transparent_60%)] blur-[50px]"
        aria-hidden
      />
      <div
        className="absolute -bottom-[10%] left-[10%] h-[50%] w-[30%] rounded-full bg-[radial-gradient(ellipse,hsl(var(--home-rose)/0.04),transparent_60%)] blur-[50px]"
        aria-hidden
      />
    </>
  );
}
