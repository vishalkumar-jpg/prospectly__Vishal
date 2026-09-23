import type {
  ResumeSearchCondition,
  ResumeSearchConditionState,
} from "../resume-search.response";
import type { ResumeSearchRowKind } from "../resume-search.scope";

export interface HybridSearchRow {
  /** A candidate id, or a pool-match id when `rowKind` says so. */
  rowId: string | null;
  rowKind: ResumeSearchRowKind;
  vectorRank: number | null;
  keywordRank: number | null;
  vocabulary: unknown;
  /** Null when the query carried no hard requirements. */
  conditions: ResumeSearchCondition[] | null;
  metCount: number;
  allConditionsMet: boolean;
}

export interface HybridSearchResult {
  totalCandidates: number;
  indexedCandidates: number;
  /** Terms that survived the document-frequency filter and were actually searched. */
  usedTerms: string[];
  /** Candidates whose years of experience could not be checked against a stated minimum. */
  unknownExperienceCount: number;
  rows: HybridSearchRow[];
}

function toRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }
  const { rows } = result as { rows?: unknown };
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

/** Unfolds the `a or b or "some phrase"` expression the CTE built. */
function parseUsedTerms(expr: unknown): string[] {
  if (typeof expr !== "string") return [];

  return expr
    .split(" or ")
    .map((term) => term.trim().replace(/^"|"$/g, ""))
    .filter((term) => term.length > 0);
}

function parseConditions(raw: unknown): ResumeSearchCondition[] | null {
  if (!Array.isArray(raw)) return null;

  const states = new Set<ResumeSearchConditionState>([
    "met",
    "missing",
    "unknown",
  ]);

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];

    const { label, state } = entry as Record<string, unknown>;
    if (typeof label !== "string") return [];

    return [
      {
        label,
        state: states.has(state as ResumeSearchConditionState)
          ? (state as ResumeSearchConditionState)
          : "unknown",
      },
    ];
  });
}

/**
 * A left join, never a cross join: with zero matches a cross join yields no
 * rows at all and the coverage counts the banner needs disappear with them.
 */
export function mapHybridResult(result: unknown): HybridSearchResult {
  const rows = toRows(result);

  if (rows.length === 0) {
    return {
      totalCandidates: 0,
      indexedCandidates: 0,
      usedTerms: [],
      unknownExperienceCount: 0,
      rows: [],
    };
  }

  const first = rows[0];

  return {
    totalCandidates: Number(first.totalCandidates ?? 0),
    indexedCandidates: Number(first.indexedCandidates ?? 0),
    usedTerms: parseUsedTerms(first.usedExpr),
    unknownExperienceCount: Number(first.unknownExperienceCount ?? 0),
    rows: rows
      .filter((row) => row.rowId != null)
      .map((row) => ({
        rowId: String(row.rowId),
        rowKind: row.rowKind === "pool_match" ? "pool_match" : "candidate",
        vectorRank: row.vectorRank == null ? null : Number(row.vectorRank),
        keywordRank: row.keywordRank == null ? null : Number(row.keywordRank),
        vocabulary: row.vocabulary,
        conditions: parseConditions(row.conditions),
        metCount: Number(row.metCount ?? 0),
        allConditionsMet: row.allConditionsMet === true,
      })),
  };
}
