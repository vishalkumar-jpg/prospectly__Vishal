import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { toCanonicalLinkedInProfileUrl } from "utils/linkedin-profile.utils";

@Injectable()
export class CandidatesCheckApplicationService {
  private readonly logger = new Logger(CandidatesCheckApplicationService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async checkApplication(userId: string, jobId: string) {
    const [existing] = await this.db
      .select({ id: schema.recruitmentJobCandidates.id })
      .from(schema.recruitmentJobCandidates)
      .where(
        and(
          eq(schema.recruitmentJobCandidates.jobId, jobId),
          eq(schema.recruitmentJobCandidates.candidateUserId, userId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    return {
      hasApplied: !!existing,
      // Contact LI only — profile LI is read from Auth user on the client.
      suggestedLinkedinUrl: await this.resolveContactLinkedin(userId),
    };
  }

  private async resolveContactLinkedin(userId: string): Promise<string | null> {
    try {
      const [contactRow] = await this.db
        .select({ linkedin: schema.contacts.linkedin })
        .from(schema.recruitmentJobCandidates)
        .innerJoin(
          schema.contacts,
          eq(schema.contacts.id, schema.recruitmentJobCandidates.contactId)
        )
        .where(
          and(
            eq(schema.recruitmentJobCandidates.candidateUserId, userId),
            isNull(schema.recruitmentJobCandidates.deletedAt),
            isNull(schema.contacts.deletedAt),
            isNotNull(schema.contacts.linkedin)
          )
        )
        .orderBy(desc(schema.recruitmentJobCandidates.createdAt))
        .limit(1);

      return toCanonicalLinkedInProfileUrl(contactRow?.linkedin);
    } catch (error) {
      this.logger.error(
        `CANDIDATES_CHECK_APPLICATION :: resolveContactLinkedin : ERROR : ${error}`
      );
      return null;
    }
  }
}
