import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

/** Count candidates whose current stage or stage history includes any of the given keys. */
export function buildCandidateReachedStageCondition(
  candidateId: SQLWrapper,
  currentStageKey: SQLWrapper,
  stageKeys: readonly string[]
): SQL {
  const stageList = sql.join(
    stageKeys.map((key) => sql`${key}`),
    sql`, `
  );

  return sql`(
    ${currentStageKey} IN (${stageList})
    OR EXISTS (
      SELECT 1
      FROM prospectly.recruitment_candidate_stage_history h
      INNER JOIN prospectly.recruitment_stages s ON s.id = h.stage_id
      WHERE h.candidate_id = ${candidateId}
        AND h.deleted_at IS NULL
        AND s.stage_key IN (${stageList})
    )
  )`;
}
