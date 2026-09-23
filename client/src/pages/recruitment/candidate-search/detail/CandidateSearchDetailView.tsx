import { useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { CandidateAssessmentAnswers } from "@/components/recruitment/assessment-answer/CandidateAssessmentAnswers";
import type { CandidateDetailResponse } from "@/lib/api/recruitment";
import {
  formatCertificationLabel,
  formatLanguageLabel,
  isDetailHidden,
  resumeMetadataStringArray,
} from "./detail.helpers";
import { DetailProfileHeader } from "./DetailProfileHeader";
import { DetailRail } from "./DetailRail";
import { DetailSectionCard } from "./DetailSectionCard";
import { ExperienceSection } from "./ExperienceTab";
import { AiSummarySection } from "./OverviewTab";
import { ProjectsSection } from "./SkillsTechProjectsTabs";

export function CandidateSearchDetailView({
  detail,
  onPreviewResume,
  onOpenResume,
}: {
  detail: CandidateDetailResponse;
  onPreviewResume: () => void;
  onOpenResume: () => void;
}) {
  const isHidden = isDetailHidden(detail.stage, detail.detailsRevealed);
  const meta = detail.resumeMetadata;
  const jobHistory = meta?.jobHistory ?? [];
  const education = meta?.education ?? [];
  const domainExpertise = meta?.domainExpertise ?? [];
  const projects = meta?.projects ?? [];
  const skills = detail.skills ?? [];
  const assessmentResponses = detail.assessmentResponses ?? [];

  const languageLabels = useMemo(
    () =>
      (Array.isArray(meta?.languages) ? meta.languages : [])
        .map((item) => formatLanguageLabel(item))
        .filter((label): label is string => Boolean(label)),
    [meta]
  );
  const certificationLabels = useMemo(
    () =>
      (Array.isArray(meta?.certifications) ? meta.certifications : [])
        .map((item) => formatCertificationLabel(item))
        .filter((label): label is string => Boolean(label)),
    [meta]
  );
  const tools = useMemo(() => resumeMetadataStringArray(meta, "tools"), [meta]);
  const technologies = useMemo(
    () => resumeMetadataStringArray(meta, "technologies"),
    [meta]
  );
  const legacy = useMemo(
    () => resumeMetadataStringArray(meta, "toolsTechnologies"),
    [meta]
  );

  return (
    <article className="space-y-4">
      <DetailSectionCard>
        <DetailProfileHeader
          detail={detail}
          isHidden={isHidden}
          onPreviewResume={onPreviewResume}
          onOpenResume={onOpenResume}
        />
      </DetailSectionCard>

      <div className="grid items-start gap-4 lg:has-[aside]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <AiSummarySection summary={detail.aiSummary} isHidden={isHidden} />

          {!isHidden ? <ExperienceSection jobHistory={jobHistory} /> : null}
          {!isHidden ? <ProjectsSection projects={projects} /> : null}

          {assessmentResponses.length > 0 ? (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                <ClipboardList
                  className="h-4 w-4 text-brand-amethyst"
                  aria-hidden
                />
                Assessment answers
              </h2>
              <CandidateAssessmentAnswers responses={assessmentResponses} />
            </section>
          ) : null}
        </div>

        <DetailRail
          domainExpertise={domainExpertise}
          skills={skills}
          tools={tools}
          technologies={technologies}
          legacy={legacy}
          languages={languageLabels}
          education={education}
          certificationLabels={certificationLabels}
          isHidden={isHidden}
        />
      </div>
    </article>
  );
}
