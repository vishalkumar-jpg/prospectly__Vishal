import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroRightBgSvg } from "./HeroRightBgSvg";

const barHeights = [
  "h-[25%]",
  "h-[40%]",
  "h-[30%]",
  "h-[55%]",
  "h-[45%]",
  "h-[65%]",
  "h-[80%]",
  "h-full",
];

const barDelays = [
  "delay-home-bar-11",
  "delay-home-bar-115",
  "delay-home-bar-12",
  "delay-home-bar-125",
  "delay-home-bar-13",
  "delay-home-bar-135",
  "delay-home-bar-14",
  "delay-home-bar-145",
];

export function HeroMockup() {
  return (
    <div className="relative flex items-center justify-center pt-2 motion-reduce:animate-none animate-home-hero-fade-up delay-home-hero-04 opacity-0 max-[900px]:motion-reduce:animate-none">
      <div
        className="pointer-events-none absolute inset-[-40px] z-0 max-[900px]:inset-[-24px]"
        aria-hidden
      >
        <HeroRightBgSvg />
      </div>
      <div
        className={cn(
          "relative z-[1] w-full max-w-[480px] overflow-visible rounded-[20px] border border-home-border bg-home-bg shadow-home-mockup",
          "motion-safe:animate-home-mockup-float max-[900px]:mx-auto max-[900px]:max-w-[400px] max-[900px]:motion-reduce:animate-none max-[600px]:max-w-full"
        )}
      >
        <div className="relative z-[1] flex items-center gap-2 rounded-t-[20px] border-b border-home-border bg-home-bg px-4 py-2.5">
          <div className="grid h-[22px] w-[22px] place-items-center rounded-md home-brand-gradient">
            <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-xs font-bold tracking-tight text-home-fg">
            Prospectly
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-home-blink-slow rounded-full bg-home-trust-green" />
            <div className="grid h-[22px] w-[22px] place-items-center rounded-full bg-home-rose text-[9px] font-bold text-white">
              Y
            </div>
          </div>
        </div>
        <div className="relative z-[1] overflow-hidden rounded-b-[20px] bg-home-bg px-4 pt-4 pb-4">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-[10px] bg-home-bg-elevated py-2.5 text-center">
              <div className="home-text-brand-gradient mb-0.5 font-mono text-lg font-extrabold leading-none">
                $8,420
              </div>
              <div className="text-[8px] font-semibold uppercase tracking-wide text-home-muted">
                Earned
              </div>
            </div>
            <div className="rounded-[10px] bg-home-bg-elevated py-2.5 text-center">
              <div className="mb-0.5 font-mono text-lg font-extrabold leading-none text-home-trust-green">
                47
              </div>
              <div className="text-[8px] font-semibold uppercase tracking-wide text-home-muted">
                Intros Made
              </div>
            </div>
            <div className="rounded-[10px] bg-home-bg-elevated py-2.5 text-center">
              <div className="mb-0.5 font-mono text-lg font-extrabold leading-none text-home-sky">
                1,247
              </div>
              <div className="text-[8px] font-semibold uppercase tracking-wide text-home-muted">
                Connections
              </div>
            </div>
          </div>
          <div className="mb-3 rounded-[10px] border border-home-border p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-[10px] font-bold text-home-fg">
                Monthly Earnings
              </div>
              <div className="rounded bg-home-trust-green/10 px-1.5 py-0.5 text-[8px] font-bold text-home-trust-green">
                ↑ 47%
              </div>
            </div>
            <div className="flex h-12 items-end gap-[3px]">
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 origin-bottom scale-y-0 rounded-t-[3px] motion-safe:animate-home-bar-up",
                    barDelays[i],
                    i <= 3 && "bg-home-amethyst/10",
                    (i === 4 || i === 5) && "bg-home-amethyst/15",
                    i === 6 &&
                      "bg-gradient-to-t from-home-amethyst/15 to-home-amethyst",
                    i === 7 &&
                      "bg-gradient-to-t from-home-rose/15 to-home-rose",
                    h
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg bg-home-bg-elevated px-2.5 py-2 motion-safe:animate-home-feed-in opacity-0",
                "delay-home-bar-16"
              )}
            >
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-home-amethyst to-home-rose text-[9px] font-bold text-white">
                S
              </div>
              <div className="min-w-0 flex-1 text-[9px] leading-snug text-home-muted">
                <span className="font-semibold text-home-fg">
                  Intro Matched
                </span>{" "}
                — Sarah T. → VP Sales @ Stripe
              </div>
              <div className="shrink-0 text-[10px] font-extrabold text-home-amethyst">
                Pending
              </div>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg bg-home-bg-elevated px-2.5 py-2 motion-safe:animate-home-feed-in opacity-0",
                "delay-home-1.8"
              )}
            >
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-home-sky to-home-linkedin text-[9px] font-bold text-white">
                M
              </div>
              <div className="min-w-0 flex-1 text-[9px] leading-snug text-home-muted">
                <span className="font-semibold text-home-fg">
                  Payout Received
                </span>{" "}
                — Marcus C. intro completed
              </div>
              <div className="shrink-0 text-[10px] font-extrabold text-home-trust-green">
                +$580
              </div>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg bg-home-bg-elevated px-2.5 py-2 motion-safe:animate-home-feed-in opacity-0",
                "delay-home-bar-20"
              )}
            >
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-home-trust-green to-home-avatar-g2 text-[9px] font-bold text-white">
                A
              </div>
              <div className="min-w-0 flex-1 text-[9px] leading-snug text-home-muted">
                <span className="font-semibold text-home-fg">New Match</span> —
                Aisha P. → CTO @ Fintech
              </div>
              <div className="shrink-0 text-[10px] font-extrabold text-home-amethyst">
                $200
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
