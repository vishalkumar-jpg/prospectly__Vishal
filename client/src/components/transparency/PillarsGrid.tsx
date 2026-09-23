import { DollarSign, FileText, TrendingUp, Users } from "lucide-react";
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
  practices: string[];
}

const PILLARS: Pillar[] = [
  {
    icon: FileText,
    tone: "amethyst",
    title: "Clear Documentation",
    description:
      "Every policy, practice, and procedure is documented in plain language, easily accessible to everyone.",
    practices: [
      "Human-readable terms of service",
      "Plain language privacy policy",
      "Open API documentation",
      "Public feature roadmap",
    ],
  },
  {
    icon: DollarSign,
    tone: "trust-green",
    title: "Honest Pricing",
    description:
      "No hidden fees. What you see is what you pay, with clear explanations of every cost.",
    practices: [
      "Simple, transparent pricing tiers",
      "No hidden fees or charges",
      "Clear refund policy",
      "Usage-based billing explained",
    ],
  },
  {
    icon: Users,
    tone: "sky",
    title: "Open Communication",
    description:
      "We talk openly about changes, issues, and updates that affect your experience on the platform.",
    practices: [
      "Advance notice of changes",
      "Public incident reports",
      "Regular product updates",
      "Responsive customer support",
    ],
  },
  {
    icon: TrendingUp,
    tone: "rose",
    title: "Performance Metrics",
    description:
      "We share real data about platform performance, uptime, and service quality.",
    practices: [
      "Public uptime dashboard",
      "Service level agreements (SLAs)",
      "Response time metrics",
      "Regular status updates",
    ],
  },
];

export function TransparencyPillarsGrid() {
  return (
    <StaticSection ariaLabelledBy="transparency-pillars-title">
      <StaticSectionHeading
        id="transparency-pillars-title"
        eyebrow="Our principles"
        title="How we stay open"
        description="Four commitments we make to every member of the network."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <StaticIconCard
            key={p.title}
            icon={p.icon}
            tone={p.tone}
            title={p.title}
            description={p.description}
            features={p.practices}
          />
        ))}
      </div>
    </StaticSection>
  );
}
