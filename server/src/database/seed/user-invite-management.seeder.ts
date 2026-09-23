import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";

const REFERRAL_CONFIGURATION_KEYS = {
  INVITE_EXPIRY_DAYS: "invite_expiry_days",
  PLAN_THRESHOLDS: "plan_thresholds",
} as const;

@Injectable()
export class UserInviteManagementSeeder {
  private readonly logger = new Logger(UserInviteManagementSeeder.name);
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async seed() {
    try {
      this.logger.log(
        "USER_INVITE_SEEDER :: Starting referral configuration seeding"
      );

      // Seed invite_expiry_days
      const existingExpiryConfig =
        await this.db.query.referralConfigurationSchema.findFirst({
          where: eq(
            schema.referralConfigurationSchema.key,
            REFERRAL_CONFIGURATION_KEYS.INVITE_EXPIRY_DAYS
          ),
        });

      if (!existingExpiryConfig) {
        await this.db.insert(schema.referralConfigurationSchema).values({
          key: REFERRAL_CONFIGURATION_KEYS.INVITE_EXPIRY_DAYS,
          value: 30,
          description:
            "Number of days before invite expires (applies to new invites only)",
          isActive: true,
        });
        this.logger.log(
          "USER_INVITE_SEEDER :: Created invite_expiry_days configuration"
        );
      }

      // Seed plan_thresholds (empty object initially, admin will configure)
      const existingThresholdsConfig =
        await this.db.query.referralConfigurationSchema.findFirst({
          where: eq(
            schema.referralConfigurationSchema.key,
            REFERRAL_CONFIGURATION_KEYS.PLAN_THRESHOLDS
          ),
        });

      if (!existingThresholdsConfig) {
        await this.db.insert(schema.referralConfigurationSchema).values({
          key: REFERRAL_CONFIGURATION_KEYS.PLAN_THRESHOLDS,
          value: {}, // Empty object, admin will configure plan-specific thresholds
          description:
            "Plan-specific referral thresholds (plan_id -> threshold_count mapping)",
          isActive: true,
        });
        this.logger.log(
          "USER_INVITE_SEEDER :: Created plan_thresholds configuration"
        );
      }

      this.logger.log(
        "USER_INVITE_SEEDER :: Referral configuration seeding completed"
      );
    } catch (error) {
      this.logger.error(`USER_INVITE_SEEDER :: ERROR :: ${error}`);
      throw error;
    }
  }
}
