import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job, UnrecoverableError } from "bullmq";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { S3Service } from "shared/s3.service";
import { toUTC } from "utils/dayjs";
import { toCanonicalLinkedInProfileUrl } from "utils/linkedin-profile.utils";
import type {
  ConnectorUploadJobPayload,
  ConnectorReplaceResumeJobPayload,
} from "./connector-upload-queue.service";
import { ConnectorUploadContactService } from "./services/connector-upload-contact.service";
import { ConnectorUploadReplaceQueueProcessor } from "./connector-upload-replace-queue.processor";
import {
  CONNECTOR_UPLOAD_QUEUE_NAME,
  CONNECTOR_UPLOAD_QUEUE_JOBS,
  CONNECTOR_UPLOAD_MESSAGES,
  CONNECTOR_UPLOAD_AUTO_CONSENT_MIN_SCORE,
  UPLOAD_JOB_STATUS,
  UPLOAD_JOB_FAILURE_REASON,
  type UploadJobFailureReason,
} from "./connector-upload.constants";
import { ResumeExtractionAiService } from "../resume-extraction/services/resume-extraction-ai.service";
import { ResumeExtractionMutationService } from "../resume-extraction/services/resume-extraction-mutation.service";
import { ResumeTextService } from "../candidate-evaluation/services/resume-text.service";
import { CandidateEvaluationService } from "../candidate-evaluation/services/candidate-evaluation.service";
import {
  extractLegacySkillsFromDimensions,
  toGapAnalysisStored,
} from "../candidate-evaluation/gap-analysis.mapper";
import {
  JOB_POOL_MATCH_STATUS,
  JOB_POOL_MATCH_SOURCE,
  CONSENT_LOCKED_STATUSES,
} from "../job-pool-matches/job-pool-matches.constants";
import { isValidPdfBuffer } from "../resume-extraction/resume-extraction.constants";
import { ConsentSendService } from "../consent/services/consent-send.service";
import { ResumeIndexingQueueService } from "../resume-indexing/resume-indexing-queue.service";

@Processor(CONNECTOR_UPLOAD_QUEUE_NAME)
export class ConnectorUploadQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ConnectorUploadQueueProcessor.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly s3: S3Service,
    private readonly resumeAi: ResumeExtractionAiService,
    private readonly resumeMutation: ResumeExtractionMutationService,
    private readonly resumeText: ResumeTextService,
    private readonly evaluationService: CandidateEvaluationService,
    private readonly contactService: ConnectorUploadContactService,
    private readonly consentSendService: ConsentSendService,
    private readonly resumeIndexingQueue: ResumeIndexingQueueService,
    private readonly replaceProcessor: ConnectorUploadReplaceQueueProcessor
  ) {
    super();
  }

  async process(
    job: Job<ConnectorUploadJobPayload | ConnectorReplaceResumeJobPayload>
  ): Promise<void> {
    if (job.name === CONNECTOR_UPLOAD_QUEUE_JOBS.REPLACE_RESUME) {
      return this.replaceProcessor.process(
        job as Job<ConnectorReplaceResumeJobPayload>
      );
    }
    if (job.name !== CONNECTOR_UPLOAD_QUEUE_JOBS.PROCESS_RESUME) {
      throw new Error(`Unsupported job name: ${job.name}`);
    }

    const {
      jobId,
      connectorUserId,
      mediaId,
      filePath,
      uploadJobId,
      connectorEmail,
    } = job.data as ConnectorUploadJobPayload;
    const logPrefix = `mediaId=${mediaId} jobId=${jobId} uploadJobId=${uploadJobId}`;
    this.logger.log(
      `CONNECTOR_UPLOAD_PROCESSOR :: process : START : ${logPrefix}`
    );

    // Mark upload_job as processing
    await this.setUploadJobStatus(uploadJobId, UPLOAD_JOB_STATUS.PROCESSING);

    try {
      // Step 1-2: Download and validate PDF
      const buffer = await this.downloadAndValidate(mediaId, filePath);

      // Step 3: Extract resume with contact info
      let extraction;
      try {
        extraction = await this.resumeAi.extractFromResumeFileWithContactInfo(
          buffer,
          "application/pdf",
          {
            userId: connectorUserId,
            actionType: "connector-resume-extraction",
          }
        );
      } catch (extractionError) {
        await this.markUploadJobFailed(
          uploadJobId,
          UPLOAD_JOB_FAILURE_REASON.AI_EXTRACTION_FAILED
        );
        throw extractionError;
      }

      // Step 4: Connector email is canonical for matching. Resume phone must
      // stay out of dedup. Resume LinkedIn is kept for post-match persistence
      // (candidate can confirm on apply) — never used for contact matching.
      const extractedLinkedinUrl =
        extraction.contactInfo?.linkedinUrl?.trim() || null;
      const contactInfo = {
        ...extraction.contactInfo,
        email: connectorEmail,
        phone: null,
        linkedinUrl: null,
      };

      // Step 5: Create or find contact (email-only match)
      let contactId: number;
      try {
        contactId = await this.contactService.createOrFindContact(
          contactInfo,
          extraction.jobTitle,
          connectorUserId
        );
      } catch (contactError) {
        await this.markUploadJobFailed(
          uploadJobId,
          UPLOAD_JOB_FAILURE_REASON.CONTACT_CREATION_FAILED
        );
        throw contactError;
      }

      // Step 5b: Persist AI LinkedIn after email-only dedup (no overwrite).
      if (extractedLinkedinUrl) {
        try {
          await this.contactService.persistExtractedLinkedin(
            contactId,
            extractedLinkedinUrl
          );
        } catch (liError) {
          this.logger.error(
            `CONNECTOR_UPLOAD_PROCESSOR :: PERSIST_LINKEDIN_FAILED : ${logPrefix} ${liError}`
          );
        }
      }

      // Step 6: Create pool match with processing status and atomically link
      // it to the upload_job. Linking inside the same transaction ensures the
      // active inbox query (which filters upload_jobs by `poolMatchId IS NULL`)
      // never returns both rows for the same upload.
      const matchId = await this.createProcessingMatch(
        jobId,
        contactId,
        connectorUserId,
        mediaId,
        uploadJobId
      );

      // Step 7: Run candidate evaluation
      let evalResult;
      try {
        evalResult = await this.runEvaluation(
          jobId,
          extraction,
          connectorUserId
        );
      } catch (evalError) {
        await this.markUploadJobFailed(
          uploadJobId,
          UPLOAD_JOB_FAILURE_REASON.EVALUATION_FAILED
        );
        throw evalError;
      }

      // Step 8: Update pool match with results (pending → Qualified / Not Qualified in UI)
      await this.updateMatchWithResults(matchId, evalResult);

      // Step 9: Persist extraction (non-fatal — must not block consent email).
      try {
        const metadata =
          extraction.metadata &&
          typeof extraction.metadata === "object" &&
          !Array.isArray(extraction.metadata)
            ? { ...extraction.metadata }
            : {};
        if (extractedLinkedinUrl) {
          metadata.extractedLinkedinUrl =
            toCanonicalLinkedInProfileUrl(extractedLinkedinUrl) ||
            extractedLinkedinUrl;
        }
        await this.resumeMutation.saveExtraction({
          ...extraction,
          metadata,
          mediaId,
          contactId,
          userId: connectorUserId,
        });

        // Required second producer site: consent-apply sets
        // skipExtractionAndEvaluation for connector uploads, so these resumes
        // never pass through the resume-extraction queue.
        await this.resumeIndexingQueue.queueIndexing({
          mediaId,
          reason: "extraction",
          userId: connectorUserId,
        });
      } catch (saveError) {
        // Covers both the save and the enqueue. If the save committed and only
        // the enqueue threw, the resume is left out of search until the
        // backfill endpoint is triggered manually — nothing schedules it.
        this.logger.error(
          `CONNECTOR_UPLOAD_PROCESSOR :: SAVE_EXTRACTION_FAILED : ${logPrefix} ${saveError}`
        );
      }

      // Step 10: Mark upload_job completed and link to pool match
      await this.markUploadJobCompleted(uploadJobId, matchId);

      // Step 11: Resume-upload only — auto-send consent when score qualifies.
      // Runs inside this BullMQ job so multi-file uploads process in the queue.
      // score < threshold stays pending → Not Qualified column (no email).
      // AI-matched contacts never hit this processor (they stay Qualified until manual refer).
      await this.maybeAutoSendConsent(
        matchId,
        connectorUserId,
        evalResult.matchPercentage,
        logPrefix
      );

      this.logger.log(
        `CONNECTOR_UPLOAD_PROCESSOR :: process : DONE : ${logPrefix} matchScore=${evalResult.matchPercentage}`
      );
    } catch (error) {
      // If error is unrecoverable (invalid PDF / too large) downloadAndValidate
      // throws — ensure the upload_job is marked failed before rethrowing.
      if (error instanceof UnrecoverableError) {
        const reason =
          error.message === CONNECTOR_UPLOAD_MESSAGES.ERROR.FILE_TOO_LARGE
            ? UPLOAD_JOB_FAILURE_REASON.FILE_TOO_LARGE
            : error.message === CONNECTOR_UPLOAD_MESSAGES.ERROR.INVALID_PDF
              ? UPLOAD_JOB_FAILURE_REASON.INVALID_PDF
              : UPLOAD_JOB_FAILURE_REASON.UNKNOWN;
        await this.markUploadJobFailed(uploadJobId, reason);
      } else {
        // BullMQ will retry; only mark failed on final attempt.
        if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
          await this.markUploadJobFailed(
            uploadJobId,
            UPLOAD_JOB_FAILURE_REASON.UNKNOWN
          );
        }
      }
      this.logger.error(
        `CONNECTOR_UPLOAD_PROCESSOR :: process : ERROR : ${logPrefix} ${error}`
      );
      throw error;
    }
  }

  private async setUploadJobStatus(
    uploadJobId: string,
    status: string
  ): Promise<void> {
    await this.db
      .update(schema.recruitmentUploadJobs)
      .set({ status, updatedAt: toUTC() })
      .where(eq(schema.recruitmentUploadJobs.id, uploadJobId));
  }

  private async markUploadJobFailed(
    uploadJobId: string,
    reason: UploadJobFailureReason
  ): Promise<void> {
    // Propagate failure to the linked pool_match (when one exists) so the
    // inbox query can render a single failed card carrying Retry/Dismiss
    // instead of leaving the pool_match stuck in "processing" while the
    // upload_job is hidden by the poolMatchId filter. On a BullMQ retry the
    // upsert in createProcessingMatch flips the pool_match back to
    // "processing", which is the desired state.
    const now = toUTC();
    await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.recruitmentUploadJobs)
        .set({
          status: UPLOAD_JOB_STATUS.FAILED,
          failureReason: reason,
          updatedAt: now,
        })
        .where(eq(schema.recruitmentUploadJobs.id, uploadJobId))
        .returning({ poolMatchId: schema.recruitmentUploadJobs.poolMatchId });

      if (updated?.poolMatchId) {
        await tx
          .update(schema.recruitmentJobPoolMatches)
          .set({
            status: JOB_POOL_MATCH_STATUS.FAILED,
            failureReason: reason,
            updatedAt: now,
          })
          .where(eq(schema.recruitmentJobPoolMatches.id, updated.poolMatchId));
      }
    });
  }

  private async markUploadJobCompleted(
    uploadJobId: string,
    poolMatchId: string
  ): Promise<void> {
    await this.db
      .update(schema.recruitmentUploadJobs)
      .set({
        status: UPLOAD_JOB_STATUS.COMPLETED,
        poolMatchId,
        failureReason: null,
        updatedAt: toUTC(),
      })
      .where(eq(schema.recruitmentUploadJobs.id, uploadJobId));
  }

  private async downloadAndValidate(
    mediaId: string,
    filePath: string
  ): Promise<Buffer> {
    const [media] = await this.db
      .select()
      .from(schema.mediaSchema)
      .where(eq(schema.mediaSchema.id, mediaId))
      .limit(1);

    if (!media) {
      throw new UnrecoverableError(`Media not found: ${mediaId}`);
    }

    const buffer = await this.s3.downloadObject(filePath);

    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw new UnrecoverableError(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.FILE_TOO_LARGE
      );
    }

    const normalizedMime =
      media.mimeType?.split(";")[0]?.trim().toLowerCase() || null;
    const isPdf =
      normalizedMime === "application/pdf" ||
      (media.fileName?.toLowerCase().endsWith(".pdf") &&
        isValidPdfBuffer(buffer));

    if (!isPdf || !isValidPdfBuffer(buffer)) {
      throw new UnrecoverableError(CONNECTOR_UPLOAD_MESSAGES.ERROR.INVALID_PDF);
    }

    return buffer;
  }

  private async createProcessingMatch(
    jobId: string,
    contactId: number,
    connectorUserId: string,
    mediaId: string,
    uploadJobId: string
  ): Promise<string> {
    const now = toUTC();
    const lockedStatuses = new Set<string>(CONSENT_LOCKED_STATUSES);

    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: schema.recruitmentJobPoolMatches.id,
          status: schema.recruitmentJobPoolMatches.status,
        })
        .from(schema.recruitmentJobPoolMatches)
        .where(
          and(
            eq(schema.recruitmentJobPoolMatches.jobId, jobId),
            eq(schema.recruitmentJobPoolMatches.contactId, contactId),
            eq(
              schema.recruitmentJobPoolMatches.connectorUserId,
              connectorUserId
            ),
            isNull(schema.recruitmentJobPoolMatches.deletedAt)
          )
        )
        .limit(1);

      let matchId: string;

      if (existing) {
        const keepConsentStatus = lockedStatuses.has(existing.status);
        await tx
          .update(schema.recruitmentJobPoolMatches)
          .set({
            ...(keepConsentStatus
              ? {}
              : { status: JOB_POOL_MATCH_STATUS.PROCESSING }),
            source: JOB_POOL_MATCH_SOURCE.CONNECTOR_UPLOADED,
            resumeMediaId: mediaId,
            failureReason: null,
            updatedAt: now,
          })
          .where(eq(schema.recruitmentJobPoolMatches.id, existing.id));
        matchId = existing.id;
      } else {
        const [match] = await tx
          .insert(schema.recruitmentJobPoolMatches)
          .values({
            jobId,
            contactId,
            connectorUserId,
            status: JOB_POOL_MATCH_STATUS.PROCESSING,
            source: JOB_POOL_MATCH_SOURCE.CONNECTOR_UPLOADED,
            resumeMediaId: mediaId,
            matchScore: "0",
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: schema.recruitmentJobPoolMatches.id });
        matchId = match.id;
      }

      await tx
        .update(schema.recruitmentUploadJobs)
        .set({ poolMatchId: matchId, updatedAt: now })
        .where(eq(schema.recruitmentUploadJobs.id, uploadJobId));

      return matchId;
    });
  }

  private async runEvaluation(
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

  private async updateMatchWithResults(
    matchId: string,
    evalResult: Awaited<
      ReturnType<CandidateEvaluationService["analyzeSkillMatch"]>
    >
  ): Promise<void> {
    const { matchedSkills, missingSkills } = extractLegacySkillsFromDimensions(
      evalResult.dimensions
    );
    const gapAnalysis = toGapAnalysisStored(evalResult);

    // Mirrors the guard on the candidate path. Without it a non-finite score
    // would reach the numeric column, and `maybeAutoSendConsent` compares with
    // `<` — so a NaN would pass the threshold and email a real candidate.
    if (
      typeof evalResult.matchPercentage !== "number" ||
      !Number.isFinite(evalResult.matchPercentage)
    ) {
      throw new Error(
        `Invalid matchPercentage: ${String(evalResult.matchPercentage)}`
      );
    }

    const lockedStatuses = new Set<string>(CONSENT_LOCKED_STATUSES);

    const [current] = await this.db
      .select({ status: schema.recruitmentJobPoolMatches.status })
      .from(schema.recruitmentJobPoolMatches)
      .where(eq(schema.recruitmentJobPoolMatches.id, matchId))
      .limit(1);

    const nextStatus =
      current && lockedStatuses.has(current.status)
        ? current.status
        : JOB_POOL_MATCH_STATUS.PENDING;

    await this.db
      .update(schema.recruitmentJobPoolMatches)
      .set({
        status: nextStatus,
        matchScore: evalResult.matchPercentage.toString(),
        matchedSignals: matchedSkills,
        concerns: missingSkills,
        gapAnalysis,
        failureReason: null,
        updatedAt: toUTC(),
      })
      .where(eq(schema.recruitmentJobPoolMatches.id, matchId));
  }

  private async maybeAutoSendConsent(
    matchId: string,
    connectorUserId: string,
    matchPercentage: number,
    logPrefix: string
  ): Promise<void> {
    if (matchPercentage < CONNECTOR_UPLOAD_AUTO_CONSENT_MIN_SCORE) {
      this.logger.log(
        `CONNECTOR_UPLOAD_PROCESSOR :: AUTO_CONSENT_SKIP : ${logPrefix} score=${matchPercentage} (<${CONNECTOR_UPLOAD_AUTO_CONSENT_MIN_SCORE}) → not_qualified`
      );
      return;
    }

    try {
      await this.consentSendService.sendConsent(connectorUserId, matchId);
      this.logger.log(
        `CONNECTOR_UPLOAD_PROCESSOR :: AUTO_CONSENT_SENT : ${logPrefix} score=${matchPercentage}`
      );
    } catch (error) {
      // Non-fatal: match stays Qualified (pending) so connector can refer manually.
      this.logger.error(
        `CONNECTOR_UPLOAD_PROCESSOR :: AUTO_CONSENT_FAILED : ${logPrefix} ${error}`
      );
    }
  }
}
