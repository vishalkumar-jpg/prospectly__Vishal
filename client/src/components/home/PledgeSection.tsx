import {
  Ban,
  CheckCircle,
  Globe,
  Heart,
  Lock,
  Shield,
  Star,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./useScrollReveal";

const cells = [
  {
    icon: Star,
    title: "Quality Introductions",
    desc: "Relevant connections that benefit all parties.",
    iconClass: "bg-home-amethyst/10 text-home-amethyst",
  },
  {
    icon: Heart,
    title: "Trust & Respect",
    desc: "Professionalism and integrity always.",
    iconClass: "bg-home-rose/5 text-home-rose",
  },
  {
    icon: TrendingUp,
    title: "Growth Mindset",
    desc: "Warm intros help everyone grow.",
    iconClass: "bg-home-sky/10 text-home-sky",
  },
  {
    icon: Shield,
    title: "Contacts Stay Private",
    desc: "We never email or spam your contacts.",
    iconClass: "bg-home-amethyst/10 text-home-amethyst",
  },
];

const badges = [
  { icon: CheckCircle, label: "SOC 2 Type II" },
  { icon: Lock, label: "256-Bit Encryption" },
  { icon: Globe, label: "GDPR & CCPA" },
  { icon: Ban, label: "Zero Spam" },
];

export function PledgeSection() {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:px-10 max-[900px]:px-5 max-[900px]:py-12",
        "home-reveal",
        visible && "home-reveal-visible",
      )}
    >
      <div className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-home-amethyst">
        Community First
      </div>
      <h2 className="mb-2.5 text-center text-[28px] font-extrabold leading-tight tracking-tight text-home-fg max-[900px]:text-[28px] lg:text-[38px] lg:tracking-[-1px]">
        Community Pledge
      </h2>
      <p className="mx-auto mb-5 max-w-[500px] text-center text-base text-home-muted">
        Every member commits to building trust through quality introductions.
      </p>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((c) => (
          <div
            key={c.title}
            className="rounded-[14px] border border-home-border bg-home-bg px-4 py-6 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
          >
            <div
              className={cn(
                "mx-auto mb-2.5 grid h-9 w-9 place-items-center rounded-full",
                c.iconClass,
              )}
            >
              <c.icon className="h-[18px] w-[18px]" strokeWidth={2} />
            </div>
            <h4 className="mb-1 text-sm font-bold text-home-fg">{c.title}</h4>
            <p className="text-xs leading-snug text-home-muted">{c.desc}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {badges.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-1.5 rounded-lg border border-home-border bg-home-bg px-3.5 py-1.5 text-xs font-semibold text-home-muted"
          >
            <b.icon className="h-3.5 w-3.5 text-home-trust-green" />
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
