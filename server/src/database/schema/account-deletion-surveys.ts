import { serial, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { prospectlySchema } from "./schema-definition";

export interface AccountDeletionSurveyData {
  primaryReason: string;
  additionalDetails?: string;
  feedbackText?: string;
}

export const accountDeletionSurveys = prospectlySchema.table(
  "account_deletion_surveys",
  {
    id: serial("id").primaryKey(),
    surveyData: jsonb("survey_data")
      .$type<AccountDeletionSurveyData>()
      .notNull(),
    email: varchar("email", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);
