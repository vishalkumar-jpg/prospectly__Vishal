import { type LucideIcon, CheckCircle } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StaticIconTone =
  | "amethyst"
  | "rose"
  | "sky"
  | "trust-green"
  | "muted";

interface StaticIconCardProps {
  icon: LucideIcon;
  tone?: StaticIconTone;
  title: ReactNode;
  description?: ReactNode;
  /** Optional bullet list rendered below the description. */
  features?: ReactNode[];
  /** Highlight badge (e.g. "Up to $60"). */
  highlight?: ReactNode;
  /** Footer slot (small meta text under the card body). */
  footer?: ReactNode;
  className?: string;
  /** Elevate on a darker background (uses `bg-home-bg-elevated`). */
  elevated?: boolean;
  /** Optional eyebrow pill above the title. */
  eyebrow?: ReactNode;
  /** Disable hover lift (e.g. when already inside an animated section). */
  disableHover?: boolean;
}

const wellByTone: Record<StaticIconTone, string> = {
  amethyst: "bg-home-amethyst/10 text-home-amethyst",
  rose: "bg-home-rose/10 text-home-rose",
  sky: "bg-home-sky/10 text-home-sky",
  "trust-green": "bg-home-trust-green/10 text-home-trust-green",
  muted: "bg-home-bg-elevated text-home-muted",
};

/**
 * The canonical static-page card. Mirrors the GiveToGet / ResultsSection /
 * PledgeSection card treatment: subtle border, rounded corners, gentle
 * hover translate + shadow with the cubic easing homepage uses.
 */
export function StaticIconCard({
  icon: Icon,
  tone = "amethyst",
  title,
  description,
  features,
  highlight,
  footer,
  eyebrow,
  className,
  elevated = false,
  disableHover = false,
}: StaticIconCardProps) {
  return (
    <article
      className={cn(
        "group rounded-[20px] border border-home-border p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:p-7",
        elevated ? "bg-home-bg-elevated" : "bg-home-bg",
        !disableHover &&
          "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5",
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3.5">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
            wellByTone[tone],
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-home-amethyst">
              {eyebrow}
            </div>
          )}
          <h3 className="text-base font-extrabold tracking-tight text-home-fg sm:text-lg">
            {title}
          </h3>
        </div>
        {highlight && (
          <span className="shrink-0 rounded-full bg-home-amethyst/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-home-amethyst">
            {highlight}
          </span>
        )}
      </div>
      {description && (
        <p className="mb-4 text-sm leading-relaxed text-home-muted">
          {description}
        </p>
      )}
      {features && features.length > 0 && (
        <ul className="mb-1 space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-home-trust-green"
                aria-hidden
              />
              <span className="text-home-muted">{f}</span>
            </li>
          ))}
        </ul>
      )}
      {footer && (
        <div className="mt-4 border-t border-home-border pt-3.5 text-xs text-home-muted">
          {footer}
        </div>
      )}
    </article>
  );
}
