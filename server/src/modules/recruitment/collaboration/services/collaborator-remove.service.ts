import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import {
  COLLABORATOR_STATUS,
  RECRUITMENT_COLLABORATION_MESSAGES,
} from "../recruitment-collaboration.constants";

@Injectable()
export class CollaboratorRemoveService {
  private readonly logger = new Logger(CollaboratorRemoveService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async removeCollaborator(
    ownerId: string,
    jobId: string,
    collaboratorUserId: string
  ) {
    const [existing] = await this.db
      .select({ id: schema.recruitmentJobCollaborators.id })
      .from(schema.recruitmentJobCollaborators)
      .where(
        and(
          eq(schema.recruitmentJobCollaborators.jobId, jobId),
          eq(
            schema.recruitmentJobCollaborators.collaboratorUserId,
            collaboratorUserId
          ),
          eq(
            schema.recruitmentJobCollaborators.status,
            COLLABORATOR_STATUS.ACTIVE
          ),
          isNull(schema.recruitmentJobCollaborators.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException(
        RECRUITMENT_COLLABORATION_MESSAGES.ERROR.COLLABORATOR_NOT_FOUND
      );
    }

    const now = toUTC();
    await this.db
      .update(schema.recruitmentJobCollaborators)
      .set({
        status: COLLABORATOR_STATUS.REMOVED,
        deletedAt: now,
        updatedAt: now,
        updatedBy: ownerId,
      })
      .where(eq(schema.recruitmentJobCollaborators.id, existing.id));

    return { id: existing.id, removed: true };
  }
}
