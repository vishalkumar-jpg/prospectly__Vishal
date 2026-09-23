import { Injectable, Inject } from "@nestjs/common";
import { eq, asc } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class MasterDataService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getActiveIndustries(search?: string): Promise<schema.Industry[]> {
    const q = search?.trim();
    return this.db.query.industriesSchema.findMany({
      where: (industries, { and, eq, ilike }) => {
        const filters = [eq(industries.isActive, true)];
        if (q) {
          filters.push(ilike(industries.name, `%${q}%`));
        }
        return and(...filters);
      },
      orderBy: asc(schema.industriesSchema.name),
      limit: q ? 50 : undefined,
    });
  }

  async getActiveDepartments(search?: string): Promise<schema.Department[]> {
    const q = search?.trim();
    return this.db.query.departmentsSchema.findMany({
      where: (departments, { and, eq, ilike }) => {
        const filters = [eq(departments.isActive, true)];
        if (q) {
          filters.push(ilike(departments.name, `%${q}%`));
        }
        return and(...filters);
      },
      orderBy: asc(schema.departmentsSchema.name),
      limit: q ? 50 : undefined,
    });
  }

  async getActiveRecruitmentStages() {
    return this.db
      .select({
        id: schema.recruitmentStagesSchema.id,
        stageKey: schema.recruitmentStagesSchema.stageKey,
        label: schema.recruitmentStagesSchema.label,
        stageOrder: schema.recruitmentStagesSchema.stageOrder,
      })
      .from(schema.recruitmentStagesSchema)
      .where(eq(schema.recruitmentStagesSchema.isActive, true))
      .orderBy(asc(schema.recruitmentStagesSchema.stageOrder));
  }
}
