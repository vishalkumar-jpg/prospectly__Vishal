import { FolderOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateDetailResponse } from "@/lib/api/recruitment";
import { formatDurationMonths } from "@/utils/formatter";
import { CHIP_BASE } from "./detail.helpers";
import { DetailSectionCard } from "./DetailSectionCard";

function ChipGroup({
  label,
  items,
  tone = "neutral",
}: {
  label: string;
  items: string[];
  tone?: "neutral" | "accent" | "sky";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className={cn(
              CHIP_BASE,
              tone === "accent" &&
                "border border-brand-amethyst/20 bg-brand-amethyst/10 text-brand-amethyst",
              tone === "sky" &&
                "border border-brand-sky/20 bg-brand-sky/10 text-brand-sky",
              tone === "neutral" &&
                "border border-border bg-background text-foreground"
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SkillsToolsSection({
  domainExpertise,
  skills,
  tools,
  technologies,
  legacy,
  languages,
  compact = false,
}: {
  domainExpertise: string[];
  skills: string[];
  tools: string[];
  technologies: string[];
  legacy: string[];
  languages: string[];
  compact?: boolean;
}) {
  const tech = technologies.length > 0 ? technologies : legacy;
  if (
    domainExpertise.length === 0 &&
    skills.length === 0 &&
    tools.length === 0 &&
    tech.length === 0 &&
    languages.length === 0
  ) {
    return null;
  }

  return (
    <DetailSectionCard title="Skills & tools" icon={Layers} compact={compact}>
      <div className={compact ? "space-y-2" : "space-y-4"}>
        <ChipGroup label="Domain" items={domainExpertise} tone="accent" />
        <ChipGroup label="Skills" items={skills} />
        <ChipGroup label="Tools" items={tools} />
        <ChipGroup
          label={
            technologies.length > 0 ? "Technologies" : "Tools & technologies"
          }
          items={tech}
        />
        <ChipGroup label="Languages" items={languages} tone="sky" />
      </div>
    </DetailSectionCard>
  );
}

export function ProjectsSection({
  projects,
}: {
  projects: NonNullable<CandidateDetailResponse["resumeMetadata"]>["projects"];
}) {
  const list = projects ?? [];
  if (list.length === 0) return null;

  return (
    <DetailSectionCard title="Projects" icon={FolderOpen}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((project, i) => {
          const used = project.skillsUsed
            ? Array.isArray(project.skillsUsed)
              ? project.skillsUsed
              : project.skillsUsed.split(/,\s*/)
            : [];
          return (
            <li
              key={`${project.name}-${i}`}
              className="rounded-lg border bg-background p-4"
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{project.name}</p>
                {project.durationMonths ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {formatDurationMonths(project.durationMonths)}
                  </span>
                ) : null}
              </div>
              {project.role ? (
                <p className="mb-1.5 text-xs font-semibold text-brand-amethyst">
                  {project.role}
                </p>
              ) : null}
              {project.description ? (
                <p className="mb-2.5 text-xs leading-relaxed text-muted-foreground">
                  {project.description}
                </p>
              ) : null}
              {used.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {used.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="rounded-full border border-brand-amethyst/20 bg-brand-amethyst/10 px-2 py-0.5 text-[10px] font-medium text-brand-amethyst"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </DetailSectionCard>
  );
}
