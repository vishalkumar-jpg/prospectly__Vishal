import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";

export function TransparencyPromisePanel() {
  return (
    <StaticSection ariaLabelledBy="transparency-promise-title">
      <StaticSectionHeading
        id="transparency-promise-title"
        eyebrow="Our promise"
        title="Transparency is a practice"
      />
      <div className="mx-auto max-w-3xl rounded-[24px] border border-home-border bg-home-bg-elevated p-7 sm:p-9">
        <p className="mb-4 text-[15px] leading-relaxed text-home-muted">
          Transparency isn&apos;t just a value for us — it&apos;s a practice we
          commit to every day. Being open about our operations, challenges,
          and successes builds trust and creates a better platform for
          everyone.
        </p>
        <p className="text-[15px] leading-relaxed text-home-muted">
          When we make mistakes, we own them publicly. When we make changes,
          we explain why. When we collect data, we tell you what and why.
          This commitment is fundamental to who we are and how we operate.
        </p>
        <div className="mt-6 border-t border-home-border pt-4">
          <p className="text-sm italic text-home-muted">
            “Trust is earned through consistent transparency and honest
            communication.” — Prospectly Team
          </p>
        </div>
      </div>
    </StaticSection>
  );
}
