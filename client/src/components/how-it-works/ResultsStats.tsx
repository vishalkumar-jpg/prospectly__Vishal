import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";
import { cn } from "@/lib/utils";

const STATS = [
  {
    value: "85%",
    label: "Meeting rate",
    hint: "With warm introductions",
    tone: "text-home-amethyst",
    bg: "bg-home-amethyst/10 border-home-amethyst/20",
  },
  {
    value: "18%",
    label: "Meeting rate",
    hint: "With cold outreach",
    tone: "text-home-rose",
    bg: "bg-home-rose/10 border-home-rose/20",
  },
  {
    value: "70%",
    label: "Faster",
    hint: "Time to close deals",
    tone: "text-home-trust-green",
    bg: "bg-home-trust-green/10 border-home-trust-green/20",
  },
];

export function HowItWorksResultsStats() {
  return (
    <StaticSection
      elevated
      ariaLabelledBy="hiw-results-title"
    >
      <StaticSectionHeading
        id="hiw-results-title"
        eyebrow="Proven results"
        title="Warm introductions work better"
        description="See the dramatic difference warm introductions make compared to cold outreach."
      />
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-3">
        {STATS.map((s, i) => (
          <article
            key={i}
            className={cn(
              "rounded-2xl border p-7 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5",
              s.bg,
            )}
          >
            <div
              className={cn(
                "mb-2 font-mono text-[40px] font-extrabold leading-none tracking-tight",
                s.tone,
              )}
            >
              {s.value}
            </div>
            <div className="text-base font-bold text-home-fg">{s.label}</div>
            <div className="text-xs text-home-muted">{s.hint}</div>
          </article>
        ))}
      </div>
    </StaticSection>
  );
}
