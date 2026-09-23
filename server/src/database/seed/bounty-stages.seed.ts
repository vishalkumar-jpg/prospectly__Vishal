import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { toUTC } from "utils/dayjs";

const bountyStagesData = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    stageId: "awaiting_connector",
    title: "Awaiting Connector",
    description: "Waiting for a connector to accept",
    percentage: 0,
    stageOrder: 0,
    icon: "Users",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
    isActive: true,
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    stageId: "awaiting_intro",
    title: "Awaiting Intro",
    description: "Connector accepted, waiting for intro",
    percentage: 0,
    stageOrder: 1,
    icon: "Hourglass",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    isActive: true,
  },
  {
    id: "1e17c329-2153-45c1-96e2-31591984c905",
    stageId: "intro_sent",
    title: "Intro Sent",
    description: "Introduction email sent to prospect",
    percentage: 5,
    stageOrder: 2,
    icon: "Send",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    isActive: true,
  },
  {
    id: "c68b0f3e-bed2-4bcd-ae31-c170fe053ecd",
    stageId: "meeting_booked",
    title: "Meeting Booked",
    description: "Meeting scheduled & confirmed",
    percentage: 15,
    stageOrder: 3,
    icon: "Calendar",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    isActive: true,
  },
  {
    id: "ea06ff6a-2a71-468e-b20a-d9ca3ba0dd01",
    stageId: "meeting_completed",
    title: "Meeting Completed",
    description: "Meeting held successfully",
    percentage: 45,
    stageOrder: 4,
    icon: "Handshake",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    isActive: true,
  },
  {
    id: "7d6324d7-4519-4939-89b9-bf50b524527b",
    stageId: "peer_feedback",
    title: "Peer Feedback",
    description: "Feedback & rating of the other party",
    percentage: 35,
    stageOrder: 5,
    icon: "Star",
    color:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    isActive: true,
  },
];

@Injectable()
export class BountyStagesSeeder {
  private readonly logger = new Logger(BountyStagesSeeder.name);
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async seed() {
    try {
      for (const stage of bountyStagesData) {
        const existing = await this.db
          .select()
          .from(schema.bountyStages)
          .where(eq(schema.bountyStages.stageId, stage.stageId))
          .limit(1);

        if (existing.length > 0) {
          // Update existing record with all columns except id and stageId
          await this.db
            .update(schema.bountyStages)
            .set({
              title: stage.title,
              description: stage.description,
              percentage: stage.percentage,
              stageOrder: stage.stageOrder,
              icon: stage.icon,
              color: stage.color,
              isActive: stage.isActive,
              updatedAt: toUTC(),
            })
            .where(eq(schema.bountyStages.stageId, stage.stageId));

          this.logger.log(
            `BOUNTY_STAGES_SEEDER :: Updated bounty stage: ${stage.title}`
          );
        } else {
          await this.db.insert(schema.bountyStages).values({
            id: stage.id,
            stageId: stage.stageId,
            title: stage.title,
            description: stage.description,
            percentage: stage.percentage,
            stageOrder: stage.stageOrder,
            icon: stage.icon,
            color: stage.color,
            isActive: stage.isActive,
          });

          this.logger.log(
            `BOUNTY_STAGES_SEEDER :: Created bounty stage: ${stage.title}`
          );
        }
      }
    } catch (error) {
      this.logger.error(`BOUNTY_STAGES_SEEDER :: ERROR :: ${error}`);
      throw error;
    }
  }
}
