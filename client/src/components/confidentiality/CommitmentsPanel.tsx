import { CheckCircle, Eye, Lock, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";

interface Commitment {
  icon: LucideIcon;
  title: string;
  description: string;
}

const COMMITMENTS: Commitment[] = [
  {
    icon: Shield,
    title: "We Never Sell Your Data",
    description:
      "Your information is never sold, rented, or shared with advertisers or third parties for marketing purposes.",
  },
  {
    icon: Eye,
    title: "Transparent Practices",
    description:
      "We clearly disclose how we use your data and notify you of any changes to our practices.",
  },
  {
    icon: Lock,
    title: "Secure by Default",
    description:
      "Privacy settings are secure by default — you explicitly opt in to share information, never opt out.",
  },
  {
    icon: CheckCircle,
    title: "Rapid Response",
    description:
      "We respond to privacy requests within 48 hours and complete them within the legally required timeframe.",
  },
];

export function ConfidentialityCommitmentsPanel() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="conf-commitments-title"
    >
      <StaticSectionHeading
        id="conf-commitments-title"
        eyebrow="Our commitments"
        title="Promises we keep"
      />
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
        {COMMITMENTS.map((c) => (
          <div
            key={c.title}
            className="rounded-2xl border border-home-border bg-home-bg p-5"
          >
            <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-home-fg">
              <c.icon
                className="h-5 w-5 text-home-amethyst"
                aria-hidden
              />
              {c.title}
            </h3>
            <p className="text-sm leading-relaxed text-home-muted">
              {c.description}
            </p>
          </div>
        ))}
      </div>
    </StaticSection>
  );
}
