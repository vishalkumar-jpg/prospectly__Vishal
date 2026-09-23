import { MapPin, Sparkles, Building2, Briefcase } from "lucide-react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  formatRecruitmentExperienceLevel,
  formatRecruitmentWorkType,
  formatRecruitmentEmploymentType,
} from "@/utils/recruitmentDisplay";
import type { JobDetailsDisplayData } from "../job-details-mappers";

interface JobHeaderProps {
  job: JobDetailsDisplayData;
}

export function JobHeader({ job }: JobHeaderProps) {
  const workTypeLabel = formatRecruitmentWorkType(job.workType ?? undefined);
  const experienceLabel = formatRecruitmentExperienceLevel(
    job.experienceLevel ?? undefined
  );
  const employmentTypeLabel = formatRecruitmentEmploymentType(
    job.employmentType ?? undefined
  );

  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand-hero-gradient p-6 text-white shadow-brand-card sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
      />
      <div className="relative">
        {(workTypeLabel || experienceLabel || employmentTypeLabel) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {employmentTypeLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <Briefcase className="h-3 w-3" />
                {employmentTypeLabel}
              </span>
            )}
            {workTypeLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <MapPin className="h-3 w-3" />
                {workTypeLabel}
              </span>
            )}
            {experienceLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <Sparkles className="h-3 w-3" />
                {experienceLabel}
              </span>
            )}
          </div>
        )}
        <DialogTitle className="mb-3 max-w-3xl text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
          {job.title}
        </DialogTitle>
        <DialogDescription asChild>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-white/95">
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-4 w-4 opacity-85" />
              <b className="font-bold">{job.companyName}</b>
            </span>
            {job.location && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 opacity-85" />
                {job.location}
              </span>
            )}
          </div>
        </DialogDescription>
      </div>
    </section>
  );
}
