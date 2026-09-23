import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { toUTC } from "utils/dayjs";

const departmentsData = [
  {
    name: "Engineering",
    slug: "engineering",
    isActive: true,
  },
  {
    name: "Sales",
    slug: "sales",
    isActive: true,
  },
  {
    name: "Marketing",
    slug: "marketing",
    isActive: true,
  },
  {
    name: "Human Resources",
    slug: "human-resources",
    isActive: true,
  },
  {
    name: "Finance & Accounting",
    slug: "finance-accounting",
    isActive: true,
  },
  {
    name: "Operations",
    slug: "operations",
    isActive: true,
  },
  {
    name: "Customer Support",
    slug: "customer-support",
    isActive: true,
  },
  {
    name: "Product Management",
    slug: "product-management",
    isActive: true,
  },
  {
    name: "Legal",
    slug: "legal",
    isActive: true,
  },
  {
    name: "Executive",
    slug: "executive",
    isActive: true,
  },
];

@Injectable()
export class DepartmentsSeeder {
  private readonly logger = new Logger(DepartmentsSeeder.name);
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async seed() {
    try {
      for (const department of departmentsData) {
        const existing = await this.db
          .select()
          .from(schema.departmentsSchema)
          .where(eq(schema.departmentsSchema.slug, department.slug))
          .limit(1);

        if (existing.length > 0) {
          await this.db
            .update(schema.departmentsSchema)
            .set({
              name: department.name,
              isActive: department.isActive,
              updatedAt: toUTC(),
            })
            .where(eq(schema.departmentsSchema.slug, department.slug));

          this.logger.log(
            `DEPARTMENTS_SEEDER :: Updated department: ${department.name}`
          );
        } else {
          await this.db.insert(schema.departmentsSchema).values({
            name: department.name,
            slug: department.slug,
            isActive: department.isActive,
          });

          this.logger.log(
            `DEPARTMENTS_SEEDER :: Created department: ${department.name}`
          );
        }
      }
    } catch (error) {
      this.logger.error(`DEPARTMENTS_SEEDER :: ERROR :: ${error}`);
      throw error;
    }
  }
}
