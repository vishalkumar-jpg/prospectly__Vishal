import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";

const PRACTICES = [
  {
    title: "Data Breach Notification",
    description:
      "In the unlikely event of a breach, we commit to notifying affected users within 72 hours with full details about the incident, its impact, and our response.",
    commitment: "< 72 hr notification",
  },
  {
    title: "Algorithm Transparency",
    description:
      "We explain how our matching algorithms work and what factors influence introduction recommendations, trust scores, and referral payout distributions.",
    commitment: "Open methodology",
  },
  {
    title: "Third-Party Services",
    description:
      "We clearly disclose all third-party services we use, why we use them, and what data is shared with them.",
    commitment: "Full disclosure",
  },
  {
    title: "Company Governance",
    description:
      "Information about our company structure, leadership, investors, and decision-making processes is publicly available.",
    commitment: "Public information",
  },
];

export function TransparencyOpenPractices() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="transparency-practices-title"
      withBackground
    >
      <StaticSectionHeading
        id="transparency-practices-title"
        eyebrow="Our commitments"
        title="Specific promises we make"
        description="Accountability in writing — not just intent."
      />
      <div className="space-y-4">
        {PRACTICES.map((p) => (
          <div
            key={p.title}
            className="flex flex-col gap-3 rounded-2xl border border-home-border bg-home-bg p-5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 md:flex-row md:items-center md:justify-between md:p-6"
          >
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-base font-extrabold tracking-tight text-home-fg">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-home-muted">
                {p.description}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-home-amethyst/20 bg-home-amethyst/10 px-3 py-1 text-xs font-semibold text-home-amethyst">
              {p.commitment}
            </span>
          </div>
        ))}
      </div>
    </StaticSection>
  );
}
