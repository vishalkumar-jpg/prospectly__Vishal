import { Award, Briefcase, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateDetailResponse } from "@/lib/api/recruitment";
import { CHIP_BASE, formatResumeDate } from "./detail.helpers";
import { DetailSectionCard } from "./DetailSectionCard";

type JobHistory = NonNullable<
  CandidateDetailResponse["resumeMetadata"]
>["jobHistory"];
type Education = NonNullable<
  CandidateDetailResponse["resumeMetadata"]
>["education"];

export function ExperienceSection({ jobHistory }: { jobHistory: JobHistory }) {
  const jobs = jobHistory ?? [];
  if (jobs.length === 0) return null;

  return (
    <DetailSectionCard title="Experience" icon={Briefcase}>
      <ol className="relative">
        <div
          aria-hidden
          className="absolute bottom-5 left-[5px] top-5 w-px bg-border"
        />
        {jobs.map((job, i) => (
          <li
            key={`${job.title}-${i}`}
            className="relative flex gap-4 pb-5 last:pb-0"
          >
            <div
              className={cn(
                "relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                job.isCurrent ? "bg-brand-amethyst" : "bg-muted-foreground/30"
              )}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{job.title}</p>
              <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                {job.company}
              </p>
              {job.startDate ? (
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {formatResumeDate(job.startDate)} –{" "}
                  {job.isCurrent ? "Present" : formatResumeDate(job.endDate)}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </DetailSectionCard>
  );
}

export function EducationSection({
  education,
  compact = false,
}: {
  education: Education;
  compact?: boolean;
}) {
  const edu = education ?? [];
  if (edu.length === 0) return null;

  return (
    <DetailSectionCard title="Education" icon={GraduationCap} compact={compact}>
      <ul className="space-y-3">
        {edu.map((item, i) => (
          <li key={`${item.institution}-${i}`}>
            {[item.degree, item.field].some(Boolean) ? (
              <p className="text-sm font-semibold">
                {[item.degree, item.field].filter(Boolean).join(" — ")}
              </p>
            ) : null}
            {[item.institution, item.year].some(Boolean) ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.institution}
                {item.year ? (
                  <span className="ml-1.5 tabular-nums">· {item.year}</span>
                ) : null}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </DetailSectionCard>
  );
}

export function CertificationsSection({
  certificationLabels,
  compact = false,
}: {
  certificationLabels: string[];
  compact?: boolean;
}) {
  if (certificationLabels.length === 0) return null;

  return (
    <DetailSectionCard title="Certifications" icon={Award} compact={compact}>
      <div className="flex flex-wrap gap-1.5">
        {certificationLabels.map((label) => (
          <span
            key={label}
            className={cn(
              CHIP_BASE,
              "border border-border bg-background text-foreground"
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </DetailSectionCard>
  );
}
