import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";

const REFERRAL_BENEFITS = [
  {
    title: "Trust Accelerates Connection",
    description:
      "Referrals come with built-in confidence. Trust reduces friction and speeds connections.",
  },
  {
    title: "Deeper Engagement",
    description:
      "Referred connections engage more deeply thanks to trusted first impressions.",
  },
  {
    title: "Network Effect",
    description:
      "Help someone, they help someone else. One referral creates compounding relationships.",
  },
  {
    title: "Quality Focus",
    description:
      "Referrals deliver higher-quality leads — already invested, more likely to convert.",
  },
];

export function CommunityPledgeReferralsSection() {
  return (
    <StaticSection ariaLabelledBy="pledge-referrals-title">
      <StaticSectionHeading
        id="pledge-referrals-title"
        eyebrow="Why it matters"
        title="Why referrals matter"
        description="More than winning new business — they reflect trust, credibility, and strong relationships."
      />
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2">
        {REFERRAL_BENEFITS.map((b) => (
          <article
            key={b.title}
            className="rounded-2xl border border-home-border bg-home-bg-elevated p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
          >
            <h3 className="mb-2 text-base font-extrabold tracking-tight text-home-fg">
              {b.title}
            </h3>
            <p className="text-sm leading-relaxed text-home-muted">
              {b.description}
            </p>
          </article>
        ))}
      </div>
    </StaticSection>
  );
}
