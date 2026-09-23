import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { StaticPageBgSvg } from "./StaticPageBgSvg";

interface StaticPageHeroProps {
  /** Short uppercase eyebrow (e.g. "Community First"). */
  eyebrow?: ReactNode;
  /** Pulsing dot tone next to the eyebrow. */
  eyebrowDotTone?: "amethyst" | "rose" | "sky" | "trust-green";
  /** First line of the H1 (renders black text). */
  titleLine1: ReactNode;
  /** Second line — renders with the brand amethyst→rose gradient + entrance animation. */
  titleLine2: ReactNode;
  /** Optional short sub-paragraph under the title. */
  description?: ReactNode;
  /** Trust-pill row (array of ReactNodes — typically <StaticTrustPill> instances). */
  pills?: ReactNode[];
  /** CTA buttons row (array of ReactNodes). */
  actions?: ReactNode[];
  /** Optional trailing row (e.g. Trustpilot marquee card). */
  trailing?: ReactNode;
  /** Optional right-column content — if omitted, the hero is centered. */
  rightSlot?: ReactNode;
  /** Optional id for the H1 (used by <main aria-labelledby>). */
  titleId?: string;
}

const dotToneClass: Record<
  NonNullable<StaticPageHeroProps["eyebrowDotTone"]>,
  string
> = {
  amethyst: "bg-home-amethyst text-home-amethyst",
  rose: "bg-home-rose text-home-rose",
  sky: "bg-home-sky text-home-sky",
  "trust-green": "bg-home-trust-green text-home-trust-green",
};

/**
 * Canonical hero for every static page.
 *
 * Reuses the exact entrance choreography from
 * `@/components/home/Hero.tsx` (eyebrow fade-up → h1 line 1 slide-in →
 * h1 line 2 `home-hero-grad-line` → lede / pills / actions fade-up at
 * staggered `delay-home-hero-*` tokens).
 *
 * Layout matches the homepage frame exactly:
 *   `max-w-[1200px]` + `px-4 sm:px-6 md:px-10 max-[900px]:px-5`
 *   `pt-[120px] pb-10 max-[900px]:pt-[96px] max-[900px]:pb-12`
 *   `max-[600px]:pt-[88px] max-[600px]:pb-10`
 */
export function StaticPageHero({
  eyebrow,
  eyebrowDotTone = "rose",
  titleLine1,
  titleLine2,
  description,
  pills,
  actions,
  trailing,
  rightSlot,
  titleId = "page-title",
}: StaticPageHeroProps) {
  const dotTone = dotToneClass[eyebrowDotTone];
  const [dotBg] = dotTone.split(" ");
  const eyebrowText = dotTone.split(" ")[1];
  const centered = !rightSlot;

  return (
    <div className="relative overflow-hidden bg-home-bg">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <StaticPageBgSvg variant="default" />
      </div>
      <div
        className={cn(
          "relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 md:px-10",
          "pt-[120px] pb-10",
          "max-[900px]:px-5 max-[900px]:pt-[96px] max-[900px]:pb-12",
          "max-[600px]:px-4 max-[600px]:pt-[88px] max-[600px]:pb-10",
        )}
      >
        <div
          className={cn(
            "grid items-center gap-10 max-[900px]:gap-7",
            rightSlot ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1",
          )}
        >
          <div
            className={cn(
              "relative z-[2]",
              centered ? "mx-auto max-w-3xl text-center" : "max-[900px]:text-center",
            )}
          >
            {eyebrow && (
              <div
                className={cn(
                  "mb-[18px] inline-flex items-center gap-1.5 rounded-full border border-home-rose/15 bg-home-rose/5 px-4 py-1.5",
                  "text-xs font-bold uppercase tracking-wide",
                  eyebrowText,
                  "motion-safe:animate-home-hero-fade-up opacity-0",
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full animate-home-blink", dotBg)}
                  aria-hidden
                />
                {eyebrow}
              </div>
            )}
            <h1
              id={titleId}
              className={cn(
                "mb-4 text-[28px] font-extrabold leading-[1.04] tracking-tight text-home-fg",
                "max-[600px]:text-[28px] lg:text-[50px] lg:tracking-[-2px]",
              )}
            >
              <span
                className={cn(
                  "block motion-safe:animate-home-hero-slide-in delay-home-hero-015 opacity-0",
                )}
              >
                {titleLine1}
              </span>
              <span className="home-hero-grad-line block">{titleLine2}</span>
            </h1>
            {description && (
              <p
                className={cn(
                  "mb-[22px] text-[17px] leading-relaxed text-home-muted",
                  "motion-safe:animate-home-hero-fade-up delay-home-hero-05 opacity-0",
                  centered ? "mx-auto max-w-[520px]" : "max-w-[460px] max-[900px]:mx-auto",
                )}
              >
                {description}
              </p>
            )}
            {pills && pills.length > 0 && (
              <div
                className={cn(
                  "mb-[18px] flex flex-wrap gap-2.5 text-sm",
                  "motion-safe:animate-home-hero-fade-up delay-home-hero-065 opacity-0",
                  centered
                    ? "justify-center"
                    : "max-[900px]:justify-center max-[600px]:flex-col max-[600px]:items-center max-[600px]:gap-2",
                )}
              >
                {pills.map((p, i) => (
                  <span key={i}>{p}</span>
                ))}
              </div>
            )}
            {actions && actions.length > 0 && (
              <div
                className={cn(
                  "mb-[18px] flex flex-wrap gap-3",
                  "motion-safe:animate-home-hero-fade-up delay-home-hero-08 opacity-0",
                  centered
                    ? "justify-center"
                    : "max-[900px]:justify-center max-[600px]:flex-col max-[600px]:items-stretch",
                )}
              >
                {actions.map((a, i) => (
                  <span key={i} className="contents">
                    {a}
                  </span>
                ))}
              </div>
            )}
            {trailing && (
              <div
                className={cn(
                  "motion-safe:animate-home-hero-fade-up delay-home-hero-095 opacity-0",
                  centered ? "mx-auto" : "max-[900px]:mx-auto",
                )}
              >
                {trailing}
              </div>
            )}
          </div>
          {rightSlot && (
            <div className="relative z-[2] motion-safe:animate-home-hero-fade-up delay-home-hero-08 opacity-0">
              {rightSlot}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
