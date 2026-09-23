import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";

const CATEGORIES = [
  {
    category: "Contact Information",
    description: "Names, email addresses, phone numbers, and company details.",
    visibility: "You control who sees each field.",
    retention: "Kept until you delete or remove contacts.",
  },
  {
    category: "Communication Data",
    description:
      "Messages, introduction requests, and campaign interactions.",
    visibility: "Only shared with intended recipients.",
    retention: "Retained for service delivery and compliance.",
  },
  {
    category: "Usage Analytics",
    description: "How you use the platform, to improve our services.",
    visibility: "Aggregated and anonymized.",
    retention: "90 days for detailed logs, longer for aggregates.",
  },
  {
    category: "Financial Information",
    description: "Payment details and transaction history.",
    visibility: "Never shared — processed by certified payment partners.",
    retention: "As required by law and tax regulations.",
  },
];

export function ConfidentialityDataCategories() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="conf-data-title"
      withBackground
    >
      <StaticSectionHeading
        id="conf-data-title"
        eyebrow="Data handling"
        title="How we handle your data"
        description="Transparent about what we collect, why, and how long we keep it."
      />
      <div className="space-y-3">
        {CATEGORIES.map((c) => (
          <article
            key={c.category}
            className="rounded-2xl border border-home-border bg-home-bg p-5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.2fr]">
              <div>
                <h3 className="mb-1 text-sm font-extrabold tracking-tight text-home-fg">
                  {c.category}
                </h3>
                <p className="text-sm text-home-muted">{c.description}</p>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-home-amethyst">
                  Visibility
                </div>
                <p className="text-sm text-home-fg">{c.visibility}</p>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-home-amethyst">
                  Retention
                </div>
                <p className="text-sm text-home-fg">{c.retention}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </StaticSection>
  );
}
