import type { JobDetailsDisplayData } from "../job-details-mappers";

interface SkillsSectionProps {
  job: JobDetailsDisplayData;
}

export function SkillsSection({ job }: SkillsSectionProps) {
  const hasRequired = job.requiredSkills.length > 0;
  const hasPreferred = job.preferredSkills.length > 0;

  if (!hasRequired && !hasPreferred) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      {hasRequired && (
        <div className="mb-4 last:mb-0">
          <div className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-rose" />
            Required Skills
          </div>
          <div className="flex flex-wrap gap-2">
            {job.requiredSkills.map((skill, index) => (
              <span
                key={`required-${index}-${skill}`}
                className="rounded-full border border-brand-rose/15 bg-brand-rose/10 px-3.5 py-1.5 text-xs font-bold text-brand-rose transition-colors hover:bg-brand-rose hover:text-brand-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
      {hasPreferred && (
        <div>
          <div className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-amethyst" />
            Preferred Skills
          </div>
          <div className="flex flex-wrap gap-2">
            {job.preferredSkills.map((skill, index) => (
              <span
                key={`preferred-${index}-${skill}`}
                className="rounded-full border border-brand-amethyst/15 bg-brand-amethyst/10 px-3.5 py-1.5 text-xs font-bold text-brand-amethyst transition-colors hover:bg-brand-amethyst hover:text-brand-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
