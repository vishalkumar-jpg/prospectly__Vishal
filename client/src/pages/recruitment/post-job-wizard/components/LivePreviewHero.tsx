import { Briefcase, MapPin, Sparkles, Building2, Globe } from "lucide-react";
import { PAYOUT_COUNTRIES } from "@/lib/stripe-connect";
import {
  formatRecruitmentExperienceLevel,
  formatRecruitmentWorkType,
  formatRecruitmentEmploymentType,
} from "@/utils/recruitmentDisplay";
import type { JobFormData } from "../types";

interface LivePreviewHeroProps {
  formData: JobFormData;
}

export function LivePreviewHero({ formData }: LivePreviewHeroProps) {
  const workTypeLabel = formatRecruitmentWorkType(formData.workType);
  const experienceLabel = formatRecruitmentExperienceLevel(
    formData.experienceLevel
  );
  const employmentTypeLabel = formatRecruitmentEmploymentType(
    formData.employmentType
  );

  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand-hero-gradient p-6 text-brand-foreground shadow-brand-card sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
      />
      <div className="relative">
        {(workTypeLabel || experienceLabel || employmentTypeLabel) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {employmentTypeLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-foreground/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <Briefcase className="h-3 w-3" />
                {employmentTypeLabel}
              </span>
            )}
            {workTypeLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-foreground/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <MapPin className="h-3 w-3" />
                {workTypeLabel}
              </span>
            )}
            {experienceLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-foreground/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <Sparkles className="h-3 w-3" />
                {experienceLabel}
              </span>
            )}
          </div>
        )}
        <h1 className="mb-3 max-w-3xl text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
          {formData.title || "Job Title"}
        </h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-brand-foreground/95">
          <span className="inline-flex items-center gap-2">
            <Building2 className="h-4 w-4 opacity-85" />
            <b className="font-bold">
              {formData.companyName || "Company Name"}
            </b>
          </span>
          {formData.location && (
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 opacity-85" />
              {formData.location}
            </span>
          )}
          {formData.countries.length > 0 && (
            <span className="inline-flex items-center gap-2">
              <Globe className="h-4 w-4 opacity-85" />
              {formData.countries
                .map(
                  (code) =>
                    PAYOUT_COUNTRIES.find((c) => c.value === code)?.label ??
                    code
                )
                .join(", ")}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
