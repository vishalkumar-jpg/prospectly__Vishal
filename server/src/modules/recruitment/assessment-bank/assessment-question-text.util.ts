import { BadRequestException } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import * as schema from "database/schema";
import { ASSESSMENT_BANK_MESSAGES } from "./recruitment-assessment-bank.constants";

/** Canonical form for case-insensitive / whitespace-tolerant question matching. */
export function normalizeAssessmentQuestionText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Reject duplicate question texts within a single job payload. */
export function assertNoDuplicateJobQuestionTexts(
  questions: Array<{ questionText: string }>
): void {
  const seen = new Set<string>();
  for (const q of questions) {
    const key = normalizeAssessmentQuestionText(q.questionText);
    if (!key) continue;
    if (seen.has(key)) {
      throw new BadRequestException(
        ASSESSMENT_BANK_MESSAGES.ERROR.DUPLICATE_QUESTION_ON_JOB
      );
    }
    seen.add(key);
  }
}

/**
 * True when this user already has the same question text in their bank.
 * `db` may be the Nest drizzle client or a transaction handle.
 */
export async function bankQuestionTextExists(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tx + db share select API
  db: { select: (...args: any[]) => any },
  userId: string,
  questionText: string
): Promise<boolean> {
  const key = normalizeAssessmentQuestionText(questionText);
  if (!key) return false;

  const table = schema.recruitmentAssessmentQuestionBankSchema;
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.createdBy, userId),
        isNull(table.deletedAt),
        sql`lower(trim(regexp_replace(${table.questionText}, '\\s+', ' ', 'g'))) = ${key}`
      )
    )
    .limit(1);

  return !!row;
}
