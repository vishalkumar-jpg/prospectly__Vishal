import { StaticSection } from "@/components/static/StaticSection";
import { StaticSectionHeading } from "@/components/static/StaticSectionHeading";

const METRICS = [
  {
    metric: "Platform uptime",
    value: "99.9%",
    period: "Last 12 months",
    tone: "text-home-amethyst",
  },
  {
    metric: "Live chat response",
    value: "< 2 min",
    period: "Typical support time",
    tone: "text-home-sky",
  },
  {
    metric: "User satisfaction",
    value: "4.8 / 5.0",
    period: "Last quarter",
    tone: "text-home-rose",
  },
  {
    metric: "Data requests fulfilled",
    value: "100%",
    period: "Within legal timeframe",
    tone: "text-home-trust-green",
  },
];

export function TransparencyMetricsGrid() {
  return (
    <StaticSection ariaLabelledBy="transparency-metrics-title">
      <StaticSectionHeading
        id="transparency-metrics-title"
        eyebrow="By the numbers"
        title="How we're performing today"
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => (
          <div
            key={m.metric}
            className="rounded-2xl border border-home-border bg-home-bg-elevated p-6 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
          >
            <div
              className={`mb-2 font-mono text-[28px] font-extrabold tracking-tight ${m.tone}`}
            >
              {m.value}
            </div>
            <div className="text-sm font-semibold text-home-fg">
              {m.metric}
            </div>
            <div className="mt-0.5 text-xs text-home-muted">{m.period}</div>
          </div>
        ))}
      </div>
    </StaticSection>
  );
}
