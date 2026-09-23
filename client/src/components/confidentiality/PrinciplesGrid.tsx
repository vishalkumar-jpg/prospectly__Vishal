import { EyeOff, FileKey, Lock, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import {
  StaticIconCard,
  type StaticIconTone,
} from "@/components/static/StaticIconCard";

interface Principle {
  icon: LucideIcon;
  tone: StaticIconTone;
  title: string;
  description: string;
  points: string[];
}

const PRINCIPLES: Principle[] = [
  {
    icon: Lock,
    tone: "amethyst",
    title: "Your Data, Your Control",
    description:
      "You maintain complete ownership over your data. We never sell, rent, or share your information without your explicit consent.",
    points: [
      "Full data ownership rights",
      "Granular sharing controls",
      "Export your data anytime",
      "Delete your account and data at will",
    ],
  },
  {
    icon: EyeOff,
    tone: "rose",
    title: "Privacy-First Design",
    description:
      "Every feature is built with privacy as a core requirement. We collect only what's necessary and protect it rigorously.",
    points: [
      "Minimal data collection",
      "Purpose-limited processing",
      "Clear retention policies",
      "Anonymous analytics where possible",
    ],
  },
  {
    icon: Users,
    tone: "sky",
    title: "Selective Information Sharing",
    description:
      "You choose exactly what information to share with whom. Professional networking while maintaining your privacy boundaries.",
    points: [
      "Contact-level privacy settings",
      "Opt-in sharing for all data",
      "Anonymous introduction requests",
      "Hidden profile options",
    ],
  },
  {
    icon: FileKey,
    tone: "trust-green",
    title: "Secure Data Handling",
    description:
      "All confidential data is encrypted, access-controlled, and monitored to prevent unauthorized disclosure.",
    points: [
      "End-to-end encryption for messages",
      "Encrypted data storage",
      "Access logging and monitoring",
      "Secure data transmission",
    ],
  },
];

export function ConfidentialityPrinciplesGrid() {
  return (
    <StaticSection ariaLabelledBy="conf-principles-title">
      <StaticSectionHeading
        id="conf-principles-title"
        eyebrow="Core principles"
        title="Our confidentiality commitments"
        description="Built on respect, transparency, and user empowerment."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <StaticIconCard
            key={p.title}
            icon={p.icon}
            tone={p.tone}
            title={p.title}
            description={p.description}
            features={p.points}
          />
        ))}
      </div>
    </StaticSection>
  );
}
