import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import type { ResolvedReplaceTarget } from "../connector-upload-replace.types";
import { ConnectorUploadReplaceEligibilityService } from "./connector-upload-replace-eligibility.service";
import { ConnectorReplaceResumeDto } from "../connector-upload-replace.dto";
import {
  CONNECTOR_UPLOAD_MESSAGES,
  UPLOAD_JOB_STATUS,
} from "../connector-upload.constants";
import { JOB_POOL_MATCH_STATUS } from "../../job-pool-matches/job-pool-matches.constants";
import { CANDIDATE_EVALUATION_CONFIG } from "../../candidate-evaluation/candidate-evaluation.constants";

@Injectable()
export class ConnectorUploadReplacePersistService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly eligibility: ConnectorUploadReplaceEligibilityService
  ) {}

  async persistReplace(
    dto: ConnectorReplaceResumeDto,
    userId: string,
    target: ResolvedReplaceTarget
  ) {
    return this.db.transaction(async (tx) => {
      const [locked] = await tx
        .select({
          id: schema.recruitmentJobPoolMatches.id,
          status: schema.recruitmentJobPoolMatches.status,
        })
        .from(schema.recruitmentJobPoolMatches)
        .where(
          and(
            eq(schema.recruitmentJobPoolMatches.id, target.matchId),
            isNull(schema.recruitmentJobPoolMatches.deletedAt)
          )
        )
        .for("update");

      if (!locked) {
        throw new NotFoundException(
          CONNECTOR_UPLOAD_MESSAGES.ERROR.MATCH_NOT_FOUND
        );
      }
      if (locked.status === JOB_POOL_MATCH_STATUS.PROCESSING) {
        throw new ConflictException(
          CONNECTOR_UPLOAD_MESSAGES.ERROR.REPLACE_ANALYSIS_IN_FLIGHT
        );
      }
      if (await this.eligibility.hasActiveReplaceJob(target.matchId, tx)) {
        throw new ConflictException(
          CONNECTOR_UPLOAD_MESSAGES.ERROR.REPLACE_ANALYSIS_IN_FLIGHT
        );
      }

      const [mediaRecord] = await tx
        .insert(schema.mediaSchema)
        .values({
          recordId: target.jobId,
          module: "connector_upload",
          filePath: dto.resume.filePath,
          fileName: dto.resume.fileName,
          fileType: dto.resume.fileType,
          mimeType: dto.resume.mimeType,
          size: dto.resume.size.toString(),
          createdBy: userId,
        })
        .returning({ id: schema.mediaSchema.id });

      const [uploadJob] = await tx
        .insert(schema.recruitmentUploadJobs)
        .values({
          jobId: target.jobId,
          connectorUserId: userId,
          resumeMediaId: mediaRecord.id,
          fileName: dto.resume.fileName,
          status: UPLOAD_JOB_STATUS.QUEUED,
          candidateEmailHash: target.candidateEmailHash,
          poolMatchId: target.matchId,
          createdAt: toUTC(),
          updatedAt: toUTC(),
        })
        .returning({ id: schema.recruitmentUploadJobs.id });

      // Pre-referral pool rows surface as `processing` on the board. Once a
      // referred job_candidates row exists, keep the pool match off the board
      // (consent_accepted is already excluded) so re-analysis does not duplicate
      // the candidate in AI Analysis + Consent Accepted/Pending.
      await tx
        .update(schema.recruitmentJobPoolMatches)
        .set(
          target.candidateId
            ? {
                resumeMediaId: mediaRecord.id,
                failureReason: null,
                updatedAt: toUTC(),
              }
            : {
                status: JOB_POOL_MATCH_STATUS.PROCESSING,
                resumeMediaId: mediaRecord.id,
                failureReason: null,
                updatedAt: toUTC(),
              }
        )
        .where(eq(schema.recruitmentJobPoolMatches.id, target.matchId));

      if (target.candidateId) {
        await tx
          .update(schema.recruitmentJobCandidates)
          .set({
            resumeMediaId: mediaRecord.id,
            analysisStatus: CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.PENDING,
            updatedAt: toUTC(),
            updatedBy: userId,
          })
          .where(eq(schema.recruitmentJobCandidates.id, target.candidateId));
      }

      return { mediaId: mediaRecord.id, uploadJobId: uploadJob.id };
    });
  }
}
