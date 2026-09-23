import { CheckCircle } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";

const COMMITMENTS = [
  {
    title: "Regular Security Audits",
    description:
      "Independent third-party audits conducted annually to verify our security controls.",
  },
  {
    title: "Employee Training",
    description:
      "All employees complete comprehensive security training and regular best-practice updates.",
  },
  {
    title: "Incident Response",
    description:
      "24/7 security operations with documented response procedures and rapid mitigation.",
  },
  {
    title: "Vulnerability Management",
    description:
      "Continuous scanning, regular penetration tests, and prompt patching of identified issues.",
  },
];

export function SecurityCommitmentPanel() {
  return (
    <StaticSection ariaLabelledBy="security-commit-title">
      <StaticSectionHeading
        id="security-commit-title"
        eyebrow="Our promise"
        title="How we stay ahead of threats"
      />
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
        {COMMITMENTS.map((c) => (
          <div
            key={c.title}
            className="rounded-2xl border border-home-border bg-home-bg-elevated p-6"
          >
            <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-home-fg">
              <CheckCircle
                className="h-5 w-5 text-home-trust-green"
                aria-hidden
              />
              {c.title}
            </h3>
            <p className="text-sm text-home-muted">{c.description}</p>
          </div>
        ))}
      </div>
    </StaticSection>
  );
}
