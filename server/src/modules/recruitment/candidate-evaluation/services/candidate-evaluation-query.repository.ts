import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, isNull } from "drizzle-orm";

@Injectable()
export class CandidateEvaluationQueryRepository {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getCandidateById(candidateId: string, jobId: string) {
    const [candidate] = await this.db
      .select({
        id: schema.recruitmentJobCandidates.id,
        jobId: schema.recruitmentJobCandidates.jobId,
        resumeMediaId: schema.recruitmentJobCandidates.resumeMediaId,
        stageId: schema.recruitmentJobCandidates.stageId,
        analysisStatus: schema.recruitmentJobCandidates.analysisStatus,
      })
      .from(schema.recruitmentJobCandidates)
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          eq(schema.recruitmentJobCandidates.jobId, jobId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    return candidate;
  }

  async getJobById(jobId: string) {
    const [job] = await this.db
      .select({
        id: schema.recruitmentJobsSchema.id,
        title: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
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

    return job;
  }

  async getMediaById(mediaId: string) {
    const [media] = await this.db
      .select()
      .from(schema.mediaSchema)
      .where(
        and(
          eq(schema.mediaSchema.id, mediaId),
          isNull(schema.mediaSchema.deletedAt)
        )
      )
      .limit(1);

    return media;
  }

  /**
   * The extraction the resume-extraction queue already persisted for this
   * resume. `contact_resumes.media_id` is uniquely indexed, so this is a single
   * indexed lookup. Returns undefined when extraction has not landed yet.
   */
  async getResumeExtractionByMediaId(mediaId: string) {
    const [row] = await this.db
      .select({
        jobTitle: schema.contactResumes.jobTitle,
        skills: schema.contactResumes.skills,
        totalYearsExp: schema.contactResumes.totalYearsExp,
        aiSummary: schema.contactResumes.aiSummary,
        metadata: schema.contactResumes.metadata,
      })
      .from(schema.contactResumes)
      .where(
        and(
          eq(schema.contactResumes.mediaId, mediaId),
          isNull(schema.contactResumes.deletedAt)
        )
      )
      .limit(1);

    return row;
  }

  async getStageByKey(
    stageKey: string,
    executor: PostgresJsDatabase<typeof schema> = this.db
  ) {
    const [stage] = await executor
      .select()
      .from(schema.recruitmentStagesSchema)
      .where(eq(schema.recruitmentStagesSchema.stageKey, stageKey))
      .limit(1);

    return stage;
  }

  /**
   * Summarize a candidate's assessment answers for pipeline placement.
   * `hasResponses` is false when the job had no assessment; `allCorrect` is true
   * unless at least one answer was scored incorrect.
   */
  async getAssessmentSummary(
    candidateId: string,
    executor: PostgresJsDatabase<typeof schema> = this.db
  ): Promise<{ hasResponses: boolean; allCorrect: boolean }> {
    const responses = schema.recruitmentCandidateAssessmentResponsesSchema;
    const rows = await executor
      .select({ isCorrect: responses.isCorrect })
      .from(responses)
      .where(
        and(
          eq(responses.jobCandidateId, candidateId),
          isNull(responses.deletedAt)
        )
      );

    return {
      hasResponses: rows.length > 0,
      allCorrect: rows.every((row) => row.isCorrect !== false),
    };
  }
}
