import {
  AlertTriangle,
  Eye,
  FileCheck,
  Key,
  Lock,
  Server,
} from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import { StaticIconCard, type StaticIconTone } from "@/components/static/StaticIconCard";
import type { LucideIcon } from "lucide-react";

interface Pillar {
  icon: LucideIcon;
  tone: StaticIconTone;
  title: string;
  description: string;
  features: string[];
}

const PILLARS: Pillar[] = [
  {
    icon: Lock,
    tone: "amethyst",
    title: "Enterprise-Grade Encryption",
    description:
      "All data is encrypted in transit using TLS 1.3 and at rest using AES-256 — the same standard used by banks and government agencies.",
    features: [
      "256-bit AES encryption at rest",
      "TLS 1.3 for data in transit",
      "End-to-end encryption for sensitive data",
      "Encrypted database backups",
    ],
  },
  {
    icon: Server,
    tone: "sky",
    title: "Secure Infrastructure",
    description:
      "Built on industry-leading cloud platforms with multiple layers of security controls and redundancy.",
    features: [
      "SOC 2 Type II certified infrastructure",
      "Regular penetration testing",
      "DDoS protection and mitigation",
      "99.9% uptime SLA with redundancy",
    ],
  },
  {
    icon: Eye,
    tone: "rose",
    title: "Privacy by Design",
    description:
      "Privacy is built into every feature from the ground up — your data is protected and used only as you intend.",
    features: [
      "GDPR and CCPA compliant",
      "Data minimization principles",
      "User-controlled data sharing",
      "Right to deletion and portability",
    ],
  },
  {
    icon: Key,
    tone: "trust-green",
    title: "Access Control",
    description:
      "Multi-layered access controls ensure only authorized individuals can reach systems and data.",
    features: [
      "Multi-factor authentication (MFA)",
      "Role-based access control (RBAC)",
      "Session management and timeouts",
      "Regular access audits",
    ],
  },
  {
    icon: AlertTriangle,
    tone: "amethyst",
    title: "Threat Detection",
    description:
      "Advanced monitoring and detection systems work 24/7 to identify and respond to potential security threats.",
    features: [
      "Real-time threat monitoring",
      "Automated incident response",
      "Security information & event management (SIEM)",
      "24/7 security operations center",
    ],
  },
  {
    icon: FileCheck,
    tone: "sky",
    title: "Compliance & Auditing",
    description:
      "Regular audits and certifications ensure we maintain the highest security and compliance standards.",
    features: [
      "SOC 2 Type II certified",
      "Annual third-party security audits",
      "Comprehensive audit logging",
      "Regular compliance reviews",
    ],
  },
];

export function SecurityPillarsGrid() {
  return (
    <StaticSection ariaLabelledBy="security-pillars-title">
      <StaticSectionHeading
        id="security-pillars-title"
        eyebrow="How we protect you"
        title="Our security framework"
        description="Comprehensive, multi-layered security protecting your data at every level."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((p) => (
          <StaticIconCard
            key={p.title}
            icon={p.icon}
            tone={p.tone}
            title={p.title}
            description={p.description}
            features={p.features}
          />
        ))}
      </div>
    </StaticSection>
  );
}
