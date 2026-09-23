import { Banknote, Briefcase, Building2, type LucideIcon } from "lucide-react";
import {
  formatCompactSalaryRange,
  formatSalaryPeriod,
  isValidSalaryRange,
} from "@/utils/formatter";
import { cn } from "@/lib/utils";
import type { JobFormData } from "../types";

interface LivePreviewStatsProps {
  formData: JobFormData;
  industryName: string;
  departmentName: string;
}

export function LivePreviewStats({
  formData,
  industryName,
  departmentName,
}: LivePreviewStatsProps) {
  const salaryMin = formData.salaryRangeMin || 0;
  const salaryMax = formData.salaryRangeMax || 0;
  const hasValidSalary = isValidSalaryRange(salaryMin, salaryMax);

  const stats: {
    label: string;
    icon: LucideIcon;
    tint: string;
    value: React.ReactNode;
  }[] = [
    ...(hasValidSalary
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
                  formData.salaryCurrency
                )}
                {formData.salaryPeriod && (
                  <span className="inline-block whitespace-nowrap text-xs font-normal capitalize text-muted-foreground">
                    {" "}
                    / {formatSalaryPeriod(formData.salaryPeriod)}
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
      value: departmentName,
    },
    {
      label: "Industry",
      icon: Building2,
      tint: "bg-brand-sky/10 text-brand-sky border-brand-sky/20",
      value: industryName,
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card",
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
