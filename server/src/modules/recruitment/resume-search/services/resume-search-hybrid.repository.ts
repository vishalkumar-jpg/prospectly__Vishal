import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { describeDbError } from "utils/db-error.utils";
import type { ResumeSearchConstraint } from "./resume-search-plan";
import { buildPipelineCte } from "./resume-search-pipeline.cte";
import {
  buildConditionCtes,
  buildResultRowsCte,
} from "./resume-search-condition.cte";
import { buildKeywordCte, buildVectorCte } from "./resume-search-ranking.cte";
import {
  mapHybridResult,
  type HybridSearchResult,
} from "./resume-search-row.mapper";
import {
  describeScopeTarget,
  type ResumeSearchScope,
} from "../resume-search.scope";

export type {
  HybridSearchRow,
  HybridSearchResult,
} from "./resume-search-row.mapper";

/**
 * Assembles and runs the hybrid query. Every CTE it stitches together is built
 * by a sibling module; this class owns only the WITH chain, the db.execute and
 * the error boundary.
 */
@Injectable()
export class ResumeSearchHybridRepository {
  private readonly logger = new Logger(ResumeSearchHybridRepository.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async search(params: {
    scope: ResumeSearchScope;
    embedding: number[] | null;
    tokens: string[];
    phrases: string[];
    constraints: ResumeSearchConstraint[];
    minYearsExperience: number | null;
  }): Promise<HybridSearchResult> {
    const { scope, embedding, tokens, phrases, constraints } = params;
    const minYears = params.minYearsExperience;
    const constrained = constraints.length > 0 || minYears !== null;

    const vecCte = buildVectorCte(embedding, constrained);
    const kwCte = buildKeywordCte(tokens, phrases, constrained);

    const query = sql`
      WITH pipeline AS MATERIALIZED (
        ${buildPipelineCte(scope)}
      ),
      coverage AS (
        SELECT count(*)::int AS total_count,
               count(*) FILTER (WHERE embedding IS NOT NULL)::int AS indexed_count,
               ${
                 minYears === null
                   ? sql`0`
                   : sql`count(*) FILTER (WHERE total_years_exp IS NULL)`
               }::int AS unknown_experience_count
        FROM pipeline
      ),
      ${buildConditionCtes(constraints, minYears)}
      ${vecCte}
      ${kwCte}
      fused AS (
        SELECT COALESCE(v.row_id, k.row_id) AS row_id,
               v.rank AS vector_rank,
               k.rank AS keyword_rank
        FROM vec v
        FULL OUTER JOIN kw k ON k.row_id = v.row_id
      ),
      vocab AS (
        SELECT p.row_id,
               p.row_kind,
               COALESCE(
                 jsonb_agg(DISTINCT s.t) FILTER (WHERE btrim(s.t) <> ''),
                 '[]'::jsonb
               ) AS terms
        FROM pipeline p
        LEFT JOIN LATERAL jsonb_array_elements_text(
            (CASE WHEN jsonb_typeof(p.skills) = 'array'
                  THEN p.skills ELSE '[]'::jsonb END)
         || (CASE WHEN jsonb_typeof(p.metadata->'tools') = 'array'
                  THEN p.metadata->'tools' ELSE '[]'::jsonb END)
         || (CASE WHEN jsonb_typeof(p.metadata->'technologies') = 'array'
                  THEN p.metadata->'technologies' ELSE '[]'::jsonb END)
         || (CASE WHEN jsonb_typeof(p.metadata->'domainExpertise') = 'array'
                  THEN p.metadata->'domainExpertise' ELSE '[]'::jsonb END)
        ) AS s(t) ON TRUE
        GROUP BY p.row_id, p.row_kind
      ),
      ${buildResultRowsCte(constrained)}
      SELECT cov.total_count             AS "totalCandidates",
             cov.indexed_count           AS "indexedCandidates",
             cov.unknown_experience_count AS "unknownExperienceCount",
             (SELECT expr FROM selective) AS "usedExpr",
             r.row_id        AS "rowId",
             vb.row_kind     AS "rowKind",
             r.vector_rank   AS "vectorRank",
             r.keyword_rank  AS "keywordRank",
             r.conditions    AS "conditions",
             r.met_count     AS "metCount",
             r.all_met       AS "allConditionsMet",
             vb.terms        AS "vocabulary"
      FROM coverage cov
      LEFT JOIN result_rows r ON TRUE
      LEFT JOIN vocab vb ON vb.row_id = r.row_id
    `;

    try {
      const result = await this.db.execute(query);
      return mapHybridResult(result);
    } catch (error) {
      this.logger.error(
        `RESUME_SEARCH_HYBRID :: search : ERROR : scope=${scope.kind} ${describeScopeTarget(scope)} ${describeDbError(error)}`
      );
      throw error;
    }
  }
}
