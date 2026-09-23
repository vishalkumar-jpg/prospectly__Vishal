import { Minimize, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./useScrollReveal";

export function GiveToGet() {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn(
        "home-reveal mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:px-10 max-[900px]:px-5 max-[900px]:py-12",
        visible && "home-reveal-visible",
      )}
    >
      <div className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-home-amethyst">
        How It Works
      </div>
      <h2 className="mb-2.5 text-center text-[28px] font-extrabold leading-tight tracking-tight text-home-fg max-[900px]:text-[28px] lg:text-[38px] lg:tracking-[-1px]">
        Built on Give-to-Get Principles
      </h2>
      <p className="mx-auto mb-12 max-w-[500px] text-center text-base text-home-muted">
        Every member plays both roles to create a thriving network of mutual
        success.
      </p>
      <div className="grid grid-cols-1 items-stretch gap-0 lg:grid-cols-[1fr_80px_1fr] max-[900px]:gap-5">
        <div
          className={cn(
            "rounded-[20px] border border-home-border bg-home-bg p-7 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 max-[900px]:p-6",
          )}
        >
          <div className="mb-4 flex items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-home-sky/10 text-home-sky">
              <Search className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <span className="mb-0.5 inline-block rounded-full bg-home-sky/10 px-2.5 py-0.5 text-[10px] font-bold text-home-sky">
                Requestor
              </span>
              <h3 className="text-xl font-extrabold tracking-tight text-home-fg">
                Need Warm Introductions?
              </h3>
            </div>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-home-muted">
            Stop cold calling. Get warm introductions to decision-makers and
            close 10x more deals through trusted connections.
          </p>
          <div className="relative mb-4 space-y-0 pl-4 before:absolute before:left-[27px] before:top-[18px] before:bottom-[18px] before:w-0.5 before:rounded-sm before:bg-gradient-to-b before:from-home-sky before:to-home-sky/15">
            <div className="relative flex items-center gap-3 py-3">
              <span className="relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full bg-home-sky text-[10px] font-extrabold text-white">
                1
              </span>
              <span className="text-[13px] font-medium text-home-fg">
                <strong className="font-bold">Upload prospects</strong> & set
                your criteria
              </span>
            </div>
            <div className="relative flex items-center gap-3 py-3">
              <span className="relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full bg-home-sky text-[10px] font-extrabold text-white">
                2
              </span>
              <span className="text-[13px] font-medium text-home-fg">
                <strong className="font-bold">Get matched</strong> with warm
                intro paths
              </span>
            </div>
            <div className="relative flex items-center gap-3 py-3">
              <span className="relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full bg-home-sky text-[10px] font-extrabold text-white">
                3
              </span>
              <span className="text-[13px] font-medium text-home-fg">
                <strong className="font-bold">Close deals</strong> & pay a
                referral payout
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 border-t border-home-border pt-3.5 text-xs text-home-muted">
            <b className="text-home-fg">
              For sales reps, business developers & entrepreneurs
            </b>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center gap-2 py-2 max-[900px]:flex-row max-[900px]:py-2">
          <div className="h-full w-0.5 flex-1 rounded-sm bg-gradient-to-b from-home-sky/15 to-home-amethyst/15 max-[900px]:h-0.5 max-[900px]:w-full max-[900px]:bg-gradient-to-r" />
          <div className="relative z-[2] grid h-12 w-12 place-items-center rounded-full border-2 border-home-border bg-home-bg text-home-muted shadow-home-bridge">
            <Minimize className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="h-full w-0.5 flex-1 rounded-sm bg-gradient-to-b from-home-sky/15 to-home-amethyst/15 max-[900px]:h-0.5 max-[900px]:w-full max-[900px]:bg-gradient-to-r" />
          <span
            className="absolute bottom-[10%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 animate-home-bridge-up rounded-full bg-home-sky max-[900px]:hidden"
            aria-hidden
          />
          <span
            className="absolute top-[10%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 animate-home-bridge-down rounded-full bg-home-amethyst max-[900px]:hidden"
            aria-hidden
          />
        </div>

        <div
          className={cn(
            "rounded-[20px] border border-home-border bg-home-bg p-7 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 max-[900px]:p-6",
          )}
        >
          <div className="mb-4 flex items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-home-amethyst/10 text-home-amethyst">
              <Users className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <span className="mb-0.5 inline-block rounded-full bg-home-amethyst/10 px-2.5 py-0.5 text-[10px] font-bold text-home-amethyst">
                Connector
              </span>
              <h3 className="text-xl font-extrabold tracking-tight text-home-fg">
                Have a Big Network?
              </h3>
            </div>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-home-muted">
            Monetize your connections. Make warm introductions and earn real
            referral payouts by helping others succeed.
          </p>
          <div className="relative mb-4 space-y-0 pl-4 before:absolute before:left-[27px] before:top-[18px] before:bottom-[18px] before:w-0.5 before:rounded-sm before:bg-gradient-to-b before:from-home-amethyst before:to-home-amethyst/15">
            <div className="relative flex items-center gap-3 py-3">
              <span className="relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full bg-home-amethyst text-[10px] font-extrabold text-white">
                1
              </span>
              <span className="text-[13px] font-medium text-home-fg">
                <strong className="font-bold">Import your network</strong>{" "}
                securely
              </span>
            </div>
            <div className="relative flex items-center gap-3 py-3">
              <span className="relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full bg-home-amethyst text-[10px] font-extrabold text-white">
                2
              </span>
              <span className="text-[13px] font-medium text-home-fg">
                <strong className="font-bold">Get matched</strong> to earning
                opportunities
              </span>
            </div>
            <div className="relative flex items-center gap-3 py-3">
              <span className="relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full bg-home-amethyst text-[10px] font-extrabold text-white">
                3
              </span>
              <span className="text-[13px] font-medium text-home-fg">
                <strong className="font-bold">Make intros</strong> & earn
                referral payouts
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 border-t border-home-border pt-3.5 text-xs text-home-muted">
            <b className="text-home-fg">
              For networkers, consultants & relationship builders
            </b>
          </div>
        </div>
      </div>
    </div>
  );
}
