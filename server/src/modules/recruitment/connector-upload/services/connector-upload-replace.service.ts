import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import type { ResolvedReplaceTarget } from "../connector-upload-replace.types";
import { ConnectorUploadReplaceTargetService } from "./connector-upload-replace-target.service";
import { ConnectorUploadReplaceEligibilityService } from "./connector-upload-replace-eligibility.service";
import { ConnectorUploadReplacePersistService } from "./connector-upload-replace-persist.service";
import { ConnectorReplaceResumeDto } from "../connector-upload-replace.dto";
import { ConnectorUploadQueueService } from "../connector-upload-queue.service";
import {
  CONNECTOR_UPLOAD_MESSAGES,
  UPLOAD_JOB_STATUS,
  UPLOAD_JOB_FAILURE_REASON,
} from "../connector-upload.constants";

@Injectable()
export class ConnectorUploadReplaceService {
  private readonly logger = new Logger(ConnectorUploadReplaceService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly queueService: ConnectorUploadQueueService,
    private readonly targetService: ConnectorUploadReplaceTargetService,
    private readonly eligibility: ConnectorUploadReplaceEligibilityService,
    private readonly persistService: ConnectorUploadReplacePersistService
  ) {}

  async replaceResume(dto: ConnectorReplaceResumeDto, userId: string) {
    if (!dto.piiConsent) {
      throw new BadRequestException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.PII_CONSENT_REQUIRED
      );
    }
    if (!dto.matchId && !dto.candidateId) {
      throw new BadRequestException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.REPLACE_TARGET_REQUIRED
      );
    }

    const target = await this.targetService.resolveTarget(dto, userId);
    this.eligibility.assertReplaceAllowed(target);

    const [job] = await this.db
      .select({ id: schema.recruitmentJobsSchema.id })
      .from(schema.recruitmentJobsSchema)
      .where(
        and(
          eq(schema.recruitmentJobsSchema.id, target.jobId),
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

    const txResult = await this.persistService.persistReplace(
      dto,
      userId,
      target
    );

    try {
      await this.queueService.queueReplaceResume({
        jobId: target.jobId,
        connectorUserId: userId,
        mediaId: txResult.mediaId,
        uploadJobId: txResult.uploadJobId,
        matchId: target.matchId,
        contactId: target.contactId,
        preReplacePoolStatus: target.poolStatus,
        candidateId: target.candidateId,
      });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_UPLOAD_REPLACE_SERVICE :: queueReplaceResume : ERROR : ${error}`
      );
      await this.compensateFailedEnqueue(target, txResult.uploadJobId);
      throw error;
    }

    return {
      uploadJobId: txResult.uploadJobId,
      matchId: target.matchId,
    };
  }

  private async compensateFailedEnqueue(
    target: ResolvedReplaceTarget,
    uploadJobId: string
  ): Promise<void> {
    const now = toUTC();
    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.recruitmentUploadJobs)
        .set({
          status: UPLOAD_JOB_STATUS.FAILED,
          failureReason: UPLOAD_JOB_FAILURE_REASON.UNKNOWN,
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.recruitmentUploadJobs.id, uploadJobId));

      await tx
        .update(schema.recruitmentJobPoolMatches)
        .set({
          status: target.poolStatus,
          resumeMediaId: target.resumeMediaId,
          failureReason: null,
          updatedAt: now,
        })
        .where(eq(schema.recruitmentJobPoolMatches.id, target.matchId));

      if (target.candidateId) {
        await tx
          .update(schema.recruitmentJobCandidates)
          .set({
            resumeMediaId: target.resumeMediaId,
            analysisStatus: target.candidateAnalysisStatus,
            updatedAt: now,
          })
          .where(eq(schema.recruitmentJobCandidates.id, target.candidateId));
      }
    });
  }
}
