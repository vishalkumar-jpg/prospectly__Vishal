import { Banknote, Briefcase, Building2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCompactSalaryRange,
  formatSalaryPeriod,
  isValidSalaryRange,
} from "@/utils/formatter";
import type { JobDetailsDisplayData } from "../job-details-mappers";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

interface JobDetailsGridProps {
  job: JobDetailsDisplayData;
}

export function PayoutHighlight({ job }: JobDetailsGridProps) {
  const payout = parseFloat(String(job.connectorPayout ?? ""));
  const payoutDisplay = isNaN(payout)
    ? "—"
    : `$${formatMoneyWithCommas(payout)}`;

  return (
    <section className="rounded-2xl border border-border bg-card px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex items-center gap-3.5">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-brand-amethyst/10 text-brand-amethyst">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Connector Referral Payout
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold leading-none tracking-tight text-brand-amethyst">
                {payoutDisplay}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden h-9 w-px bg-border sm:block" />
        <p className="flex-1 text-[13px] leading-relaxed text-muted-foreground">
          Your payout when your referred candidate is hired — or share the role
          to earn 50% when another connector closes it.
        </p>
      </div>
    </section>
  );
}

export function StatsStrip({ job }: JobDetailsGridProps) {
  const salaryMin = parseFloat(job.salaryRangeMin) || 0;
  const salaryMax = parseFloat(job.salaryRangeMax) || 0;
  const hasSalary = isValidSalaryRange(salaryMin, salaryMax);

  const stats: {
    label: string;
    icon: typeof Banknote;
    tint: string;
    value: React.ReactNode;
  }[] = [
    ...(hasSalary
      ? [
          {
            label: "Salary Range",
            icon: Banknote,
            tint: "bg-brand-success/10 text-brand-success border-brand-success/20",
            value: (
              <>
                {formatCompactSalaryRange(
                  salaryMin,
                  salaryMax,
                  job.salaryCurrency
                )}
                {job.salaryPeriod && (
                  <span className="inline-block whitespace-nowrap text-xs font-normal capitalize text-muted-foreground">
                    {" "}
                    / {formatSalaryPeriod(job.salaryPeriod)}
                  </span>
                )}
              </>
            ),
          },
        ]
      : []),
    {
      label: "Department",
      icon: Briefcase,
      tint: "bg-brand-amethyst/10 text-brand-amethyst border-brand-amethyst/20",
      value: job.departmentName || "—",
    },
    {
      label: "Industry",
      icon: Building2,
      tint: "bg-brand-sky/10 text-brand-sky border-brand-sky/20",
      value: job.industryName || "—",
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card",
        // Long salary needs more room: ~40% / 30% / 30% when all three stats show.
        stats.length === 3
          ? "sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)]"
          : "sm:grid-cols-2"
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "flex min-w-0 items-center gap-3.5 p-4 sm:p-5",
            "border-b last:border-b-0 sm:border-b-0",
            "sm:border-r sm:last:border-r-0"
          )}
        >
          <div
            className={cn(
              "grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border",
              stat.tint
            )}
          >
            <stat.icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </div>
            <div
              className={cn(
                "text-[15px] font-extrabold leading-tight",
                stat.label === "Salary Range"
                  ? "whitespace-normal break-words leading-snug"
                  : "truncate"
              )}
            >
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SalaryNote({ job }: JobDetailsGridProps) {
  if (!job.salaryRangeNotes) return null;
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-brand-sky/15 bg-brand-sky/5 px-4 py-3">
      <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky" />
      <div className="text-sm text-foreground">
        <span className="font-semibold">Salary note:</span>{" "}
        {job.salaryRangeNotes}
      </div>
    </div>
  );
}
