import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";

enum CreditRulesProvider {
  GOOGLE = "google",
  MICROSOFT = "microsoft",
  LINKEDIN = "linkedin",
  APPLE = "apple",
  LINKEDIN_VERIFIED = "linkedin_verified",
}

@Injectable()
export class CreditRulesSeeder {
  private readonly logger = new Logger(CreditRulesSeeder.name);
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async seedDefaultCreditRules() {
    const defaultRules = [
      {
        provider: CreditRulesProvider.GOOGLE,
        contactImport: "10",
        credits: "10.00",
        isActive: true,
      },
      {
        provider: CreditRulesProvider.MICROSOFT,
        contactImport: "10",
        credits: "10.00",
        isActive: true,
      },
      {
        provider: CreditRulesProvider.LINKEDIN,
        contactImport: "10",
        credits: "10.00",
        isActive: true,
      },
      {
        provider: CreditRulesProvider.APPLE,
        contactImport: "10",
        credits: "10.00",
        isActive: true,
      },
    ];

    try {
      for (const rule of defaultRules) {
        const existing = await this.db
          .select()
          .from(schema.creditRulesSchema)
          .where(
            and(
              eq(schema.creditRulesSchema.provider, rule.provider),
              isNull(schema.creditRulesSchema.deletedAt)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await this.db.insert(schema.creditRulesSchema).values(rule);
        }
      }
    } catch (error) {
      this.logger.error("Error seeding default credit rules:", error);
      throw error;
    }
  }
}
