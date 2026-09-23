import { Building, Globe, Sparkles, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import {
  StaticIconCard,
  type StaticIconTone,
} from "@/components/static/StaticIconCard";

interface Pillar {
  icon: LucideIcon;
  tone: StaticIconTone;
  title: string;
  description: string;
}

const PILLARS: Pillar[] = [
  {
    icon: Building,
    tone: "amethyst",
    title: "Foundation",
    description:
      "Prospectly was founded with a revolutionary vision: transform how businesses find and connect with their ideal prospects through warm introductions and community-driven networking.",
  },
  {
    icon: Sparkles,
    tone: "rose",
    title: "Innovation",
    description:
      "Our proprietary trust-based matching algorithm and patent-pending technology set us apart, enabling businesses to access high-quality prospects through verified network connections.",
  },
  {
    icon: Globe,
    tone: "sky",
    title: "Platform",
    description:
      "Today, Prospectly operates a diversified platform featuring warm introduction marketplaces, AI-powered outreach tools, and reward-based prospect generation.",
  },
  {
    icon: TrendingUp,
    tone: "trust-green",
    title: "Business Model",
    description:
      "We generate revenue through subscription memberships, our payout marketplace, and premium AI features — creating win-win outcomes for every participant.",
  },
];

export function OurStoryWhoWeAre() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="our-story-whoweare-title"
      withBackground
    >
      <StaticSectionHeading
        id="our-story-whoweare-title"
        eyebrow="Who we are"
        title="Foundation, innovation & vision"
        description="The building blocks behind the Prospectly platform."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <StaticIconCard
            key={p.title}
            icon={p.icon}
            tone={p.tone}
            title={p.title}
            description={p.description}
          />
        ))}
      </div>
    </StaticSection>
  );
}
