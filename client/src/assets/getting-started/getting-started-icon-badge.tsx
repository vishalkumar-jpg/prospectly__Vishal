import type { LucideIcon } from "lucide-react";
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Globe,
  Handshake,
  Lightbulb,
  Link2,
  Mail,
  Rocket,
  ShieldCheck,
  Star,
  TrendingUp,
  Upload,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type GettingStartedIconName =
  | "download"
  | "handshake"
  | "chart"
  | "money"
  | "rocket"
  | "lock"
  | "shield"
  | "mail"
  | "clock"
  | "bulb"
  | "link"
  | "upload"
  | "folder"
  | "file"
  | "clipboard"
  | "globe"
  | "eye"
  | "check"
  | "close"
  | "zap"
  | "star";

export type GettingStartedIconVariant =
  | "amethyst"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "muted";

type IconConfig = {
  Icon: LucideIcon;
  variant: GettingStartedIconVariant;
  filled?: boolean;
};

const ICON_MAP: Record<GettingStartedIconName, IconConfig> = {
  download: { Icon: Download, variant: "amethyst" },
  handshake: { Icon: Handshake, variant: "sky" },
  chart: { Icon: TrendingUp, variant: "emerald" },
  money: { Icon: Wallet, variant: "amber" },
  rocket: { Icon: Rocket, variant: "amethyst" },
  lock: { Icon: ShieldCheck, variant: "sky" },
  shield: { Icon: ShieldCheck, variant: "sky" },
  mail: { Icon: Mail, variant: "rose" },
  clock: { Icon: Clock, variant: "amber" },
  bulb: { Icon: Lightbulb, variant: "amber" },
  link: { Icon: Link2, variant: "amethyst" },
  upload: { Icon: Upload, variant: "amethyst" },
  folder: { Icon: FolderOpen, variant: "muted" },
  file: { Icon: FileText, variant: "muted" },
  clipboard: { Icon: ClipboardList, variant: "sky" },
  globe: { Icon: Globe, variant: "sky" },
  eye: { Icon: Eye, variant: "sky" },
  check: { Icon: CheckCircle2, variant: "emerald" },
  close: { Icon: X, variant: "muted" },
  zap: { Icon: Zap, variant: "rose" },
  star: { Icon: Star, variant: "rose", filled: true },
};

const VARIANT_STYLES: Record<
  GettingStartedIconVariant,
  { container: string; icon: string }
> = {
  amethyst: {
    container: "bg-gs-amethyst/10",
    icon: "text-gs-amethyst",
  },
  sky: {
    container: "bg-sky-500/[0.08]",
    icon: "text-sky-600 dark:text-sky-400",
  },
  emerald: {
    container: "bg-emerald-500/[0.08]",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    container: "bg-amber-500/10",
    icon: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    container: "bg-gs-rose/10",
    icon: "text-gs-rose",
  },
  muted: {
    container: "bg-muted",
    icon: "text-muted-foreground",
  },
};

const SIZE_STYLES = {
  xs: {
    container: "h-4 w-4 rounded-md",
    icon: "h-2.5 w-2.5",
    radius: "rounded-md",
  },
  sm: {
    container: "h-7 w-7 rounded-lg",
    icon: "h-3.5 w-3.5",
    radius: "rounded-lg",
  },
  md: {
    container: "h-8 w-8 rounded-lg",
    icon: "h-4 w-4",
    radius: "rounded-lg",
  },
  lg: {
    container: "h-11 w-11 rounded-xl",
    icon: "h-5 w-5",
    radius: "rounded-xl",
  },
  hero: {
    container: "h-10 w-10 rounded-xl",
    icon: "h-6 w-6",
    radius: "rounded-xl",
  },
} as const;

export type GettingStartedIconSize = keyof typeof SIZE_STYLES;

export interface GettingStartedIconBadgeProps {
  name: GettingStartedIconName;
  size?: GettingStartedIconSize;
  variant?: GettingStartedIconVariant;
  /** Gradient fill on container (e.g. primary CTAs) */
  gradient?: boolean;
  /** Icon only — no pastel container (for use inside ImportModalHero wells) */
  bare?: boolean;
  className?: string;
}

export function GettingStartedIconBadge({
  name,
  size = "md",
  variant: variantOverride,
  gradient = false,
  bare = false,
  className,
}: GettingStartedIconBadgeProps) {
  const { Icon, variant: defaultVariant, filled } = ICON_MAP[name];
  const variant = variantOverride ?? defaultVariant;
  const styles = VARIANT_STYLES[variant];
  const sizeStyles = SIZE_STYLES[size];

  const iconEl = (
    <Icon
      className={cn(
        sizeStyles.icon,
        !bare && styles.icon,
        filled && "fill-current",
        bare && className
      )}
      strokeWidth={2}
      aria-hidden
    />
  );

  if (bare) {
    return <span className="inline-flex shrink-0 items-center justify-center">{iconEl}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        sizeStyles.container,
        sizeStyles.radius,
        gradient
          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md [&_svg]:text-primary-foreground"
          : styles.container,
        className
      )}
      aria-hidden
    >
      {iconEl}
    </span>
  );
}

/** Compact inline check (checklist rows) */
export function GettingStartedInlineCheck({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        className
      )}
      aria-hidden
    >
      <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
    </span>
  );
}
