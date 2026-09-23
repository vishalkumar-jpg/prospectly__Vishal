import { Handshake, Rocket, Target } from "lucide-react";
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
    icon: Target,
    tone: "sky",
    title: "Predictable Growth",
    description:
      "Making revenue forecasting reliable through systematic warm introductions and data-driven insights.",
  },
  {
    icon: Handshake,
    tone: "rose",
    title: "Community Power",
    description:
      "Leveraging networks and relationships to create meaningful business connections that drive mutual success.",
  },
  {
    icon: Rocket,
    tone: "amethyst",
    title: "Scalable Success",
    description:
      "Building systems that grow with your business without proportional cost increases or complexity.",
  },
];

export function OurStoryValuesGrid() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="our-story-values-title"
    >
      <StaticSectionHeading
        id="our-story-values-title"
        eyebrow="Our values"
        title="What drives us"
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
