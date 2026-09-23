import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { S3Service } from "shared/s3.service";
import {
  CANDIDATES_MESSAGES,
  CANDIDATE_RESUME_URL_TTL_SECONDS,
} from "modules/recruitment/candidates/candidates.constants";

@Injectable()
export class ConnectorPipelineCandidateResumeService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly s3Service: S3Service
  ) {}

  /** Presigned resume URL for a candidate this connector is attributed to. */
  async getCandidateResumeUrl(connectorUserId: string, candidateId: string) {
    const [access] = await this.db
      .select({ id: schema.recruitmentCandidateConnectors.id })
      .from(schema.recruitmentCandidateConnectors)
      .where(
        and(
          eq(schema.recruitmentCandidateConnectors.candidateId, candidateId),
          eq(
            schema.recruitmentCandidateConnectors.connectorUserId,
            connectorUserId
          ),
          isNull(schema.recruitmentCandidateConnectors.deletedAt)
        )
      )
      .limit(1);

    if (!access) {
      throw new ForbiddenException(
        CANDIDATES_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
      );
    }

    const [row] = await this.db
      .select({
        resumeFilePath: schema.mediaSchema.filePath,
        resumeFileName: schema.mediaSchema.fileName,
      })
      .from(schema.recruitmentJobCandidates)
      .leftJoin(
        schema.mediaSchema,
        eq(schema.recruitmentJobCandidates.resumeMediaId, schema.mediaSchema.id)
      )
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!row?.resumeFilePath) {
      throw new NotFoundException(
        CANDIDATES_MESSAGES.ERROR.RESUME_NOT_AVAILABLE
      );
    }

    const url = await this.s3Service.generatePresignedGetUrl(
      row.resumeFilePath,
      CANDIDATE_RESUME_URL_TTL_SECONDS
    );

    return {
      url,
      fileName: row.resumeFileName || null,
      expiresIn: CANDIDATE_RESUME_URL_TTL_SECONDS,
    };
  }
}
