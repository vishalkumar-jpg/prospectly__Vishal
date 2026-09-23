import { Shield } from "lucide-react";
import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";

const CERTIFICATIONS = [
  {
    name: "SOC 2 Type II",
    description: "Audited annually for security, availability, and confidentiality.",
  },
  {
    name: "GDPR Compliant",
    description: "Full compliance with EU data protection regulations.",
  },
  {
    name: "CCPA Compliant",
    description: "California Consumer Privacy Act compliant.",
  },
  {
    name: "ISO 27001 Ready",
    description: "Following international security management standards.",
  },
];

export function SecurityCertificationsGrid() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="security-certs-title"
      withBackground
    >
      <StaticSectionHeading
        id="security-certs-title"
        eyebrow="Independently verified"
        title="Certifications & compliance"
        description="Audited to meet the highest industry standards."
      />
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
        {CERTIFICATIONS.map((cert) => (
          <article
            key={cert.name}
            className="flex items-start gap-4 rounded-2xl border border-home-border bg-home-bg p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-home-amethyst/10 text-home-amethyst"
              aria-hidden
            >
              <Shield className="h-6 w-6" />
            </span>
            <div>
              <h3 className="mb-1 text-base font-extrabold tracking-tight text-home-fg">
                {cert.name}
              </h3>
              <p className="text-sm text-home-muted">{cert.description}</p>
            </div>
          </article>
        ))}
      </div>
    </StaticSection>
  );
}
