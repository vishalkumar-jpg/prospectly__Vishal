import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger, Injectable } from "@nestjs/common";
import { S3Service } from "shared/s3.service";
import type { CandidateEvaluationJobPayload } from "./candidate-evaluation-queue.service";
import { CandidateEvaluationService } from "./services/candidate-evaluation.service";
import { ResumeTextService } from "./services/resume-text.service";
import { CandidateEvaluationQueryRepository } from "./services/candidate-evaluation-query.repository";
import { CandidateEvaluationMutationRepository } from "./services/candidate-evaluation-mutation.repository";
import {
  CANDIDATE_EVALUATION_QUEUE_NAME,
  CANDIDATE_EVALUATION_QUEUE_JOBS,
  CANDIDATE_EVALUATION_CONFIG,
} from "./candidate-evaluation.constants";
import {
  determinePipelineStageKey,
  describeNotQualifiedReason,
} from "./candidate-pipeline-stage.decider";
import { toResumeExtractionParsed } from "./resume-extraction-row.mapper";
import { ResumeExtractionAiService } from "../resume-extraction/services/resume-extraction-ai.service";
import { RecruitmentLifecycleNotificationDispatchService } from "../notifications/services/recruitment-lifecycle-notification-dispatch.service";

@Injectable()
@Processor(CANDIDATE_EVALUATION_QUEUE_NAME)
export class CandidateEvaluationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(CandidateEvaluationQueueProcessor.name);

  constructor(
    private readonly s3: S3Service,
    private readonly resumeExtraction: ResumeExtractionAiService,
    private readonly candidateEvaluation: CandidateEvaluationService,
    private readonly resumeTextService: ResumeTextService,
    private readonly queryRepository: CandidateEvaluationQueryRepository,
    private readonly mutationRepository: CandidateEvaluationMutationRepository,
    private readonly lifecycleDispatch: RecruitmentLifecycleNotificationDispatchService
  ) {
    super();
  }

  async process(job: Job<CandidateEvaluationJobPayload>): Promise<void> {
    if (job.name !== CANDIDATE_EVALUATION_QUEUE_JOBS.ANALYZE) {
      const err = new Error(`Unsupported job name: ${job.name}`);
      this.logger.error(
        `CANDIDATE_EVALUATION_PROCESSOR :: process : ERROR : ${err.message}`,
        err.stack
      );
      throw err;
    }

    const { candidateId, jobId, userId } = job.data;
    this.logger.log(
      `CANDIDATE_EVALUATION_PROCESSOR :: Processing skill analysis for candidate ${candidateId} on job ${jobId}`
    );

    try {
      // 1. Get candidate details
      const candidate = await this.queryRepository.getCandidateById(
        candidateId,
        jobId
      );
      if (!candidate) {
        throw new Error(`Candidate ${candidateId} not found`);
      }

      // Skip processing if analysis is already completed
      if (
        candidate.analysisStatus &&
        candidate.analysisStatus !==
          CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.PENDING &&
        candidate.analysisStatus !==
          CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.FAILED
      ) {
        this.logger.log(
          `CANDIDATE_EVALUATION_PROCESSOR :: Skipping candidate ${candidateId} - analysis status is ${candidate.analysisStatus}`
        );
        return;
      }

      if (!candidate.resumeMediaId) {
        throw new Error(`No resume found for candidate ${candidateId}`);
      }

      // 2. Get job details
      const jobRecord = await this.queryRepository.getJobById(jobId);
      if (!jobRecord) {
        throw new Error(`Job ${jobId} not found`);
      }

      // 3. Resolve the resume extraction. This job is chained off the
      // resume-extraction queue, so the parsed row normally already exists —
      // reuse it so the score is derived from exactly the data the recruiter
      // sees, and so the PDF is only ever sent to the AI once. The fallback
      // parse covers manual retries where extraction itself never succeeded.
      const persistedExtraction =
        await this.queryRepository.getResumeExtractionByMediaId(
          candidate.resumeMediaId
        );

      let resumeData;
      if (persistedExtraction) {
        resumeData = toResumeExtractionParsed(persistedExtraction);
      } else {
        this.logger.warn(
          `CANDIDATE_EVALUATION_PROCESSOR :: No persisted extraction for media ${candidate.resumeMediaId} - falling back to a fresh parse for candidate ${candidateId}`
        );

        const media = await this.queryRepository.getMediaById(
          candidate.resumeMediaId
        );
        if (!media) {
          throw new Error(`Resume media ${candidate.resumeMediaId} not found`);
        }

        const resumeBuffer = await this.s3.downloadObject(media.filePath);
        resumeData = await this.resumeExtraction.extractFromResumeFile(
          resumeBuffer,
          media.mimeType,
          {
            userId,
            actionType: "candidate-evaluation-resume-parse",
          }
        );
      }

      // 4. Perform skill matching analysis
      const analysisResult = await this.candidateEvaluation.analyzeSkillMatch(
        {
          jobTitle: jobRecord.title ?? undefined,
          jobDescription: jobRecord.description,
          jobRequirements: jobRecord.requirements || undefined,
          jobResponsibilities: jobRecord.responsibilities || undefined,
          jobRequiredSkills:
            (jobRecord.requiredSkills as string[]) || undefined,
          jobPreferredSkills:
            (jobRecord.preferredSkills as string[]) || undefined,
          jobExperienceLevel: jobRecord.experienceLevel ?? undefined,
          jobWorkType: jobRecord.workType ?? undefined,
          jobLocation: jobRecord.location ?? undefined,
          resumeText: this.resumeTextService.buildResumeText(resumeData),
        },
        { userId, actionType: "candidate-skill-evaluation" }
      );

      // 5. Determine new stage from the AI score combined with assessment
      // correctness. Any incorrect answer OR a sub-threshold score → Unqualified.
      const assessment =
        await this.queryRepository.getAssessmentSummary(candidateId);
      const stageInput = {
        matchScore: analysisResult.matchPercentage,
        assessmentPassed: assessment.hasResponses
          ? assessment.allCorrect
          : null,
      };
      const newStageKey = determinePipelineStageKey(stageInput);
      const notQualifiedReason = describeNotQualifiedReason(stageInput);

      // Get the stage record
      const newStage = await this.queryRepository.getStageByKey(newStageKey);

      // Explicitly handle missing stage
      if (!newStage) {
        this.logger.warn(
          `CANDIDATE_EVALUATION_PROCESSOR :: Stage not found for key '${newStageKey}'. Match: ${analysisResult.matchPercentage}%, Candidate: ${candidateId}, User: ${userId}`
        );
        throw new Error(`Stage '${newStageKey}' not found in database`);
      }

      // 6. Update candidate with results
      await this.mutationRepository.persistAnalysisResult(
        candidateId,
        analysisResult,
        newStage.id,
        userId,
        notQualifiedReason
      );

      this.logger.log(
        `CANDIDATE_EVALUATION_PROCESSOR :: Analysis completed for candidate ${candidateId}. Score: ${analysisResult.matchPercentage}%, Stage: ${newStageKey}`
      );

      if (newStageKey === CANDIDATE_EVALUATION_CONFIG.STAGES.IN_REVIEW) {
        void this.lifecycleDispatch
          .dispatchRecruiterNewCandidate(candidateId)
          .catch((err: unknown) => {
            this.logger.error(
              `RECRUITMENT_LIFECYCLE_DISPATCH :: evaluation :: ${err}`
            );
          });
      }
    } catch (error) {
      this.logger.error(
        `CANDIDATE_EVALUATION_PROCESSOR :: process : ERROR : ${error.message}`,
        error.stack
      );

      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

      if (isFinalAttempt) {
        try {
          await this.mutationRepository.markAnalysisFailed(candidateId);
        } catch (updateError) {
          this.logger.error(
            `CANDIDATE_EVALUATION_PROCESSOR :: process : ERROR : Failed to update error status: ${updateError.message}`,
            updateError.stack
          );
        }
      }

      throw error;
    }
  }
}
