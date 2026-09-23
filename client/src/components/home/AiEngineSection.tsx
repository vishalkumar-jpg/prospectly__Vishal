import {
  Calendar,
  CheckCircle,
  Clock,
  Cpu,
  Mail,
  Search,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./useScrollReveal";

export function AiEngineSection() {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:px-10 max-[900px]:px-5 max-[900px]:py-12",
        "home-reveal",
        visible && "home-reveal-visible",
      )}
    >
      <div className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-home-amethyst">
        Intelligent Features
      </div>
      <h2 className="mb-2.5 text-center text-[28px] font-extrabold leading-tight tracking-tight text-home-fg max-[900px]:text-[28px] lg:text-[38px] lg:tracking-[-1px]">
        AI That Finds Your Best Connections
      </h2>
      <p className="mx-auto mb-4 max-w-[500px] text-center text-base text-home-muted">
        Prospectly analyzes your network and surfaces the warmest introduction
        paths automatically.
      </p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-home-border bg-home-bg p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 max-[900px]:gap-3 md:flex-row md:items-start md:gap-5">
          <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-home-rose/5 text-home-rose">
            <Target className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-lg font-bold text-home-fg">
              Smart Prospect Discovery
            </h3>
            <p className="mb-3 text-sm leading-relaxed text-home-muted">
              Our AI scans your network and matches you with prospects who are
              most likely to accept an introduction — prioritized by relevance,
              industry, and relationship strength.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-home-bg-elevated px-3 py-1 text-xs font-semibold text-home-muted">
                <CheckCircle className="h-3 w-3" />
                Intelligent prioritization
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-home-bg-elevated px-3 py-1 text-xs font-semibold text-home-muted">
                <Search className="h-3 w-3" />
                Hidden path discovery
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-home-bg-elevated px-3 py-1 text-xs font-semibold text-home-muted">
                <Zap className="h-3 w-3" />
                Real-time analysis
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-home-border bg-home-bg p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 max-[900px]:gap-3 md:flex-row md:items-start md:gap-5">
          <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-home-amethyst/10 text-home-amethyst">
            <Zap className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-lg font-bold text-home-fg">
              Automated Introduction Flow
            </h3>
            <p className="mb-3 text-sm leading-relaxed text-home-muted">
              From timing to messaging to scheduling — Prospectly handles the
              entire introduction workflow so you can focus on building
              relationships, not managing logistics.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-home-bg-elevated px-3 py-1 text-xs font-semibold text-home-muted">
                <Mail className="h-3 w-3" />
                Personalized requests
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-home-bg-elevated px-3 py-1 text-xs font-semibold text-home-muted">
                <Clock className="h-3 w-3" />
                Optimal timing
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-home-bg-elevated px-3 py-1 text-xs font-semibold text-home-muted">
                <Calendar className="h-3 w-3" />
                Auto-scheduling
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-home-border bg-home-bg p-6 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 max-[900px]:gap-3 md:flex-row md:items-start md:gap-5">
          <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-home-sky/10 text-home-sky">
            <Cpu className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-lg font-bold text-home-fg">
              Network Intelligence
            </h3>
            <p className="mb-3 text-sm leading-relaxed text-home-muted">
              Learns from every introduction to improve match quality over
              time. Predictive success scoring and ROI tracking help you
              maximize the value of every connection.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-home-bg-elevated px-3 py-1 text-xs font-semibold text-home-muted">
                <TrendingUp className="h-3 w-3" />
                Predictive scoring
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-home-bg-elevated px-3 py-1 text-xs font-semibold text-home-muted">
                <Target className="h-3 w-3" />
                ROI optimization
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-home-bg-elevated px-3 py-1 text-xs font-semibold text-home-muted">
                <Users className="h-3 w-3" />
                Pattern recognition
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
