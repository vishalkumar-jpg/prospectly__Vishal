import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { and, eq } from "drizzle-orm";
import { toUTC } from "utils/dayjs";

const tiersData = [
  {
    salaryMin: "0",
    salaryMax: "10000",
    salaryPeriod: "yearly",
    bountyAmount: "25",
  },
  {
    salaryMin: "10001",
    salaryMax: "20000",
    salaryPeriod: "yearly",
    bountyAmount: "50",
  },
  {
    salaryMin: "20001",
    salaryMax: "50000",
    salaryPeriod: "yearly",
    bountyAmount: "100",
  },
  {
    salaryMin: "50001",
    salaryMax: "100000",
    salaryPeriod: "yearly",
    bountyAmount: "200",
  },
];

@Injectable()
export class RecruitmentBountyTiersSeeder {
  private readonly logger = new Logger(RecruitmentBountyTiersSeeder.name);
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async seed() {
    try {
      for (const tier of tiersData) {
        const existing = await this.db
          .select()
          .from(schema.recruitmentBountyTiersSchema)
          .where(
            and(
              eq(schema.recruitmentBountyTiersSchema.salaryMin, tier.salaryMin),
              eq(schema.recruitmentBountyTiersSchema.salaryMax, tier.salaryMax),
              eq(
                schema.recruitmentBountyTiersSchema.salaryPeriod,
                tier.salaryPeriod
              )
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await this.db
            .update(schema.recruitmentBountyTiersSchema)
            .set({
              bountyAmount: tier.bountyAmount,
              updatedAt: toUTC(),
            })
            .where(
              and(
                eq(
                  schema.recruitmentBountyTiersSchema.salaryMin,
                  tier.salaryMin
                ),
                eq(
                  schema.recruitmentBountyTiersSchema.salaryMax,
                  tier.salaryMax
                ),
                eq(
                  schema.recruitmentBountyTiersSchema.salaryPeriod,
                  tier.salaryPeriod
                )
              )
            );

          this.logger.log(
            `RECRUITMENT_BOUNTY_TIERS_SEEDER :: Updated tier: $${tier.salaryMin}-$${tier.salaryMax} (${tier.salaryPeriod}) → $${tier.bountyAmount}`
          );
        } else {
          await this.db.insert(schema.recruitmentBountyTiersSchema).values({
            salaryMin: tier.salaryMin,
            salaryMax: tier.salaryMax,
            salaryPeriod: tier.salaryPeriod,
            bountyAmount: tier.bountyAmount,
          });

          this.logger.log(
            `RECRUITMENT_BOUNTY_TIERS_SEEDER :: Created tier: $${tier.salaryMin}-$${tier.salaryMax} (${tier.salaryPeriod}) → $${tier.bountyAmount}`
          );
        }
      }
    } catch (error) {
      this.logger.error(`RECRUITMENT_BOUNTY_TIERS_SEEDER :: ERROR :: ${error}`);
      throw error;
    }
  }
}
