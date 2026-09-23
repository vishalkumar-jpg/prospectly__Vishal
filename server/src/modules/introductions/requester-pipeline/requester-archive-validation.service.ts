import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { eq, and, inArray } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import {
  MARKETPLACE_CLAIM_BLOCKING_STATUSES,
  REQUESTER_ARCHIVE_MESSAGES,
} from "./requester-archive.constants";
import {
  resolveRequesterPipelineStage,
  isRequesterArchiveEligiblePipelineStage,
} from "./requester-pipeline-stage.helpers";

@Injectable()
export class RequesterArchiveValidationService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async assertCanArchive(
    userId: string,
    requestId: string
  ): Promise<schema.IntroductionRequest> {
    const request = await this.db.query.introductionRequests.findFirst({
      where: eq(schema.introductionRequests.id, requestId),
    });

    if (!request) {
      throw new NotFoundException(
        "Introduction request not found or no longer available"
      );
    }

    if (request.requesterId !== userId) {
      throw new ForbiddenException(REQUESTER_ARCHIVE_MESSAGES.NOT_REQUESTER);
    }

    if (request.requesterArchived) {
      throw new BadRequestException(
        REQUESTER_ARCHIVE_MESSAGES.ALREADY_ARCHIVED
      );
    }

    const pipelineStage = resolveRequesterPipelineStage(request.status);
    if (!isRequesterArchiveEligiblePipelineStage(pipelineStage)) {
      throw new BadRequestException(REQUESTER_ARCHIVE_MESSAGES.INVALID_STAGE);
    }

    const [blockingRow] = await this.db
      .select({ id: schema.marketplaceClaims.id })
      .from(schema.marketplaceClaims)
      .where(
        and(
          eq(schema.marketplaceClaims.introductionRequestId, requestId),
          inArray(schema.marketplaceClaims.status, [
            ...MARKETPLACE_CLAIM_BLOCKING_STATUSES,
          ] as string[])
        )
      )
      .limit(1);

    if (blockingRow) {
      throw new ConflictException(
        REQUESTER_ARCHIVE_MESSAGES.CONFLICT_CLAIM_IN_PROGRESS
      );
    }

    return request;
  }
}
