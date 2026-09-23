import {
  ArrowRight,
  Search,
  Clock,
  History,
  Loader2,
  Calendar,
  Activity,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/formatter";
import { utcDayjs } from "@/lib/dayjs";

/** Compact trust ring tuned for the gradient hero (white-on-brand). */
function HeroTrustRing({ score }: { score: number }) {
  const size = 64;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(score / 10, 1));
  const dashoffset = circumference - pct * circumference;

  return (
    <div className="relative flex-shrink-0">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-white/25"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="stroke-white transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-lg font-extrabold">
        {score.toFixed(1)}
      </div>
    </div>
  );
}

interface PriorityActionsSummary {
  urgentIntros: { count: number };
  marketplaceOpportunities: { count: number };
}

interface DashboardHeroProps {
  welcomeMessage: string;
  creditBalance: number;
  creditBalanceLoading: boolean;
  onViewCreditHistory: () => void;
  trustScore: number;
  trustScoreLoading: boolean;
  priorityActions: PriorityActionsSummary | null | undefined;
}

export function DashboardHero({
  welcomeMessage,
  creditBalance,
  creditBalanceLoading,
  onViewCreditHistory,
  trustScore,
  trustScoreLoading,
  priorityActions,
}: DashboardHeroProps) {
  const navigate = useNavigate();

  const urgentCount = priorityActions?.urgentIntros.count ?? 0;
  const opportunityCount = priorityActions?.marketplaceOpportunities.count ?? 0;
  const showCreditPanel = creditBalance > 0 || creditBalanceLoading;
  const todayLabel = utcDayjs().format("ddd, MMM D");

  // Split "Welcome back, {name}!" so only the name can be color-highlighted.
  const greetingMatch = welcomeMessage.match(/^(Welcome back, )(.+?)(!*)$/);

  // Stack credit + trust cards vertically to match the reference design.
  const heroSideClass = "flex flex-col gap-3.5";

  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand-hero-gradient p-7 text-brand-foreground shadow-brand-card sm:px-10 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
      />
      <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
        {/* Left: greeting + CTAs */}
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Daily signal
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] backdrop-blur">
              <Calendar className="h-3 w-3" />
              {todayLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] backdrop-blur">
              <Activity className="h-3 w-3" />
              Live
            </span>
            {urgentCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {urgentCount} urgent action{urgentCount === 1 ? "" : "s"}
              </span>
            )}
            {opportunityCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] backdrop-blur">
                {opportunityCount} new opportunit
                {opportunityCount === 1 ? "y" : "ies"}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold leading-[1.12] tracking-[-0.02em] sm:text-[36px]">
            {greetingMatch ? (
              <>
                {greetingMatch[1]}
                <span className="text-brand-highlight italic">
                  {greetingMatch[2]}
                </span>
                {greetingMatch[3]}
              </>
            ) : (
              welcomeMessage
            )}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-[1.55] opacity-90">
            Here's what's happening with your network today. Turn signal into
            payouts.
          </p>

          <div className="mt-6 flex gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/prospecting/incoming-requests/inbox")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-brand-rose shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:flex-none sm:px-5"
            >
              <span className="sm:hidden">Pending Intro</span>
              <span className="hidden sm:inline">Respond to pending intro</span>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/prospecting/opportunities")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-3 text-sm font-semibold text-brand-foreground backdrop-blur transition-colors hover:bg-white/25 sm:flex-none sm:px-5"
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              <span className="sm:hidden">Marketplace</span>
              <span className="hidden sm:inline">Browse marketplace</span>
            </button>
          </div>
        </div>

        {/* Right: credit + trust panels */}
        <div className={heroSideClass}>
          {showCreditPanel && (
            <div className="rounded-2xl border border-white/20 bg-white/15 p-5 backdrop-blur">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-85">
                  Credit Balance
                </span>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/20">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="font-mono text-3xl font-extrabold tracking-tight">
                {creditBalanceLoading ? "..." : formatCurrency(creditBalance)}
              </div>
              <p className="mt-1 text-xs opacity-80">
                Earned from contact imports · usable for payouts
              </p>
              <div className="mt-3.5 flex gap-2">
                <button
                  type="button"
                  onClick={onViewCreditHistory}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/20 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/30"
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </button>
                <Link
                  to="/prospecting/transactions/payouts"
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-brand-rose transition-colors hover:bg-white/90"
                >
                  Payouts
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          <div
            className={`flex items-center gap-4 rounded-2xl border border-white/20 bg-white/15 p-5 backdrop-blur ${
              showCreditPanel ? "" : "lg:max-w-md"
            }`}
          >
            {trustScoreLoading ? (
              <Loader2 className="h-12 w-12 animate-spin opacity-80" />
            ) : (
              <HeroTrustRing score={trustScore} />
            )}
            <div className="min-w-0">
              <p className="text-[14px] font-bold">Trust Score</p>
              <p className="text-xs opacity-80">
                Complete more intros to unlock priority matching
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
