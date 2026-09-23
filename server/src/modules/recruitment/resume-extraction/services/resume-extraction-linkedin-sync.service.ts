import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC } from "utils/dayjs";
import { upsertContactLinkedin, type Tx } from "utils/linkedin-contact.persist";
import { toCanonicalLinkedInProfileUrl } from "utils/linkedin-profile.utils";

/**
 * After public-share apply resume extraction: fill blank LinkedIn on
 * users + contacts. Never overwrites a valid existing value.
 */
@Injectable()
export class ResumeExtractionLinkedinSyncService {
  private readonly logger = new Logger(
    ResumeExtractionLinkedinSyncService.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async syncFromResumeExtract(params: {
    userId: string;
    contactId?: number | null;
    linkedinUrl: string | null | undefined;
  }): Promise<void> {
    const displayUrl = toCanonicalLinkedInProfileUrl(params.linkedinUrl);
    if (!displayUrl) {
      this.logger.log(
        `RESUME_LI_SYNC :: SKIP_INVALID : userId=${params.userId}`
      );
      return;
    }

    const now = toUTC();
    await this.db.transaction(async (tx) => {
      await this.fillUserLinkedinIfBlank(tx, params.userId, displayUrl, now);
      if (params.contactId != null) {
        await this.fillContactLinkedinIfBlank(
          tx,
          params.contactId,
          displayUrl,
          now
        );
      }
    });
  }

  private async fillUserLinkedinIfBlank(
    tx: Tx,
    userId: string,
    displayUrl: string,
    now: Date
  ): Promise<void> {
    const [user] = await tx
      .select({ linkedinUrl: schema.users.linkedinUrl })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (toCanonicalLinkedInProfileUrl(user?.linkedinUrl)) {
      this.logger.log(
        `RESUME_LI_SYNC :: SKIP_USER_EXISTING : userId=${userId}`
      );
      return;
    }

    await tx
      .update(schema.users)
      .set({ linkedinUrl: displayUrl, updatedAt: now })
      .where(eq(schema.users.id, userId));

    this.logger.log(`RESUME_LI_SYNC :: SAVED_USER : userId=${userId}`);
  }

  private async fillContactLinkedinIfBlank(
    tx: Tx,
    contactId: number,
    displayUrl: string,
    now: Date
  ): Promise<void> {
    const [existing] = await tx
      .select({ linkedin: schema.contacts.linkedin })
      .from(schema.contacts)
      .where(
        and(
          eq(schema.contacts.id, contactId),
          isNull(schema.contacts.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      this.logger.log(
        `RESUME_LI_SYNC :: SKIP_CONTACT_MISSING : contactId=${contactId}`
      );
      return;
    }

    if (toCanonicalLinkedInProfileUrl(existing.linkedin)) {
      this.logger.log(
        `RESUME_LI_SYNC :: SKIP_CONTACT_EXISTING : contactId=${contactId}`
      );
      return;
    }

    await upsertContactLinkedin(tx, contactId, displayUrl, now);
    this.logger.log(`RESUME_LI_SYNC :: SAVED_CONTACT : contactId=${contactId}`);
  }
}
