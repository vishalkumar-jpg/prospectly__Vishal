import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface PrivacyRule {
  id: string;
  domain: string;
  reason: string;
  hideBounties: boolean;
}

@Injectable()
export class IntroductionPrivacyService {
  private readonly logger = new Logger(IntroductionPrivacyService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Create privacy history records for an introduction request
   * Stores a snapshot of privacy rules at the time of request creation
   *
   * @param requestId - The introduction request ID
   * @param privacyRules - Array of privacy rules to store
   */
  async createPrivacyHistory(
    requestId: string,
    privacyRules: PrivacyRule[]
  ): Promise<void> {
    if (privacyRules.length === 0) {
      return;
    }

    const records = privacyRules.map((rule) => ({
      introductionRequestId: requestId,
      domain: rule.domain,
      reason: rule.reason,
    }));

    await this.db.insert(schema.introductionPrivacy).values(records);
  }

  /**
   * Get privacy history for an introduction request
   *
   * @param requestId - The introduction request ID
   * @returns Array of privacy history records
   */
  async getPrivacyHistory(
    requestId: string
  ): Promise<schema.IntroductionPrivacy[]> {
    return await this.db
      .select()
      .from(schema.introductionPrivacy)
      .where(eq(schema.introductionPrivacy.introductionRequestId, requestId));
  }
}
