import { sql, type SQL } from "drizzle-orm";
import {
  RESUME_SEARCH_BRANCH_LIMIT,
  RESUME_SEARCH_EMBEDDING_DIMENSIONS,
  RESUME_SEARCH_MAX_TOKEN_DOC_FREQUENCY,
  RESUME_SEARCH_MIN_COSINE_SIMILARITY,
  RESUME_SEARCH_VECTOR_DROPOFF,
} from "../resume-search.constants";

/**
 * pgvector rejects a number[] parameter because postgres-js serialises it as
 * an SQL array literal `{0.1,...}`. A string parameter infers as OID 0, so
 * the ::vector cast resolves the type through vector_in and binds safely —
 * no sql.raw needed.
 */
function toVectorLiteral(embedding: number[]): SQL {
  if (embedding.length !== RESUME_SEARCH_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${RESUME_SEARCH_EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`
    );
  }

  const parts = embedding.map((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new Error("Non-finite value in query embedding");
    }
    return numeric.toString();
  });

  return sql`${`[${parts.join(",")}]`}`;
}

/**
 * Raw `sql` templates carry no column metadata, so drizzle hands a JS array
 * straight through and Postgres reports `malformed array literal`. Bind the
 * array literal as a string and let the ::text[] cast parse it — the same
 * mechanism toVectorLiteral relies on, and still a bound parameter.
 */
function toTextArrayLiteral(values: string[]): string {
  const escaped = values.map(
    (value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  );

  return `{${escaped.join(",")}}`;
}

/**
 * Folds the query terms down to those that can actually discriminate within
 * this job's pipeline. A quoted phrase bypasses the filter — it is explicitly
 * specific — and the COALESCE fallback keeps the whole token set when every
 * term is generic, so searching one common word shows everyone rather than
 * nobody.
 *
 * The `numnode` guard drops grammatical stopwords up front. Left in, they
 * reach the filter with df 0 (they match no document), read as maximally
 * selective, and survive into a tsquery that Postgres then discards with a
 * NOTICE — polluting the matched-on terms with words like "with".
 */
function selectiveTermsCte(
  tokens: string[],
  phrases: string[],
  constrained: boolean
): SQL {
  const quoted = phrases.map((phrase) => `"${phrase.replace(/"/g, "")}"`);
  const phraseExpr = quoted.join(" or ");

  if (tokens.length === 0) {
    return sql`selective AS (SELECT NULLIF(${phraseExpr}::text, '') AS expr),`;
  }

  // Hard requirements already decide who is returned, so the frequency filter
  // would only narrow the ranking signal for no gain.
  const dfLimit = constrained
    ? sql`1.1`
    : sql`${RESUME_SEARCH_MAX_TOKEN_DOC_FREQUENCY}`;

  return sql`
    q_tokens AS (
      SELECT tok
      FROM unnest(${toTextArrayLiteral(tokens)}::text[]) AS tok
      WHERE numnode(plainto_tsquery('english', tok)) > 0
    ),
    token_df AS (
      SELECT t.tok,
             count(*) FILTER (
               WHERE p.search_vector @@ plainto_tsquery('english', t.tok)
             )::float
             / NULLIF(count(*) FILTER (WHERE p.search_vector IS NOT NULL), 0) AS df
      FROM q_tokens t
      CROSS JOIN pipeline p
      GROUP BY t.tok
    ),
    selective AS (
      SELECT NULLIF(
               concat_ws(' or ',
                 NULLIF(${phraseExpr}::text, ''),
                 COALESCE(
                   NULLIF(
                     string_agg(tok, ' or ')
                       FILTER (WHERE df IS NULL OR df <= ${dfLimit}),
                     ''
                   ),
                   (SELECT string_agg(tok, ' or ') FROM q_tokens)
                 )
               ), ''
             ) AS expr
      FROM token_df
    ),`;
}

/**
 * The relevance gates supply precision only when nothing else does. Once hard
 * requirements are filtering, they are the precision mechanism, and leaving the
 * dropoff active could discard a candidate who meets every stated requirement
 * merely for scoring below the top hit. So when the query is constrained,
 * vector and keyword degrade to ordering signals.
 *
 * Emits `vec_scored` + `vec`, or a single empty `vec` when there is no
 * embedding. Both forms end in a comma: the caller concatenates them into a
 * WITH chain.
 */
export function buildVectorCte(
  embedding: number[] | null,
  constrained: boolean
): SQL {
  const vecGate = constrained
    ? sql``
    : sql`WHERE sim >= ${RESUME_SEARCH_MIN_COSINE_SIMILARITY}
            AND sim >= (SELECT max(sim) FROM vec_scored) - ${RESUME_SEARCH_VECTOR_DROPOFF}`;

  return embedding
    ? sql`
        vec_scored AS (
          SELECT row_id,
                 (1 - (embedding <=> ${toVectorLiteral(embedding)}::vector)) AS sim
          FROM pipeline
          WHERE embedding IS NOT NULL
        ),
        vec AS (
          SELECT row_id,
                 (row_number() OVER (ORDER BY sim DESC))::int AS rank
          FROM vec_scored
          ${vecGate}
          ORDER BY sim DESC
          LIMIT ${RESUME_SEARCH_BRANCH_LIMIT}
        ),`
    : sql`vec AS (SELECT NULL::uuid AS row_id, NULL::int AS rank WHERE false),`;
}

/**
 * Emits the selective-terms CTEs followed by `kw`, or empty `selective` + `kw`
 * when the query carried neither tokens nor phrases. Comma-terminated, as above.
 */
export function buildKeywordCte(
  tokens: string[],
  phrases: string[],
  constrained: boolean
): SQL {
  return tokens.length > 0 || phrases.length > 0
    ? sql`
        ${selectiveTermsCte(tokens, phrases, constrained)}
        kw AS (
          SELECT p.row_id,
                 (row_number() OVER (ORDER BY ts_rank_cd(p.search_vector, q.tsq, 32) DESC))::int AS rank
          FROM pipeline p
          CROSS JOIN (
            SELECT websearch_to_tsquery('english', (SELECT expr FROM selective)) AS tsq
          ) q
          WHERE p.search_vector IS NOT NULL
            AND numnode(q.tsq) > 0
            AND p.search_vector @@ q.tsq
          ORDER BY ts_rank_cd(p.search_vector, q.tsq, 32) DESC
          LIMIT ${RESUME_SEARCH_BRANCH_LIMIT}
        ),`
    : sql`
        selective AS (SELECT NULL::text AS expr),
        kw AS (SELECT NULL::uuid AS row_id, NULL::int AS rank WHERE false),`;
}
