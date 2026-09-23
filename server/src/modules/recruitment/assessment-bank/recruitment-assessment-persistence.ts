import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { BadRequestException } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import type { NormalizedJobAssessmentQuestion } from "./recruitment-assessment.util";
import { ASSESSMENT_BANK_MESSAGES } from "./recruitment-assessment-bank.constants";
import { bankQuestionTextExists } from "./assessment-question-text.util";

/** The transaction handle passed into `db.transaction(async (tx) => ...)`. */
export type DrizzleTx = Parameters<
  Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
>[0];

/**
 * Diff-sync a job's assessment questions inside a transaction. Works for both
 * create (no existing rows) and edit (upsert kept, insert new, soft-delete
 * removed). `saveToBank` promotes an inline question into the recruiter's bank
 * and records the new bank id as `sourceBankQuestionId` (provenance only).
 */
export async function syncJobAssessmentQuestions(
  tx: DrizzleTx,
  params: {
    userId: string;
    jobId: string;
    questions: NormalizedJobAssessmentQuestion[];
  }
): Promise<void> {
  const { userId, jobId, questions } = params;
  const now = toUTC();
  const jobQuestions = schema.recruitmentJobAssessmentQuestionsSchema;

  // Existing (non-deleted) rows for this job.
  const existing = await tx
    .select({ id: jobQuestions.id })
    .from(jobQuestions)
    .where(and(eq(jobQuestions.jobId, jobId), isNull(jobQuestions.deletedAt)));

  const existingIds = new Set(existing.map((r) => r.id));
  const keptIds = new Set(
    questions.map((q) => q.id).filter((id): id is string => id != null)
  );

  // Soft-delete rows the client no longer includes.
  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length > 0) {
    await tx
      .update(jobQuestions)
      .set({ deletedAt: now, updatedBy: userId, updatedAt: now })
      .where(inArray(jobQuestions.id, toDelete));
  }

  for (const q of questions) {
    // Promote to the bank first if requested, then link provenance.
    let { sourceBankQuestionId } = q;
    if (q.saveToBank) {
      const alreadyInBank = await bankQuestionTextExists(
        tx,
        userId,
        q.questionText
      );
      if (alreadyInBank) {
        throw new BadRequestException(
          ASSESSMENT_BANK_MESSAGES.ERROR.DUPLICATE_BANK_QUESTION
        );
      }
      const [bankRow] = await tx
        .insert(schema.recruitmentAssessmentQuestionBankSchema)
        .values({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          createdBy: userId,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: schema.recruitmentAssessmentQuestionBankSchema.id });
      sourceBankQuestionId = bankRow.id;
    }

    const values = {
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
      orderIndex: q.orderIndex,
      isRequired: q.isRequired,
      sourceBankQuestionId: sourceBankQuestionId ?? null,
    };

    if (q.id && existingIds.has(q.id)) {
      await tx
        .update(jobQuestions)
        .set({ ...values, updatedBy: userId, updatedAt: now })
        .where(eq(jobQuestions.id, q.id));
    } else {
      await tx.insert(jobQuestions).values({
        ...values,
        jobId,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
