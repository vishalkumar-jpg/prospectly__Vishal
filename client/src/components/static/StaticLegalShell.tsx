import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { StaticPageHero } from "./StaticPageHero";
import { StaticTrustPill } from "./StaticTrustPill";
import { CheckCircle, Lock, Shield } from "lucide-react";

export interface LegalTocSection {
  id: string;
  title: string;
}

interface StaticLegalShellProps {
  /** Hero eyebrow line. */
  eyebrow: string;
  /** Hero H1 line 1 (plain). */
  titleLine1: ReactNode;
  /** Hero H1 line 2 (gradient). */
  titleLine2: ReactNode;
  /** Short description under the H1. */
  description?: ReactNode;
  /** "Last updated" short string (e.g. "01 Jan 2026"). */
  lastUpdated?: string;
  /** Table of contents: one anchor-link per section. */
  sections: LegalTocSection[];
  /** Prose content — each `<section id="..."` must match a TOC entry. */
  children: ReactNode;
}

/**
 * Legal-page shell: hero + sticky table-of-contents sidebar (desktop) +
 * responsive `<details>` TOC on mobile + prose slot.
 *
 * Uses the same homepage frame (`max-w-[1200px]`) and the exact hero
 * entrance animation as every other static page. Content copy stays
 * verbatim inside `children`.
 */
export function StaticLegalShell({
  eyebrow,
  titleLine1,
  titleLine2,
  description,
  lastUpdated,
  sections,
  children,
}: StaticLegalShellProps) {
  const [active, setActive] = useState<string | null>(
    sections[0]?.id ?? null,
  );

  useEffect(() => {
    if (typeof window === "undefined" || sections.length === 0) return;
    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (headings.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (a.target as HTMLElement).offsetTop -
              (b.target as HTMLElement).offsetTop,
          )[0];
        if (visible?.target instanceof HTMLElement) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0, 1] },
    );
    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [sections]);

  return (
    <>
      <StaticPageHero
        eyebrow={eyebrow}
        eyebrowDotTone="amethyst"
        titleLine1={titleLine1}
        titleLine2={titleLine2}
        description={description}
        pills={[
          <StaticTrustPill key="updated" tone="amethyst" icon={CheckCircle}>
            Updated {lastUpdated}
          </StaticTrustPill>,
          <StaticTrustPill key="sec" tone="trust-green" icon={Shield}>
            SOC 2 · GDPR · CCPA
          </StaticTrustPill>,
          <StaticTrustPill key="enc" tone="sky" icon={Lock}>
            256-bit Encryption
          </StaticTrustPill>,
        ]}
      />
      <section className="bg-home-bg">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 md:px-10 max-[900px]:px-5 max-[900px]:py-10 max-[600px]:px-4">
          <div className="grid gap-10 lg:grid-cols-[260px_1fr] lg:gap-12">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <LegalToc sections={sections} active={active} />
            </aside>
            <div className="min-w-0 max-w-[760px] space-y-8 [&_h2]:scroll-mt-24">
              {children}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function LegalToc({
  sections,
  active,
}: {
  sections: LegalTocSection[];
  active: string | null;
}) {
  const list = (
    <ol className="space-y-1 text-sm">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className={cn(
              "group flex items-start gap-2 rounded-md px-2 py-1.5 text-home-muted transition-colors",
              "hover:bg-home-bg-elevated hover:text-home-fg",
              active === s.id &&
                "bg-home-amethyst/10 font-semibold text-home-amethyst hover:bg-home-amethyst/15 hover:text-home-amethyst",
            )}
          >
            <span className="shrink-0 font-mono text-[11px] text-home-muted group-hover:text-home-fg">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="leading-snug">{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <div className="hidden lg:block">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-home-amethyst">
          Sections
        </div>
        <nav aria-label="On this page">{list}</nav>
      </div>
      <details className="group rounded-2xl border border-home-border bg-home-bg-elevated p-4 lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-home-fg">
          <span>On this page</span>
          <span className="text-xs text-home-muted transition group-open:rotate-180">
            ▾
          </span>
        </summary>
        <nav className="mt-3" aria-label="On this page">
          {list}
        </nav>
      </details>
    </>
  );
}
