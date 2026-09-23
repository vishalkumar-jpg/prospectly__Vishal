import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { toUTC } from "utils/dayjs";

const industriesData = [
  {
    name: "Technology",
    slug: "technology",
    isActive: true,
  },
  {
    name: "Healthcare",
    slug: "healthcare",
    isActive: true,
  },
  {
    name: "Finance",
    slug: "finance",
    isActive: true,
  },
  {
    name: "Education",
    slug: "education",
    isActive: true,
  },
  {
    name: "Manufacturing",
    slug: "manufacturing",
    isActive: true,
  },
  {
    name: "Retail",
    slug: "retail",
    isActive: true,
  },
  {
    name: "Real Estate",
    slug: "real-estate",
    isActive: true,
  },
  {
    name: "Legal",
    slug: "legal",
    isActive: true,
  },
  {
    name: "Consulting",
    slug: "consulting",
    isActive: true,
  },
  {
    name: "Media & Entertainment",
    slug: "media-entertainment",
    isActive: true,
  },
];

@Injectable()
export class IndustriesSeeder {
  private readonly logger = new Logger(IndustriesSeeder.name);
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async seed() {
    try {
      for (const industry of industriesData) {
        const existing = await this.db
          .select()
          .from(schema.industriesSchema)
          .where(eq(schema.industriesSchema.slug, industry.slug))
          .limit(1);

        if (existing.length > 0) {
          await this.db
            .update(schema.industriesSchema)
            .set({
              name: industry.name,
              isActive: industry.isActive,
              updatedAt: toUTC(),
            })
            .where(eq(schema.industriesSchema.slug, industry.slug));

          this.logger.log(
            `INDUSTRIES_SEEDER :: Updated industry: ${industry.name}`
          );
        } else {
          await this.db.insert(schema.industriesSchema).values({
            name: industry.name,
            slug: industry.slug,
            isActive: industry.isActive,
          });

          this.logger.log(
            `INDUSTRIES_SEEDER :: Created industry: ${industry.name}`
          );
        }
      }
    } catch (error) {
      this.logger.error(`INDUSTRIES_SEEDER :: ERROR :: ${error}`);
      throw error;
    }
  }
}
