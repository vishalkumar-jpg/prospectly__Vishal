import { Injectable, Inject } from "@nestjs/common";
import { eq, and, notInArray } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { toUTC } from "utils/dayjs";
import { ArchiveRequesterIntroductionDto } from "./requester-archive.dto";
import { IntroductionStatus } from "../introductions.constants";

@Injectable()
export class RequesterArchivePersistenceService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async archiveRequest(
    requestId: string,
    dto: ArchiveRequesterIntroductionDto
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.marketplaceClaims)
        .set({
          status: "failed",
          failureReason: "Introduction withdrawn by requester",
          verificationCompletedAt: toUTC(),
          updatedAt: toUTC(),
        })
        .where(
          and(
            eq(schema.marketplaceClaims.introductionRequestId, requestId),
            notInArray(schema.marketplaceClaims.status, ["completed", "failed"])
          )
        );

      await tx
        .update(schema.introductionPotentialConnectors)
        .set({
          status: "failed",
          updatedAt: toUTC(),
        })
        .where(eq(schema.introductionPotentialConnectors.requestId, requestId));

      await tx
        .update(schema.introductionRequests)
        .set({
          requesterArchived: true,
          requesterArchiveReason: dto.archiveReason,
          requesterArchiveNotes: dto.archiveNotes,
          requesterArchivedAt: toUTC(),
          isMarketplaceVisible: false,
          status: IntroductionStatus.ARCHIVED,
          updatedAt: toUTC(),
        })
        .where(eq(schema.introductionRequests.id, requestId));
    });
  }
}
