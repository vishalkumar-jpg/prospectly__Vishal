import { TrendingUp, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./useScrollReveal";
import { ResultsBgSvg } from "./ResultsBgSvg";

function Star() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function ResultsSection() {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <div className="relative overflow-hidden bg-home-bg">
      <div
        className="pointer-events-none absolute -right-[5%] -top-[15%] h-[60%] w-[35%] rounded-full bg-[radial-gradient(ellipse,hsl(var(--home-amethyst)/0.05),transparent_60%)] blur-[50px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[10%] left-[10%] h-[50%] w-[30%] rounded-full bg-[radial-gradient(ellipse,hsl(var(--home-rose)/0.04),transparent_60%)] blur-[50px]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <ResultsBgSvg />
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
          Proven Results
        </div>
        <h2 className="mb-2.5 text-center text-[28px] font-extrabold leading-tight tracking-tight text-home-fg max-[900px]:text-[28px] lg:text-[38px] lg:tracking-[-1px]">
          Real Numbers From Real Members
        </h2>
        <p className="mx-auto mb-10 max-w-[500px] text-center text-base text-home-muted">
          See why professionals trust warm introductions over cold outreach.
        </p>

        <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3 max-[900px]:grid-cols-1">
          <div className="flex items-center gap-4 rounded-2xl border border-home-border bg-home-bg-elevated p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-home-amethyst/15 text-home-amethyst">
              <TrendingUp className="h-[22px] w-[22px]" strokeWidth={2} />
            </div>
            <div>
              <div className="home-text-brand-gradient font-mono text-[32px] font-extrabold leading-none tracking-tight">
                10x
              </div>
              <div className="text-xs text-home-muted">
                higher close rate vs cold outreach
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-home-border bg-home-bg-elevated p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-home-trust-green/10 text-home-trust-green">
              <DollarSign className="h-[22px] w-[22px]" strokeWidth={2} />
            </div>
            <div>
              <div className="font-mono text-[32px] font-extrabold leading-none tracking-tight text-home-trust-green">
                $2.4M
              </div>
              <div className="text-xs text-home-muted">
                paid to connectors in referral payouts
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-home-border bg-home-bg-elevated p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-home-sky/10 text-home-sky">
              <Users className="h-[22px] w-[22px]" strokeWidth={2} />
            </div>
            <div>
              <div className="font-mono text-[32px] font-extrabold leading-none tracking-tight text-home-sky">
                25K+
              </div>
              <div className="text-xs text-home-muted">
                active members across 101 countries
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-home-border bg-home-bg-elevated p-7 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex gap-0.5 text-home-amethyst">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} />
                ))}
              </div>
              <span className="rounded-lg bg-home-amethyst/15 px-2.5 py-1 text-[10px] font-bold text-home-amethyst">
                8 VPs connected
              </span>
            </div>
            <p className="mb-[18px] flex-1 text-[15px] leading-relaxed text-home-muted">
              &quot;Through warm introductions, I connected with
              decision-makers who were actually interested. 15 quality
              connections in just 6 weeks — something cold outreach never
              achieved in a year.&quot;
            </p>
            <div className="flex items-center gap-3 border-t border-home-border pt-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-home-amethyst to-home-avatar-p2 text-[13px] font-bold text-white">
                MR
              </div>
              <div>
                <div className="text-[13px] font-bold text-home-fg">
                  Marcus Rodriguez
                </div>
                <div className="text-[11px] text-home-muted">
                  VP Sales, TechFlow
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col rounded-2xl border border-home-border bg-home-bg-elevated p-7 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex gap-0.5 text-home-rose">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} />
                ))}
              </div>
              <span className="rounded-lg bg-home-rose/10 px-2.5 py-1 text-[10px] font-bold text-home-rose">
                12 VC intros
              </span>
            </div>
            <p className="mb-[18px] flex-1 text-[15px] leading-relaxed text-home-muted">
              &quot;Warm intros to VCs was game-changing. Investors were excited
              to meet because the connection was trusted. First month earned
              more than my entire outreach budget.&quot;
            </p>
            <div className="flex items-center gap-3 border-t border-home-border pt-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-home-rose to-home-avatar-r2 text-[13px] font-bold text-white">
                DK
              </div>
              <div>
                <div className="text-[13px] font-bold text-home-fg">
                  David Kim
                </div>
                <div className="text-[11px] text-home-muted">
                  CEO, DataSync Pro
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
