import { AlertCircle, Eye, EyeOff, FileKey } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import {
  StaticIconCard,
  type StaticIconTone,
} from "@/components/static/StaticIconCard";

interface Right {
  icon: LucideIcon;
  tone: StaticIconTone;
  title: string;
  description: string;
}

const RIGHTS: Right[] = [
  {
    icon: Eye,
    tone: "amethyst",
    title: "Right to Access",
    description:
      "View all data we have about you at any time through your account settings or by contacting us.",
  },
  {
    icon: FileKey,
    tone: "sky",
    title: "Right to Portability",
    description:
      "Export your data in standard formats to use with other services or for your own records.",
  },
  {
    icon: EyeOff,
    tone: "rose",
    title: "Right to Erasure",
    description:
      "Request deletion of your account and all associated data, subject to legal retention requirements.",
  },
  {
    icon: AlertCircle,
    tone: "trust-green",
    title: "Right to Correction",
    description:
      "Update or correct any inaccurate information we have about you at any time.",
  },
];

export function ConfidentialityUserRightsGrid() {
  return (
    <StaticSection ariaLabelledBy="conf-rights-title">
      <StaticSectionHeading
        id="conf-rights-title"
        eyebrow="Your rights"
        title="You have full control"
        description="Exercise any of these at any time — no questions asked."
      />
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
        {RIGHTS.map((r) => (
          <StaticIconCard
            key={r.title}
            icon={r.icon}
            tone={r.tone}
            title={r.title}
            description={r.description}
          />
        ))}
      </div>
    </StaticSection>
  );
}
