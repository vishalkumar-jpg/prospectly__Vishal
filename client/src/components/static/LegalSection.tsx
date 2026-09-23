import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LegalSectionProps {
  /** DOM id used by the TOC anchor links. */
  id: string;
  /** Section heading (rendered as h2). */
  title: ReactNode;
  /** Section body. */
  children: ReactNode;
  className?: string;
}

/**
 * Canonical `<section>` block for legal pages (Privacy / Terms).
 *
 * Renders a scroll-offset-safe anchor target (`scroll-mt-24`) so in-page
 * links don't hide content behind the fixed Navigation bar, plus
 * typography defaults that match the home-* design system.
 */
export function LegalSection({
  id,
  title,
  children,
  className,
}: LegalSectionProps) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24", className)}
      aria-labelledby={`${id}-title`}
    >
      <h2
        id={`${id}-title`}
        className="mb-4 text-2xl font-extrabold tracking-tight text-home-fg"
      >
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-home-muted [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-home-fg [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_strong]:text-home-fg">
        {children}
      </div>
    </section>
  );
}
