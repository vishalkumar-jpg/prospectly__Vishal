import { Injectable, Inject } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class BountyStagesService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getBountyStages(): Promise<schema.BountyStage[]> {
    return this.db.query.bountyStages.findMany({
      orderBy: desc(schema.bountyStages.createdAt),
    });
  }

  async getActiveBountyStages(): Promise<schema.BountyStage[]> {
    return this.db.query.bountyStages.findMany({
      where: eq(schema.bountyStages.isActive, true),
    });
  }

  async getBountyStageById(
    id: string
  ): Promise<schema.BountyStage | undefined> {
    return this.db.query.bountyStages.findFirst({
      where: eq(schema.bountyStages.id, id),
    });
  }

  async getBountyStageByStageId(
    stageId: string
  ): Promise<schema.BountyStage | undefined> {
    return this.db.query.bountyStages.findFirst({
      where: eq(schema.bountyStages.stageId, stageId),
    });
  }

  async getPlatformFeeStageId(): Promise<string | null> {
    const stage = await this.getBountyStageByStageId("platform_fee");
    return stage?.id || null;
  }

  async createBountyStage(
    data: typeof schema.bountyStages.$inferInsert
  ): Promise<schema.BountyStage> {
    const [stage] = await this.db
      .insert(schema.bountyStages)
      .values(data)
      .returning();
    return stage;
  }

  async updateBountyStage(
    id: string,
    data: Partial<typeof schema.bountyStages.$inferInsert>
  ): Promise<schema.BountyStage | undefined> {
    const [stage] = await this.db
      .update(schema.bountyStages)
      .set(data)
      .where(eq(schema.bountyStages.id, id))
      .returning();
    return stage;
  }
}
