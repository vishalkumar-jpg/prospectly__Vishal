import { cn } from "@/lib/utils";
import {
  GettingStartedIconBadge,
  type GettingStartedIconName,
} from "@/assets/getting-started/getting-started-icon-badge";

const CARDS: Array<{
  icon: GettingStartedIconName;
  title: string;
  body: string;
  value: string;
}> = [
  {
    icon: "download",
    title: "Import Contacts",
    body: "Connect your network securely. Earn credits instantly.",
    value: "Up to $60",
  },
  {
    icon: "handshake",
    title: "Make Introductions",
    body: "Get matched with opportunities. Earn a referral payout per intro.",
    value: "$100 – $500+",
  },
  {
    icon: "chart",
    title: "Grow Your Earnings",
    body: "Credits compound on payouts. More connections = premium deals.",
    value: "Credits + Payouts",
  },
];

export function GettingStartedHowEarn() {
  return (
    <section className="mb-8">
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <h2 className="text-xl font-extrabold tracking-tight">How You Earn</h2>
        <span className="rounded-full bg-gs-amethyst/10 px-3 py-1 text-[11px] font-bold text-gs-amethyst">
          3 simple steps
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {CARDS.map((c) => (
          <div
            key={c.title}
            className={cn(
              "rounded-2xl border border-border bg-card p-5 text-center transition-all",
              "hover:-translate-y-0.5 hover:border-gs-amethyst/50 hover:shadow-md"
            )}
          >
            <div className="mb-2.5 flex items-center justify-center">
              <GettingStartedIconBadge name={c.icon} size="lg" />
            </div>
            <h3 className="mb-1.5 text-base font-bold">{c.title}</h3>
            <p className="mb-2.5 text-[13px] leading-relaxed text-muted-foreground">
              {c.body}
            </p>
            <span className="inline-flex rounded-lg bg-gs-amethyst/10 px-3 py-1 font-mono text-base font-extrabold text-gs-amethyst">
              {c.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
