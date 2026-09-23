import { Trophy, DollarSign } from "lucide-react";
import {
  useIndustries,
  useDepartments,
} from "@/hooks/useRecruitmentMasterData";
import type { JobFormData } from "./types";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";
import { LivePreviewHero } from "./components/LivePreviewHero";
import { LivePreviewDetails } from "./components/LivePreviewDetails";
import { LivePreviewStats } from "./components/LivePreviewStats";

interface LivePreviewPanelProps {
  formData: JobFormData;
}

export default function LivePreviewPanel({ formData }: LivePreviewPanelProps) {
  const { industries } = useIndustries();
  const { departments } = useDepartments();

  const industryName =
    industries.find((i) => String(i.id) === formData.industry)?.name ||
    "General";
  const departmentName =
    departments.find((d) => String(d.id) === formData.department)?.name ||
    "General";

  const successFeeAmount = formData.successFeeAmount || 0;
  const showSuccessFee = formData.hasSuccessFee && successFeeAmount > 0;
  const hasProbationPeriod = formData.probationPeriodDays > 0;

  const requiredSkills = formData.requiredSkills ?? [];
  const preferredSkills = formData.preferredSkills ?? [];

  return (
    <div className="space-y-6 text-foreground">
      <LivePreviewHero formData={formData} />

      {/* Success bonus highlight */}
      {showSuccessFee && (
        <section className="rounded-2xl border border-border bg-card px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex items-center gap-3.5">
              <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-brand-amethyst/10 text-brand-amethyst">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  Success Bonus
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold leading-none tracking-tight text-foreground">
                    ${formatMoneyWithCommas(successFeeAmount)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    one-time, paid to Candidate
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden h-9 w-px bg-border sm:block" />
            <p className="flex-1 text-[13px] leading-relaxed text-muted-foreground">
              {hasProbationPeriod ? (
                <>
                  Paid after your candidate completes the{" "}
                  <span className="font-medium text-foreground">
                    {formData.probationPeriodDays}-day probation
                  </span>{" "}
                  and converts to a full-time permanent employee.
                </>
              ) : (
                <>
                  Paid once your candidate is officially hired and joins as a
                  full-time employee.
                </>
              )}
            </p>
          </div>
        </section>
      )}

      <LivePreviewStats
        formData={formData}
        industryName={industryName}
        departmentName={departmentName}
      />

      {/* Skills */}
      {(requiredSkills.length > 0 || preferredSkills.length > 0) && (
        <section className="rounded-2xl border border-border bg-card p-6">
          {requiredSkills.length > 0 && (
            <div className="mb-4 last:mb-0">
              <div className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-rose" />
                Required Skills
              </div>
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-brand-rose/15 bg-brand-rose/10 px-3.5 py-1.5 text-xs font-bold text-brand-rose transition-colors hover:bg-brand-rose hover:text-white"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {preferredSkills.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-amethyst" />
                Preferred Skills
              </div>
              <div className="flex flex-wrap gap-2">
                {preferredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-brand-amethyst/15 bg-brand-amethyst/10 px-3.5 py-1.5 text-xs font-bold text-brand-amethyst transition-colors hover:bg-brand-amethyst hover:text-white"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Salary note */}
      {formData.salaryRangeNotes && (
        <div className="flex items-start gap-2 rounded-2xl border border-brand-sky/15 bg-brand-sky/5 px-4 py-3">
          <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky" />
          <div className="text-sm text-foreground">
            <span className="font-semibold">Salary note:</span>{" "}
            {formData.salaryRangeNotes}
          </div>
        </div>
      )}

      <LivePreviewDetails formData={formData} />
    </div>
  );
}
