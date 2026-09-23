import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { hashData, normalizeEmail } from "services/contactMatchingService";
import {
  isConnectorAlreadyReferredForJobEmail,
  isJobAppliedForEmail,
  isJobConsentAcceptedForEmail,
} from "modules/recruitment/consent/consent-job-claim.utils";
import { isConnectorBlockedForCandidate } from "modules/recruitment/consent/consent-connector-block.utils";
import { ConnectorUploadDto } from "../connector-upload.dto";
import { ConnectorUploadQueueService } from "../connector-upload-queue.service";
import {
  CONNECTOR_UPLOAD_MESSAGES,
  MAX_UPLOAD_JOB_RETRIES,
  UPLOAD_JOB_STATUS,
} from "../connector-upload.constants";

export type ConnectorUploadSucceededItem = {
  fileName: string;
  email: string;
  uploadJobId: string;
};

export type ConnectorUploadFailedItem = {
  fileName: string;
  email: string;
  reason: string;
};

export type ConnectorUploadResult = {
  uploadCount: number;
  uploadJobIds: string[];
  succeeded: ConnectorUploadSucceededItem[];
  failed: ConnectorUploadFailedItem[];
};

@Injectable()
export class ConnectorUploadService {
  private readonly logger = new Logger(ConnectorUploadService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly queueService: ConnectorUploadQueueService
  ) {}

  async processUpload(
    dto: ConnectorUploadDto,
    userId: string
  ): Promise<ConnectorUploadResult> {
    if (!dto.piiConsent) {
      throw new BadRequestException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.PII_CONSENT_REQUIRED
      );
    }

    const [job] = await this.db
      .select({ id: schema.recruitmentJobsSchema.id })
      .from(schema.recruitmentJobsSchema)
      .where(
        and(
          eq(schema.recruitmentJobsSchema.id, dto.jobId),
          eq(schema.recruitmentJobsSchema.status, "active"),
          isNull(schema.recruitmentJobsSchema.deletedAt)
        )
      )
      .limit(1);

    if (!job) {
      throw new NotFoundException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.JOB_NOT_FOUND
      );
    }

    const succeeded: ConnectorUploadSucceededItem[] = [];
    const failed: ConnectorUploadFailedItem[] = [];
    const seenEmailHashes = new Set<string>();

    for (const file of dto.files) {
      const normalizedEmail = normalizeEmail(file.email) ?? file.email;
      const emailHash = hashData(normalizedEmail);
      const base = { fileName: file.fileName, email: normalizedEmail };

      if (!emailHash) {
        failed.push({
          ...base,
          reason: CONNECTOR_UPLOAD_MESSAGES.ERROR.INVALID_EMAIL,
        });
        continue;
      }

      if (seenEmailHashes.has(emailHash)) {
        failed.push({
          ...base,
          reason: CONNECTOR_UPLOAD_MESSAGES.ERROR.DUPLICATE_EMAIL,
        });
        continue;
      }

      if (
        await isConnectorBlockedForCandidate(this.db, {
          connectorUserId: userId,
          candidateEmailHash: emailHash,
        })
      ) {
        failed.push({
          ...base,
          reason:
            CONNECTOR_UPLOAD_MESSAGES.ERROR.CONNECTOR_BLOCKED_BY_CANDIDATE,
        });
        continue;
      }

      if (
        await isConnectorAlreadyReferredForJobEmail(this.db, {
          jobId: dto.jobId,
          connectorUserId: userId,
          emailHash,
        })
      ) {
        failed.push({
          ...base,
          reason: CONNECTOR_UPLOAD_MESSAGES.ERROR.ALREADY_REFERRED_BY_YOU,
        });
        continue;
      }

      if (
        await isJobConsentAcceptedForEmail(this.db, {
          jobId: dto.jobId,
          emailHash,
        })
      ) {
        failed.push({
          ...base,
          reason: CONNECTOR_UPLOAD_MESSAGES.ERROR.CANDIDATE_ALREADY_CLAIMED,
        });
        continue;
      }

      if (
        await isJobAppliedForEmail(this.db, {
          jobId: dto.jobId,
          emailHash,
        })
      ) {
        failed.push({
          ...base,
          reason: CONNECTOR_UPLOAD_MESSAGES.ERROR.CANDIDATE_ALREADY_APPLIED,
        });
        continue;
      }

      try {
        const { mediaId, uploadJobId } = await this.db.transaction(
          async (tx) => {
            const [mediaRecord] = await tx
              .insert(schema.mediaSchema)
              .values({
                recordId: dto.jobId,
                module: "connector_upload",
                filePath: file.filePath,
                fileName: file.fileName,
                fileType: file.fileType,
                mimeType: file.mimeType,
                size: file.size.toString(),
                createdBy: userId,
              })
              .returning({ id: schema.mediaSchema.id });

            const [uploadJob] = await tx
              .insert(schema.recruitmentUploadJobs)
              .values({
                jobId: dto.jobId,
                connectorUserId: userId,
                resumeMediaId: mediaRecord.id,
                fileName: file.fileName,
                status: UPLOAD_JOB_STATUS.QUEUED,
                candidateEmailHash: emailHash,
                createdAt: toUTC(),
                updatedAt: toUTC(),
              })
              .returning({ id: schema.recruitmentUploadJobs.id });

            return { mediaId: mediaRecord.id, uploadJobId: uploadJob.id };
          }
        );

        await this.queueService.queueResumeProcessing({
          jobId: dto.jobId,
          connectorUserId: userId,
          mediaId,
          filePath: file.filePath,
          uploadJobId,
          connectorEmail: normalizedEmail,
        });

        seenEmailHashes.add(emailHash);
        succeeded.push({ ...base, uploadJobId });
      } catch (error) {
        this.logger.error(
          `CONNECTOR_UPLOAD_SERVICE :: processUpload : ERROR : ${error}`
        );
        failed.push({
          ...base,
          reason: CONNECTOR_UPLOAD_MESSAGES.ERROR.EXTRACTION_FAILED,
        });
      }
    }

    return {
      uploadCount: succeeded.length,
      uploadJobIds: succeeded.map((s) => s.uploadJobId),
      succeeded,
      failed,
    };
  }

  async retryUploadJob(uploadJobId: string, userId: string): Promise<void> {
    const [uploadJob] = await this.db
      .select()
      .from(schema.recruitmentUploadJobs)
      .where(
        and(
          eq(schema.recruitmentUploadJobs.id, uploadJobId),
          eq(schema.recruitmentUploadJobs.connectorUserId, userId),
          isNull(schema.recruitmentUploadJobs.deletedAt)
        )
      )
      .limit(1);

    if (!uploadJob) {
      throw new NotFoundException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.UPLOAD_JOB_NOT_FOUND
      );
    }

    if (uploadJob.status !== UPLOAD_JOB_STATUS.FAILED) {
      throw new BadRequestException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.UPLOAD_JOB_NOT_FAILED
      );
    }

    if (uploadJob.retryCount >= MAX_UPLOAD_JOB_RETRIES) {
      throw new BadRequestException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.UPLOAD_JOB_MAX_RETRIES
      );
    }

    const found = await this.queueService.retryExistingJob(uploadJobId);
    if (!found) {
      throw new BadRequestException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.UPLOAD_JOB_NOT_FOUND
      );
    }

    await this.db
      .update(schema.recruitmentUploadJobs)
      .set({
        status: UPLOAD_JOB_STATUS.QUEUED,
        failureReason: null,
        retryCount: uploadJob.retryCount + 1,
        updatedAt: toUTC(),
      })
      .where(eq(schema.recruitmentUploadJobs.id, uploadJobId));
  }

  async dismissUploadJob(uploadJobId: string, userId: string): Promise<void> {
    const [uploadJob] = await this.db
      .select({
        id: schema.recruitmentUploadJobs.id,
        status: schema.recruitmentUploadJobs.status,
      })
      .from(schema.recruitmentUploadJobs)
      .where(
        and(
          eq(schema.recruitmentUploadJobs.id, uploadJobId),
          eq(schema.recruitmentUploadJobs.connectorUserId, userId),
          isNull(schema.recruitmentUploadJobs.deletedAt)
        )
      )
      .limit(1);

    if (!uploadJob) {
      throw new NotFoundException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.UPLOAD_JOB_NOT_FOUND
      );
    }

    if (
      uploadJob.status !== UPLOAD_JOB_STATUS.FAILED &&
      uploadJob.status !== UPLOAD_JOB_STATUS.COMPLETED
    ) {
      throw new BadRequestException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.UPLOAD_JOB_CANNOT_DISMISS
      );
    }

    await this.db
      .update(schema.recruitmentUploadJobs)
      .set({ deletedAt: toUTC(), updatedAt: toUTC() })
      .where(eq(schema.recruitmentUploadJobs.id, uploadJobId));
  }
}
