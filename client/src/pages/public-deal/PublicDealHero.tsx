import { Sparkles, ShieldCheck, Eye } from "lucide-react";
import type { PublicDealData } from "./types";

interface PublicDealHeroProps {
  deal: PublicDealData;
}

export function PublicDealHero({ deal }: PublicDealHeroProps) {
  const prospectName = deal.prospect.name?.trim();

  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl bg-brand-hero-gradient p-7 text-white shadow-brand-card sm:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
      />
      <div className="relative">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
            <Sparkles className="h-3 w-3" />
            Warm Intro Opportunity
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
            <ShieldCheck className="h-3 w-3" />
            Verified
          </span>
        </div>
        <h1 className="mb-3.5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-[42px]">
          {prospectName ? (
            <>
              Help us meet{" "}
              <span className="text-brand-highlight italic">
                {prospectName}
              </span>{" "}
              and earn a referral reward.
            </>
          ) : (
            <>Make a warm intro and earn a referral reward.</>
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-white/95">
          {deal.viewCount > 0 && (
            <span className="inline-flex items-center gap-2">
              <Eye className="h-4 w-4 opacity-85" />
              <b className="font-bold">{deal.viewCount}</b> views
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
