import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Calendar,
  CheckCircle,
  DollarSign,
  Mail,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./useScrollReveal";
import { SimBgSvg } from "./SimBgSvg";

export function NetworkSimulator() {
  const [connections, setConnections] = useState(500);
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  const pct = ((connections - 100) / 4900) * 100;

  const sim = useMemo(() => {
    const c = connections;
    const ce = c;
    const cr = Math.round(c * 0.02);
    const cd = Math.max(1, Math.round(cr * 0.1));
    const r = 0.08 + (c / 5000) * 0.06;
    const wi = Math.round(c * r);
    const wm = Math.round(wi * 0.85);
    const wd = Math.round(wi * 0.3);
    const mult = wd > 0 && cd > 0 ? Math.round(wd / cd) : 10;
    const nv = c * 75;
    return {
      coldEmails: ce,
      coldReplies: cr,
      coldDeals: cd,
      warmIntros: wi,
      warmMeetings: wm,
      warmDeals: wd,
      mult,
      netValue: nv,
    };
  }, [connections]);

  return (
    <div className="relative overflow-hidden bg-home-sim">
      <div
        className="pointer-events-none absolute -left-[10%] -top-[10%] h-[60%] w-[40%] rounded-full bg-[radial-gradient(ellipse,hsl(var(--home-amethyst)/0.06),transparent_60%)] blur-[50px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[50%] w-[35%] rounded-full bg-[radial-gradient(ellipse,hsl(var(--home-rose)/0.04),transparent_60%)] blur-[50px]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <SimBgSvg />
      </div>
      <div
        ref={ref}
        className={cn(
          "relative z-[1] mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:px-10 max-[900px]:px-5 max-[900px]:py-12",
          "home-reveal",
          visible && "home-reveal-visible",
        )}
      >
        <div className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-home-amethyst">
          See the Difference
        </div>
        <h2 className="mb-2.5 text-center text-[28px] font-extrabold leading-tight tracking-tight text-home-fg max-[900px]:text-[28px] lg:text-[38px] lg:tracking-[-1px]">
          Why Warm Introductions Win
        </h2>
        <p className="mx-auto mb-12 max-w-[500px] text-center text-base text-home-muted">
          Adjust your network size and see the impact on your pipeline.
        </p>

        <div className="mx-auto max-w-[960px]">
          <div className="mb-8 text-center">
            <label
              id="connections-label"
              className="mb-1.5 block text-[15px] font-bold text-home-fg"
            >
              Your LinkedIn connections:{" "}
              <span className="font-mono text-home-rose">
                {connections.toLocaleString()}
              </span>
            </label>
            <div className="mx-auto flex max-w-[480px] items-center gap-3">
              <span className="shrink-0 text-[11px] font-semibold text-home-muted">
                100
              </span>
              <input
                id="connections-range"
                type="range"
                min={100}
                max={5000}
                step={50}
                value={connections}
                onChange={(e) => setConnections(Number(e.target.value))}
                aria-labelledby="connections-label"
                className={cn(
                  "h-1.5 flex-1 cursor-pointer appearance-none rounded-md bg-home-border",
                  "[&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                  "[&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-home-bg [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-home-amethyst [&::-webkit-slider-thumb]:to-home-rose",
                  "[&::-webkit-slider-thumb]:shadow-[0_2px_12px_hsl(var(--home-amethyst)/0.35)]",
                  "[&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:w-[22px] [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-home-bg",
                  "[&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-home-amethyst [&::-moz-range-thumb]:to-home-rose",
                  "[&::-moz-range-thumb]:shadow-[0_2px_12px_hsl(var(--home-amethyst)/0.35)]",
                )}
                style={{
                  background: `linear-gradient(90deg, hsl(var(--home-amethyst)) ${pct}%, hsl(var(--home-border)) ${pct}%)`,
                }}
              />
              <span className="shrink-0 text-[11px] font-semibold text-home-muted">
                5,000
              </span>
            </div>
          </div>

          <div className="mb-7 grid grid-cols-1 items-stretch gap-0 lg:grid-cols-[1fr_auto_1fr] max-[900px]:gap-3">
            <div className="rounded-2xl border border-home-border bg-home-bg px-6 py-7">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-home-bg-elevated px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-home-muted">
                <Activity className="h-3.5 w-3.5" />
                Cold Outreach
              </div>
              <div className="mb-1 font-mono text-[44px] font-extrabold leading-none tracking-tight text-home-cold">
                2%
              </div>
              <div className="mb-[18px] text-xs text-home-muted">
                response rate · industry average
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-1.5 text-home-muted">
                    <Mail className="h-3.5 w-3.5 text-home-cold-icon" />
                    Emails sent
                  </span>
                  <span className="font-mono font-extrabold text-home-cold">
                    {sim.coldEmails.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-1.5 text-home-muted">
                    <MessageSquare className="h-3.5 w-3.5 text-home-cold-icon" />
                    Replies
                  </span>
                  <span className="font-mono font-extrabold text-home-cold">
                    {sim.coldReplies}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-1.5 text-home-muted">
                    <CheckCircle className="h-3.5 w-3.5 text-home-cold-icon" />
                    Deals closed
                  </span>
                  <span className="font-mono font-extrabold text-home-cold">
                    {sim.coldDeals}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center py-2 max-[900px]:py-1">
              <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-home-border bg-home-bg text-[11px] font-extrabold text-home-muted shadow-home-vs">
                VS
              </div>
            </div>

            <div className="rounded-2xl border-[1.5px] border-home-amethyst/25 bg-home-bg px-6 py-7 shadow-[0_4px_20px_hsl(var(--home-amethyst)/0.08)]">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-home-rose/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-home-rose">
                <Zap className="h-3.5 w-3.5" />
                Warm Intros
              </div>
              <div className="home-text-brand-gradient mb-1 font-mono text-[44px] font-extrabold leading-none tracking-tight">
                85%
              </div>
              <div className="mb-[18px] text-xs text-home-muted">
                acceptance rate ·{" "}
                <span className="font-bold text-home-trust-green">
                  {sim.mult}x better
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-1.5 text-home-muted">
                    <Users className="h-3.5 w-3.5 text-home-amethyst" />
                    Warm intros
                  </span>
                  <span className="font-mono font-extrabold text-home-fg">
                    {sim.warmIntros}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-1.5 text-home-muted">
                    <Calendar className="h-3.5 w-3.5 text-home-amethyst" />
                    Meetings booked
                  </span>
                  <span className="font-mono font-extrabold text-home-fg">
                    {sim.warmMeetings}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-1.5 text-home-muted">
                    <CheckCircle className="h-3.5 w-3.5 text-home-amethyst" />
                    Deals closed
                  </span>
                  <span className="font-mono font-extrabold text-home-fg">
                    {sim.warmDeals}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mb-6 overflow-hidden rounded-2xl border-[1.5px] border-home-amethyst/20 bg-home-bg px-6 py-7 text-center before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-home-amethyst/5 before:to-home-rose/5">
            <div className="relative text-[11px] font-bold uppercase tracking-wide text-home-muted">
              Your estimated network value
            </div>
            <div className="relative home-text-brand-gradient font-mono text-5xl font-extrabold leading-none tracking-tight">
              ${sim.netValue.toLocaleString()}
            </div>
            <div className="relative text-[13px] text-home-muted">
              Potential annual earnings from{" "}
              <b className="text-home-fg">{connections.toLocaleString()}</b>{" "}
              connections ·{" "}
              <b className="text-home-fg">{sim.warmIntros}</b> matchable intros
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 max-[900px]:grid-cols-1">
            <div className="rounded-[14px] border border-home-border bg-home-bg p-5 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-md hover:shadow-black/5">
              <div className="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-xl bg-home-amethyst/15 text-home-amethyst">
                <Shield className="h-5 w-5" strokeWidth={2} />
              </div>
              <h4 className="mb-1 text-sm font-bold text-home-fg">
                Trusted Network
              </h4>
              <p className="text-xs leading-snug text-home-muted">
                Every introduction is vetted. Your contacts stay private and
                encrypted.
              </p>
            </div>
            <div className="rounded-[14px] border border-home-border bg-home-bg p-5 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-md hover:shadow-black/5">
              <div className="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-xl bg-home-rose/10 text-home-rose">
                <DollarSign className="h-5 w-5" strokeWidth={2} />
              </div>
              <h4 className="mb-1 text-sm font-bold text-home-fg">
                Earn Per Intro
              </h4>
              <p className="text-xs leading-snug text-home-muted">
                Average referral payout of $75–$500 for every successful warm
                introduction.
              </p>
            </div>
            <div className="rounded-[14px] border border-home-border bg-home-bg p-5 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-md hover:shadow-black/5">
              <div className="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-xl bg-home-sky/10 text-home-sky">
                <TrendingUp className="h-5 w-5" strokeWidth={2} />
              </div>
              <h4 className="mb-1 text-sm font-bold text-home-fg">
                10x Close Rate
              </h4>
              <p className="text-xs leading-snug text-home-muted">
                Warm introductions close deals 10x faster than cold emails or
                LinkedIn messages.
              </p>
            </div>
          </div>

          <div className="text-center">
            {/* Temporarily hidden */}
            {/* <button className="inline-flex items-center gap-2 rounded-xl border-0 bg-gradient-to-br from-home-amethyst to-home-rose px-9 py-3.5 text-[15px] font-bold text-white shadow-home-cta transition-transform hover:-translate-y-0.5 hover:shadow-home-cta-lg">
              Start Earning from Your Network →
            </button> */}
            <p className="mt-2 text-[11px] text-home-muted">
              Free to join · No credit card required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
