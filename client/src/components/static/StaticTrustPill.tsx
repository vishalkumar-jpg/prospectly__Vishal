import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StaticTrustPillTone = "amethyst" | "rose" | "sky" | "trust-green" | "muted";

interface StaticTrustPillProps {
  /** Accent color token (defaults to amethyst). */
  tone?: StaticTrustPillTone;
  /** Optional Lucide icon (preferred over dot). */
  icon?: LucideIcon;
  /** Replaces the icon/dot with a custom leading element. */
  leading?: ReactNode;
  /** Pulse the leading dot (live-status vibe). */
  pulse?: boolean;
  /** Show a solid dot instead of the icon. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const toneDot: Record<StaticTrustPillTone, string> = {
  amethyst: "bg-home-amethyst",
  rose: "bg-home-rose",
  sky: "bg-home-sky",
  "trust-green": "bg-home-trust-green",
  muted: "bg-home-muted",
};

const toneIcon: Record<StaticTrustPillTone, string> = {
  amethyst: "text-home-amethyst",
  rose: "text-home-rose",
  sky: "text-home-sky",
  "trust-green": "text-home-trust-green",
  muted: "text-home-muted",
};

/**
 * Inline pill used in hero trust rows (e.g. "Skip cold outreach" / "Warm connections").
 * Matches the homepage bottom-badge style (`WebsiteFooter`) and the trust pills on Hero.
 */
export function StaticTrustPill({
  tone = "amethyst",
  icon: Icon,
  leading,
  pulse = false,
  dot = false,
  children,
  className,
}: StaticTrustPillProps) {
  const leadingNode =
    leading ??
    (Icon ? (
      <Icon className={cn("h-3.5 w-3.5", toneIcon[tone])} aria-hidden />
    ) : dot ? (
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          toneDot[tone],
          pulse && "animate-home-blink",
        )}
        aria-hidden
      />
    ) : null);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-home-border bg-home-bg px-3.5 py-1.5 text-xs font-semibold text-home-muted",
        className,
      )}
    >
      {leadingNode}
      <span className="text-home-fg">{children}</span>
    </span>
  );
}
