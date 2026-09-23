// Self-serve section is disabled on /contact — it pointed at the removed
// /support page. Kept here so it can be restored without rewriting it.
/*
import { Book, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import { cn } from "@/lib/utils";

interface LinkTile {
  icon: LucideIcon;
  title: string;
  hint: string;
  href: string;
  external?: boolean;
}

const LINKS: LinkTile[] = [
  {
    icon: Book,
    title: "Knowledge Base",
    hint: "Guides & tutorials",
    href: "/support",
  },
  {
    icon: MessageCircle,
    title: "Community",
    hint: "Forum & discussions",
    href: "/support",
  }
];

export function ContactSelfServeLinks() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="contact-selfserve-title"
    >
      <StaticSectionHeading
        id="contact-selfserve-title"
        eyebrow="Self-serve"
        title="Looking for quick answers?"
        description="Browse our knowledge base and documentation."
      />
      <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        {LINKS.map((l) => {
          const content = (
            <>
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-home-amethyst/10 text-home-amethyst"
                aria-hidden
              >
                <l.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-home-fg">
                  {l.title}
                </span>
                <span className="block text-xs text-home-muted">{l.hint}</span>
              </span>
            </>
          );
          const className = cn(
            "group flex items-center gap-3 rounded-2xl border border-home-border bg-home-bg p-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            "hover:-translate-y-0.5 hover:border-home-amethyst/40 hover:shadow-md",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-amethyst focus-visible:ring-offset-2",
          );
          return l.external ? (
            <a
              key={l.title}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {content}
            </a>
          ) : (
            <Link key={l.title} to={l.href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </StaticSection>
  );
}
*/

export {};
