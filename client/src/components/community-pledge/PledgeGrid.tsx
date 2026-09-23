import {
  CheckCircle,
  Handshake,
  Heart,
  Shield,
  Star,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import { cn } from "@/lib/utils";

interface PledgeValue {
  keyword: string;
  icon: LucideIcon;
  description: string;
  iconClass: string;
}

const PLEDGE: PledgeValue[] = [
  {
    keyword: "Respectful",
    icon: Heart,
    description: "Treat every member with dignity",
    iconClass: "bg-home-rose/10 text-home-rose",
  },
  {
    keyword: "Kind",
    icon: Users,
    description: "Show warmth in all interactions",
    iconClass: "bg-home-amethyst/10 text-home-amethyst",
  },
  {
    keyword: "Professional",
    icon: Shield,
    description: "Maintain high standards",
    iconClass: "bg-home-sky/10 text-home-sky",
  },
  {
    keyword: "Generous",
    icon: Handshake,
    description: "Give time and knowledge freely",
    iconClass: "bg-home-trust-green/10 text-home-trust-green",
  },
  {
    keyword: "Reliable",
    icon: CheckCircle,
    description: "Follow through on commitments",
    iconClass: "bg-home-amethyst/10 text-home-amethyst",
  },
  {
    keyword: "Positive",
    icon: Star,
    description: "Contribute constructively",
    iconClass: "bg-home-rose/10 text-home-rose",
  },
  {
    keyword: "Thoughtful",
    icon: TrendingUp,
    description: "Make meaningful connections",
    iconClass: "bg-home-sky/10 text-home-sky",
  },
  {
    keyword: "Giving",
    icon: UserCheck,
    description: "Help others succeed first",
    iconClass: "bg-home-trust-green/10 text-home-trust-green",
  },
];

export function CommunityPledgeGrid() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="pledge-grid-title"
      withBackground
    >
      <StaticSectionHeading
        id="pledge-grid-title"
        eyebrow="The pledge"
        title={
          <>
            Every member commits to being{" "}
            <span className="home-text-brand-gradient">one of us</span>.
          </>
        }
        description="Eight promises that shape the Prospectly community."
      />
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLEDGE.map((p) => (
          <div
            key={p.keyword}
            className="rounded-2xl border border-home-border bg-home-bg p-5 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
          >
            <span
              className={cn(
                "mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full",
                p.iconClass,
              )}
              aria-hidden
            >
              <p.icon className="h-5 w-5" />
            </span>
            <h3 className="mb-1 text-sm font-extrabold tracking-tight text-home-fg">
              {p.keyword}
            </h3>
            <p className="text-xs text-home-muted">{p.description}</p>
          </div>
        ))}
      </div>
    </StaticSection>
  );
}
