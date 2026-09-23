import type { CandidateDetailResponse } from "@/lib/api/recruitment";
import { CertificationsSection, EducationSection } from "./ExperienceTab";
import { SkillsToolsSection } from "./SkillsTechProjectsTabs";

type DetailRailProps = {
  domainExpertise: string[];
  skills: string[];
  tools: string[];
  technologies: string[];
  legacy: string[];
  languages: string[];
  education: NonNullable<
    CandidateDetailResponse["resumeMetadata"]
  >["education"];
  certificationLabels: string[];
  isHidden: boolean;
};

function hasDetailRail({
  domainExpertise,
  skills,
  tools,
  technologies,
  legacy,
  languages,
  education,
  certificationLabels,
  isHidden,
}: DetailRailProps): boolean {
  const tech = technologies.length > 0 ? technologies : legacy;
  const hasSkills =
    domainExpertise.length > 0 ||
    skills.length > 0 ||
    tools.length > 0 ||
    tech.length > 0 ||
    languages.length > 0;

  return (
    (!isHidden && hasSkills) ||
    (!isHidden && (education?.length ?? 0) > 0) ||
    (!isHidden && certificationLabels.length > 0)
  );
}

export function DetailRail(props: DetailRailProps) {
  const {
    domainExpertise,
    skills,
    tools,
    technologies,
    legacy,
    languages,
    education,
    certificationLabels,
    isHidden,
  } = props;
  if (!hasDetailRail(props) || isHidden) return null;

  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <SkillsToolsSection
        domainExpertise={domainExpertise}
        skills={skills}
        tools={tools}
        technologies={technologies}
        legacy={legacy}
        languages={languages}
        compact
      />
      <EducationSection education={education} compact />
      <CertificationsSection
        certificationLabels={certificationLabels}
        compact
      />
    </aside>
  );
}
