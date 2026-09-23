import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job, UnrecoverableError } from "bullmq";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { S3Service } from "shared/s3.service";
import type { ResumeExtractionJobPayload } from "./resume-extraction-queue.service";
import {
  RESUME_EXTRACTION_QUEUE_NAME,
  RESUME_EXTRACTION_QUEUE_JOBS,
  RESUME_ALLOWED_MIMETYPES,
  isValidPdfBuffer,
} from "./resume-extraction.constants";
import { ResumeExtractionAiService } from "./services/resume-extraction-ai.service";
import { ResumeExtractionLinkedinSyncService } from "./services/resume-extraction-linkedin-sync.service";
import { ResumeExtractionMutationService } from "./services/resume-extraction-mutation.service";
import { CandidateEvaluationQueueService } from "../candidate-evaluation/candidate-evaluation-queue.service";
import { CandidateEvaluationMutationRepository } from "../candidate-evaluation/services/candidate-evaluation-mutation.repository";
import { ResumeIndexingQueueService } from "../resume-indexing/resume-indexing-queue.service";

@Processor(RESUME_EXTRACTION_QUEUE_NAME)
export class ResumeExtractionQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeExtractionQueueProcessor.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly s3: S3Service,
    private readonly ai: ResumeExtractionAiService,
    private readonly mutation: ResumeExtractionMutationService,
    private readonly linkedinSync: ResumeExtractionLinkedinSyncService,
    private readonly evaluationQueue: CandidateEvaluationQueueService,
    private readonly evaluationMutation: CandidateEvaluationMutationRepository,
    private readonly resumeIndexingQueue: ResumeIndexingQueueService
  ) {
    super();
  }

  async process(job: Job<ResumeExtractionJobPayload>): Promise<void> {
    if (job.name !== RESUME_EXTRACTION_QUEUE_JOBS.EXTRACT) {
      const err = new Error(`Unsupported job name: ${job.name}`);
      this.logger.error(
        `RESUME_EXTRACTION_PROCESSOR :: process : ERROR : ${err.message}`,
        err.stack
      );
      throw err;
    }

    const { mediaId, candidateId, contactId, jobId, userId } = job.data;
    this.logger.log(
      `RESUME_EXTRACTION_PROCESSOR :: process : mediaId=${mediaId} jobId=${jobId}`
    );

    let media: typeof schema.mediaSchema.$inferSelect | undefined;
    try {
      [media] = await this.db
        .select()
        .from(schema.mediaSchema)
        .where(eq(schema.mediaSchema.id, mediaId))
        .limit(1);
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Media lookup failed");
      this.logger.error(
        `RESUME_EXTRACTION_PROCESSOR :: process : ERROR : ${err.message}`,
        err.stack
      );
      await this.markAnalysisFailedIfTerminal(job, candidateId, err);
      throw err;
    }

    if (!media) {
      this.logger.error(
        `RESUME_EXTRACTION_PROCESSOR :: process : media not found mediaId=${mediaId} jobId=${jobId}`
      );
      const err = new Error(`Media not found: ${mediaId}`);
      await this.markAnalysisFailedIfTerminal(job, candidateId, err);
      throw err;
    }

    const normalizedStoredMime =
      media.mimeType?.split(";")[0]?.trim().toLowerCase() || null;

    // Only PDF is supported
    let resolvedMime =
      normalizedStoredMime === "application/pdf" ? "application/pdf" : null;

    try {
      const buffer = await this.s3.downloadObject(media.filePath);

      // Defensive size check for files already in S3
      const MAX_EXTRACTION_SIZE = 10 * 1024 * 1024; // 10 MB
      if (buffer.length > MAX_EXTRACTION_SIZE) {
        this.logger.warn(
          `RESUME_EXTRACTION_PROCESSOR :: process : file_too_large : mediaId=${mediaId} size=${buffer.length}`
        );
        throw new UnrecoverableError(
          `File too large: ${buffer.length} bytes (mediaId: ${mediaId})`
        );
      }

      // If MIME type is missing, try filename fallback and validate bytes
      if (!resolvedMime && media.fileName) {
        const fileName = media.fileName.toLowerCase();
        if (fileName.endsWith(".pdf") && isValidPdfBuffer(buffer)) {
          resolvedMime = "application/pdf";
        }
      }

      // Final validation: ensure we have a valid PDF
      if (!resolvedMime || !RESUME_ALLOWED_MIMETYPES.includes(resolvedMime)) {
        this.logger.warn(
          `RESUME_EXTRACTION_PROCESSOR :: process : unsupported_or_invalid_file : mediaId=${mediaId} mime=${resolvedMime ?? "unknown"} allowed=${RESUME_ALLOWED_MIMETYPES.join(", ")}`
        );
        throw new UnrecoverableError(
          `Unsupported or invalid file type: ${resolvedMime ?? "unknown"} (mediaId: ${mediaId})`
        );
      }

      // Additional validation: ensure buffer is actually a PDF
      if (!isValidPdfBuffer(buffer)) {
        this.logger.warn(
          `RESUME_EXTRACTION_PROCESSOR :: process : invalid_pdf_bytes : mediaId=${mediaId}`
        );
        throw new UnrecoverableError(
          `Invalid PDF file content (mediaId: ${mediaId})`
        );
      }

      // Extract structured data from PDF using multimodal approach
      this.logger.log(
        `RESUME_EXTRACTION_PROCESSOR :: Using multimodal PDF extraction for mediaId=${mediaId}`
      );
      // WithContactInfo so we can persist resume LinkedIn for next public apply.
      const parsed = await this.ai.extractFromResumeFileWithContactInfo(
        buffer,
        resolvedMime,
        {
          userId,
          actionType: "resume-queue-extraction",
        }
      );

      await this.mutation.saveExtraction({
        ...parsed,
        mediaId,
        candidateId,
        contactId,
        userId,
      });

      // Public apply: fill blank users/contact LinkedIn for next-apply UI.
      try {
        await this.linkedinSync.syncFromResumeExtract({
          userId,
          contactId,
          linkedinUrl: parsed.contactInfo.linkedinUrl,
        });
      } catch (liError) {
        this.logger.error(
          `RESUME_EXTRACTION_PROCESSOR :: LINKEDIN_SYNC_FAILED : mediaId=${mediaId} ${liError}`
        );
      }

      // The evaluation is chained here rather than enqueued alongside this job
      // so it reads the extraction above instead of re-parsing the same PDF.
      // Non-fatal: the extraction itself succeeded, and the candidate stays
      // `pending` so the retry-evaluation endpoint can pick it up.
      try {
        await this.evaluationQueue.queueAnalysis({
          candidateId,
          jobId,
          userId,
        });
      } catch (queueError) {
        this.logger.error(
          `RESUME_EXTRACTION_PROCESSOR :: EVALUATION_ENQUEUE_FAILED : mediaId=${mediaId} candidateId=${candidateId} ${queueError}`
        );
      }

      // Enqueued last, and only after saveExtraction() has committed, so the
      // indexer never reads pre-commit state and never delays evaluation.
      //
      // Non-fatal by choice: rethrowing would retry the whole job, re-running
      // the AI extraction that already committed. The cost is that recovery is
      // not automatic — saveExtraction dropped the previous index row inside
      // its transaction, so a resume whose enqueue is lost here stays out of
      // search until someone triggers the backfill endpoint. Nothing schedules
      // that scan today, so treat this log line as actionable.
      try {
        await this.resumeIndexingQueue.queueIndexing({
          mediaId,
          reason: "extraction",
          userId,
        });
      } catch (indexError) {
        this.logger.error(
          `RESUME_EXTRACTION_PROCESSOR :: RESUME_INDEXING_ENQUEUE_FAILED : mediaId=${mediaId} ${indexError}`
        );
      }
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Unknown extraction error");
      this.logger.error(
        `RESUME_EXTRACTION_PROCESSOR :: process : ERROR : ${err.message}`,
        err.stack
      );

      await this.markAnalysisFailedIfTerminal(job, candidateId, error);
      throw err;
    }
  }

  /**
   * The candidate evaluation is chained off this job, so a terminal extraction
   * failure means it will never be enqueued. Flag the analysis as failed so the
   * candidate surfaces as retryable instead of sitting in `processing` forever.
   *
   * `UnrecoverableError` skips BullMQ retries, so it is terminal immediately;
   * anything else is terminal only on the final attempt.
   */
  private async markAnalysisFailedIfTerminal(
    job: Job<ResumeExtractionJobPayload>,
    candidateId: string,
    error: unknown
  ): Promise<void> {
    const isTerminal =
      error instanceof UnrecoverableError ||
      job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    if (!isTerminal) return;

    try {
      await this.evaluationMutation.markAnalysisFailed(candidateId);
    } catch (markError) {
      this.logger.error(
        `RESUME_EXTRACTION_PROCESSOR :: MARK_ANALYSIS_FAILED_ERROR : candidateId=${candidateId} ${markError}`
      );
    }
  }
}
