import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { ResolvedReplaceTarget } from "../connector-upload-replace.types";
import {
  REPLACE_ALLOWED_RECRUITER_STAGES,
  REPLACE_BLOCKED_POOL_STATUSES,
  REPLACE_LOCKED_RECRUITER_STAGES,
} from "../connector-upload-replace.constants";
import {
  CONNECTOR_UPLOAD_MESSAGES,
  UPLOAD_JOB_STATUS,
} from "../connector-upload.constants";
import {
  JOB_POOL_MATCH_SOURCE,
  JOB_POOL_MATCH_STATUS,
} from "../../job-pool-matches/job-pool-matches.constants";

type DbExecutor = PostgresJsDatabase<typeof schema>;

@Injectable()
export class ConnectorUploadReplaceEligibilityService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  assertReplaceAllowed(target: ResolvedReplaceTarget): void {
    const hasResume =
      target.poolSource === JOB_POOL_MATCH_SOURCE.CONNECTOR_UPLOADED ||
      Boolean(target.resumeMediaId);
    if (!hasResume) {
      throw new BadRequestException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.REPLACE_NO_RESUME
      );
    }

    if (
      REPLACE_BLOCKED_POOL_STATUSES.includes(
        target.poolStatus as (typeof REPLACE_BLOCKED_POOL_STATUSES)[number]
      )
    ) {
      throw new ConflictException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.REPLACE_STATUS_BLOCKED
      );
    }

    if (target.poolStatus === JOB_POOL_MATCH_STATUS.PROCESSING) {
      throw new ConflictException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.REPLACE_ANALYSIS_IN_FLIGHT
      );
    }

    if (
      target.recruiterStageKey &&
      REPLACE_LOCKED_RECRUITER_STAGES.includes(
        target.recruiterStageKey as (typeof REPLACE_LOCKED_RECRUITER_STAGES)[number]
      )
    ) {
      throw new ConflictException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.REPLACE_STAGE_LOCKED
      );
    }

    if (
      target.poolStatus === JOB_POOL_MATCH_STATUS.CONSENT_ACCEPTED &&
      target.recruiterStageKey &&
      !REPLACE_ALLOWED_RECRUITER_STAGES.includes(
        target.recruiterStageKey as (typeof REPLACE_ALLOWED_RECRUITER_STAGES)[number]
      )
    ) {
      throw new ConflictException(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.REPLACE_STAGE_LOCKED
      );
    }
  }

  async hasActiveReplaceJob(
    matchId: string,
    executor: DbExecutor = this.db
  ): Promise<boolean> {
    const rows = await executor
      .select({ id: schema.recruitmentUploadJobs.id })
      .from(schema.recruitmentUploadJobs)
      .where(
        and(
          eq(schema.recruitmentUploadJobs.poolMatchId, matchId),
          inArray(schema.recruitmentUploadJobs.status, [
            UPLOAD_JOB_STATUS.QUEUED,
            UPLOAD_JOB_STATUS.PROCESSING,
          ]),
          isNull(schema.recruitmentUploadJobs.deletedAt)
        )
      )
      .limit(1);

    return rows.length > 0;
  }
}
