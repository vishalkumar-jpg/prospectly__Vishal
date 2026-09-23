import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { ResumeTextService } from "../../candidate-evaluation/services/resume-text.service";
import { CandidateEvaluationService } from "../../candidate-evaluation/services/candidate-evaluation.service";
import { ResumeExtractionAiService } from "../../resume-extraction/services/resume-extraction-ai.service";

@Injectable()
export class ConnectorUploadEvaluationService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly resumeText: ResumeTextService,
    private readonly evaluationService: CandidateEvaluationService,
    private readonly resumeAi: ResumeExtractionAiService
  ) {}

  async extractFromPdf(
    buffer: Buffer,
    connectorUserId: string
  ): Promise<
    Awaited<
      ReturnType<
        ResumeExtractionAiService["extractFromResumeFileWithContactInfo"]
      >
    >
  > {
    return this.resumeAi.extractFromResumeFileWithContactInfo(
      buffer,
      "application/pdf",
      {
        userId: connectorUserId,
        actionType: "connector-resume-extraction",
      }
    );
  }

  async evaluateForJob(
    jobId: string,
    extraction: Awaited<
      ReturnType<
        ResumeExtractionAiService["extractFromResumeFileWithContactInfo"]
      >
    >,
    connectorUserId: string
  ) {
    const [jobRecord] = await this.db
      .select({
        title: schema.recruitmentJobsSchema.title,
        description: schema.recruitmentJobsSchema.description,
        requirements: schema.recruitmentJobsSchema.requirements,
        responsibilities: schema.recruitmentJobsSchema.responsibilities,
        requiredSkills: schema.recruitmentJobsSchema.requiredSkills,
        preferredSkills: schema.recruitmentJobsSchema.preferredSkills,
        experienceLevel: schema.recruitmentJobsSchema.experienceLevel,
        workType: schema.recruitmentJobsSchema.workType,
        location: schema.recruitmentJobsSchema.location,
      })
      .from(schema.recruitmentJobsSchema)
      .where(
        and(
          eq(schema.recruitmentJobsSchema.id, jobId),
          isNull(schema.recruitmentJobsSchema.deletedAt)
        )
      )
      .limit(1);

    if (!jobRecord) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const resumeTextStr = this.resumeText.buildResumeText(extraction);
    return this.evaluationService.analyzeSkillMatch(
      {
        jobTitle: jobRecord.title ?? undefined,
        jobDescription: jobRecord.description || "",
        jobRequirements: jobRecord.requirements || undefined,
        jobResponsibilities: jobRecord.responsibilities || undefined,
        jobRequiredSkills: (jobRecord.requiredSkills as string[]) || undefined,
        jobPreferredSkills:
          (jobRecord.preferredSkills as string[]) || undefined,
        jobExperienceLevel: jobRecord.experienceLevel ?? undefined,
        jobWorkType: jobRecord.workType ?? undefined,
        jobLocation: jobRecord.location ?? undefined,
        resumeText: resumeTextStr,
      },
      {
        userId: connectorUserId,
        actionType: "connector-pool-match-evaluation",
      }
    );
  }
}
