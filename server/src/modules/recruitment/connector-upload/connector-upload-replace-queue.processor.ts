import { Injectable, Inject, Logger } from "@nestjs/common";
import { Job, UnrecoverableError } from "bullmq";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC } from "utils/dayjs";
import type { ConnectorReplaceResumeJobPayload } from "./connector-upload-queue.service";
import {
  CONNECTOR_UPLOAD_QUEUE_JOBS,
  CONNECTOR_UPLOAD_MESSAGES,
  UPLOAD_JOB_STATUS,
  UPLOAD_JOB_FAILURE_REASON,
  type UploadJobFailureReason,
} from "./connector-upload.constants";
import { ConnectorUploadPdfService } from "./services/connector-upload-pdf.service";
import { ConnectorUploadEvaluationService } from "./services/connector-upload-evaluation.service";
import { ConnectorUploadReplaceMovementService } from "./services/connector-upload-replace-movement.service";

@Injectable()
export class ConnectorUploadReplaceQueueProcessor {
  private readonly logger = new Logger(
    ConnectorUploadReplaceQueueProcessor.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly pdfService: ConnectorUploadPdfService,
    private readonly evaluationService: ConnectorUploadEvaluationService,
    private readonly movement: ConnectorUploadReplaceMovementService
  ) {}

  async process(job: Job<ConnectorReplaceResumeJobPayload>): Promise<void> {
    if (job.name !== CONNECTOR_UPLOAD_QUEUE_JOBS.REPLACE_RESUME) {
      throw new Error(`Unsupported job name: ${job.name}`);
    }

    const payload = job.data;
    const logPrefix = `replace matchId=${payload.matchId} uploadJobId=${payload.uploadJobId}`;

    await this.setUploadJobStatus(
      payload.uploadJobId,
      UPLOAD_JOB_STATUS.PROCESSING
    );

    try {
      const buffer = await this.pdfService.downloadAndValidate(
        payload.mediaId,
        payload.connectorUserId
      );
      const extraction = await this.evaluationService.extractFromPdf(
        buffer,
        payload.connectorUserId
      );
      const evalResult = await this.evaluationService.evaluateForJob(
        payload.jobId,
        extraction,
        payload.connectorUserId
      );

      await this.movement.persistExtraction(payload, extraction);
      await this.movement.applyMovement(payload, evalResult, logPrefix);
      await this.markUploadJobCompleted(payload.uploadJobId, payload.matchId);
    } catch (error) {
      await this.handleFailure(error, job, payload);
      throw error;
    }
  }

  private async setUploadJobStatus(uploadJobId: string, status: string) {
    await this.db
      .update(schema.recruitmentUploadJobs)
      .set({ status, updatedAt: toUTC() })
      .where(eq(schema.recruitmentUploadJobs.id, uploadJobId));
  }

  private async markUploadJobCompleted(
    uploadJobId: string,
    poolMatchId: string
  ) {
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

  private async handleFailure(
    error: unknown,
    job: Job<ConnectorReplaceResumeJobPayload>,
    payload: ConnectorReplaceResumeJobPayload
  ): Promise<void> {
    const isFinal =
      error instanceof UnrecoverableError ||
      job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    if (!isFinal) return;

    const reason = this.mapFailureReason(error);
    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.recruitmentUploadJobs)
        .set({
          status: UPLOAD_JOB_STATUS.FAILED,
          failureReason: reason,
          updatedAt: toUTC(),
        })
        .where(eq(schema.recruitmentUploadJobs.id, payload.uploadJobId));

      await tx
        .update(schema.recruitmentJobPoolMatches)
        .set({
          status: payload.preReplacePoolStatus,
          failureReason: reason,
          updatedAt: toUTC(),
        })
        .where(eq(schema.recruitmentJobPoolMatches.id, payload.matchId));
    });
  }

  private mapFailureReason(error: unknown): UploadJobFailureReason {
    if (!(error instanceof UnrecoverableError)) {
      return UPLOAD_JOB_FAILURE_REASON.UNKNOWN;
    }
    if (error.message === CONNECTOR_UPLOAD_MESSAGES.ERROR.FILE_TOO_LARGE) {
      return UPLOAD_JOB_FAILURE_REASON.FILE_TOO_LARGE;
    }
    if (error.message === CONNECTOR_UPLOAD_MESSAGES.ERROR.INVALID_PDF) {
      return UPLOAD_JOB_FAILURE_REASON.INVALID_PDF;
    }
    if (error.message === CONNECTOR_UPLOAD_MESSAGES.ERROR.CANDIDATE_NOT_FOUND) {
      return UPLOAD_JOB_FAILURE_REASON.MISSING_CANDIDATE;
    }
    return UPLOAD_JOB_FAILURE_REASON.UNKNOWN;
  }
}
