import React from "react";
import {
  Briefcase,
  Building2,
  Lightbulb,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./useScrollReveal";

interface AudienceCardProps {
  card: {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    title: string;
    desc: string;
    iconClass: string;
  };
}

const cards = [
  {
    icon: Briefcase,
    title: "Sales Teams",
    desc: "HubSpot, Salesloft & leadership alliances",
    iconClass: "bg-home-amethyst/10 text-home-amethyst",
  },
  {
    icon: Users,
    title: "Recruiters",
    desc: "NAPS, SHRM & global staffing groups",
    iconClass: "bg-home-rose/5 text-home-rose",
  },
  {
    icon: Building2,
    title: "Agencies",
    desc: "AMA, 4A's & digital networks",
    iconClass: "bg-home-sky/10 text-home-sky",
  },
  {
    icon: Sparkles,
    title: "Business Owners",
    desc: "BNI, Vistage, YPO & EO members",
    iconClass: "bg-home-trust-green/10 text-home-trust-green",
  },
  {
    icon: Lightbulb,
    title: "Consultants & Coaches",
    desc: "ICF, Forbes Coaches Council",
    iconClass: "bg-home-amethyst/10 text-home-amethyst",
  },
];

function AudienceCard({ card }: AudienceCardProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-home-border bg-home-bg p-5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1">
      <div
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
          card.iconClass,
        )}
      >
        <card.icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-home-fg">{card.title}</h4>
        <p className="text-[11px] leading-snug text-home-muted">
          {card.desc}
        </p>
      </div>
    </div>
  );
}

export function AudienceSection() {
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
        Who Uses Prospectly
      </div>
      <h2 className="mb-2.5 text-center text-[28px] font-extrabold leading-tight tracking-tight text-home-fg max-[900px]:text-[28px] lg:text-[38px] lg:tracking-[-1px]">
        Trusted by Professionals Who Connect
      </h2>
      <p className="mx-auto mb-4 max-w-[500px] text-center text-base text-home-muted">
        From sales teams to consultants — anyone with a network can earn.
      </p>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.slice(0, 3).map((c) => (
          <AudienceCard key={c.title} card={c} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cards.slice(3).map((c) => (
          <AudienceCard key={c.title} card={c} />
        ))}
      </div>
    </div>
  );
}
