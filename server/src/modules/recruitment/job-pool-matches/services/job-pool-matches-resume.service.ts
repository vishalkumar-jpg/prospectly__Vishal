import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { S3Service } from "shared/s3.service";
import { CANDIDATE_RESUME_URL_TTL_SECONDS } from "../../candidates/candidates.constants";

@Injectable()
export class JobPoolMatchesResumeService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly s3Service: S3Service
  ) {}

  async getPoolMatchResumeUrl(userId: string, matchId: string) {
    const matches = schema.recruitmentJobPoolMatches;
    const [row] = await this.db
      .select({
        connectorUserId: matches.connectorUserId,
        resumeFilePath: schema.mediaSchema.filePath,
        resumeFileName: schema.mediaSchema.fileName,
      })
      .from(matches)
      .leftJoin(
        schema.mediaSchema,
        eq(matches.resumeMediaId, schema.mediaSchema.id)
      )
      .where(and(eq(matches.id, matchId), isNull(matches.deletedAt)))
      .limit(1);

    if (!row || row.connectorUserId !== userId) {
      throw new NotFoundException("Resume not available");
    }

    if (!row.resumeFilePath) {
      throw new NotFoundException("Resume not available");
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
