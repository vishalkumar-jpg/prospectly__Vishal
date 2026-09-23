import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq } from "drizzle-orm";
import { toUTC } from "utils/dayjs";

const recruitmentStagesData = [
  { stageKey: "processing", label: "Processing", stageOrder: 0 },
  { stageKey: "in_review", label: "In Review", stageOrder: 1 },
  { stageKey: "shortlisted", label: "Shortlisted", stageOrder: 2 },
  {
    stageKey: "interview_invite_sent",
    label: "Interview Invite Sent",
    stageOrder: 3,
  },
  {
    stageKey: "interview_scheduled",
    label: "Interview Scheduled",
    stageOrder: 4,
  },
  {
    stageKey: "interview_completed",
    label: "Interview Completed",
    stageOrder: 5,
  },
  { stageKey: "hired", label: "Hired", stageOrder: 6 },
  { stageKey: "rejected", label: "Rejected", stageOrder: 7 },
  { stageKey: "consent_pending", label: "Consent Pending", stageOrder: 8 },
  { stageKey: "consent_accepted", label: "Consent Accepted", stageOrder: 9 },
  { stageKey: "consent_declined", label: "Consent Declined", stageOrder: 10 },
  { stageKey: "jd_mismatched", label: "JD Mismatched", stageOrder: 11 },
  { stageKey: "ai_analysis", label: "AI Analysis", stageOrder: 12 },
  { stageKey: "qualified", label: "Qualified", stageOrder: 13 },
  { stageKey: "not_qualified", label: "Not Qualified", stageOrder: 14 },
  { stageKey: "connector_declined", label: "Not Referred", stageOrder: 15 },
];

@Injectable()
export class RecruitmentStagesSeeder {
  private readonly logger = new Logger(RecruitmentStagesSeeder.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async seed() {
    try {
      await this.db.transaction(async (tx) => {
        for (const stage of recruitmentStagesData) {
          const existing = await tx
            .select()
            .from(schema.recruitmentStagesSchema)
            .where(eq(schema.recruitmentStagesSchema.stageKey, stage.stageKey))
            .limit(1);

          if (existing.length > 0) {
            await tx
              .update(schema.recruitmentStagesSchema)
              .set({
                label: stage.label,
                stageOrder: stage.stageOrder,
                updatedAt: toUTC(),
              })
              .where(
                eq(schema.recruitmentStagesSchema.stageKey, stage.stageKey)
              );

            this.logger.log(
              `RECRUITMENT_STAGES_SEEDER :: Updated stage: ${stage.label} (stageOrder: ${stage.stageOrder})`
            );
          } else {
            await tx.insert(schema.recruitmentStagesSchema).values({
              stageKey: stage.stageKey,
              label: stage.label,
              stageOrder: stage.stageOrder,
            });

            this.logger.log(
              `RECRUITMENT_STAGES_SEEDER :: Created stage: ${stage.label}`
            );
          }
        }
      });
    } catch (error) {
      this.logger.error(`RECRUITMENT_STAGES_SEEDER :: ERROR :: ${error}`);
      throw error;
    }
  }
}
