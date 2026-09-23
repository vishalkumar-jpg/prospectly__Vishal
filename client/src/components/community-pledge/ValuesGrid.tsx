import {
  CheckCircle,
  Heart,
  Shield,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import {
  StaticIconCard,
  type StaticIconTone,
} from "@/components/static/StaticIconCard";

interface Value {
  icon: LucideIcon;
  tone: StaticIconTone;
  title: string;
  description: string;
}

const VALUES: Value[] = [
  {
    icon: Heart,
    tone: "rose",
    title: "Respect & Authenticity",
    description:
      "Be true to who you are. Speak honestly, listen well, and treat others with dignity. Real connection comes from being genuine.",
  },
  {
    icon: Shield,
    tone: "amethyst",
    title: "Professionalism",
    description:
      "Online, in person, or on the phone — present yourself with care. Polite language, thoughtful manners, and consideration for others.",
  },
  {
    icon: Users,
    tone: "sky",
    title: "Support & Generosity",
    description:
      "We don't wait for favors — we give first. Share knowledge, make introductions, connect folks. When one of us succeeds, it helps us all.",
  },
  {
    icon: Star,
    tone: "trust-green",
    title: "Positivity",
    description:
      "Offer encouragement rather than criticism. Aim to lift others up. Maintain a mindset of possibility, solutions, and gratitude.",
  },
  {
    icon: CheckCircle,
    tone: "amethyst",
    title: "Follow-Up & Accountability",
    description:
      "It's not enough to promise help or make a connection — see it through. If you commit to something, follow up. Own your actions. Keep your word.",
  },
  {
    icon: TrendingUp,
    tone: "rose",
    title: "Continuous Growth",
    description:
      "Stay curious. Learn from others, share insights, and embrace opportunities to grow both personally and professionally.",
  },
];

export function CommunityPledgeValuesGrid() {
  return (
    <StaticSection ariaLabelledBy="pledge-values-title">
      <StaticSectionHeading
        id="pledge-values-title"
        eyebrow="What we stand for"
        title="Our values"
        description="Six commitments every Prospectly member makes to each other."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {VALUES.map((v) => (
          <StaticIconCard
            key={v.title}
            icon={v.icon}
            tone={v.tone}
            title={v.title}
            description={v.description}
          />
        ))}
      </div>
    </StaticSection>
  );
}
