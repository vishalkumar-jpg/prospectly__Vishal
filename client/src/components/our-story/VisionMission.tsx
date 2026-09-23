import { Rocket, Target } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import { StaticIconCard } from "@/components/static/StaticIconCard";

export function OurStoryVisionMission() {
  return (
    <StaticSection ariaLabelledBy="our-story-vm-title">
      <StaticSectionHeading
        id="our-story-vm-title"
        eyebrow="Why we exist"
        title="Vision & mission"
      />
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
        <StaticIconCard
          icon={Target}
          tone="sky"
          title="Vision"
          description="Create predictable revenue growth for every business in the global marketplace through innovative networking solutions."
        />
        <StaticIconCard
          icon={Rocket}
          tone="amethyst"
          title="Mission"
          description="Connect businesses with high-quality prospects to make them more profitable and successful through the power of warm introductions."
        />
      </div>
    </StaticSection>
  );
}
