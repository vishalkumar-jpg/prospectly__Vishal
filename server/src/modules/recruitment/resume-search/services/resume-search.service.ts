import { Injectable, Logger } from "@nestjs/common";
import type {
  ResumeSearchMatch,
  ResumeSearchResult,
} from "../resume-search.response";
import type { ResumeSearchScope } from "../resume-search.scope";
import { ResumeSearchEmbeddingService } from "./resume-search-embedding.service";
import { ResumeSearchQueryPlannerService } from "./resume-search-query-planner.service";
import { ResumeSearchHybridRepository } from "./resume-search-hybrid.repository";
import { fuseByReciprocalRank } from "./resume-search-fusion";
import { deriveMatchedOn } from "./resume-search-matched-on";
import {
  buildConstraints,
  EMPTY_RESUME_SEARCH_PLAN,
  planHasConstraints,
} from "./resume-search-plan";
import {
  buildKeywordQuery,
  normalizeResumeSearchQuery,
} from "./resume-search-query.normalizer";
import {
  RESUME_SEARCH_MAX_NEAR_MISSES,
  RESUME_SEARCH_MAX_RESULTS,
} from "../resume-search.constants";

@Injectable()
export class ResumeSearchService {
  private readonly logger = new Logger(ResumeSearchService.name);

  constructor(
    private readonly embedding: ResumeSearchEmbeddingService,
    private readonly planner: ResumeSearchQueryPlannerService,
    private readonly repository: ResumeSearchHybridRepository
  ) {}

  /**
   * `scope` is the whole authorization story for row visibility, and it is
   * required for that reason — see ResumeSearchScope. The recruiter route
   * additionally has RequirePermission in front of it, which resolves and
   * validates the job before the handler runs, so there is no job lookup here.
   */
  async search(
    scope: ResumeSearchScope,
    rawQuery: string,
    userId?: string
  ): Promise<ResumeSearchResult> {
    const query = normalizeResumeSearchQuery(rawQuery);
    const keyword = buildKeywordQuery(query);

    const planned = await this.planner.plan(query, userId);
    const plan = planned ?? EMPTY_RESUME_SEARCH_PLAN;
    const constraints = buildConstraints(plan);

    // The intent carries the conceptual half of the query; the named products
    // are already handled as hard requirements, so embedding them again only
    // dilutes the vector.
    const embedded = plan.semanticIntent || query;
    const embedding = await this.embedding.embedQuery(embedded, userId);

    const result = await this.repository.search({
      scope,
      embedding,
      tokens: keyword.tokens,
      phrases: keyword.phrases,
      constraints,
      minYearsExperience: plan.minYearsExperience,
    });

    const constrained = planHasConstraints(plan);

    const fused = fuseByReciprocalRank(
      result.rows.map((row) => ({
        candidateId: row.rowId as string,
        vectorRank: row.vectorRank,
        keywordRank: row.keywordRank,
      })),
      { applyCutoff: !constrained }
    );

    const rowById = new Map(result.rows.map((row) => [row.rowId, row]));
    const vectorHits = new Set(
      result.rows
        .filter((row) => row.vectorRank != null)
        .map((row) => row.rowId)
    );

    /**
     * Fusion produced a relevance order; requirements outrank it. Sorting by
     * met-count second means a near miss that satisfies three of four
     * requirements sits above one that satisfies two, whatever their scores.
     */
    const ordered = fused.rows
      .map((row) => ({ row, source: rowById.get(row.candidateId) }))
      .sort((a, b) => {
        const met =
          Number(b.source?.allConditionsMet ?? false) -
          Number(a.source?.allConditionsMet ?? false);
        if (met !== 0) return met;

        const count = (b.source?.metCount ?? 0) - (a.source?.metCount ?? 0);
        if (count !== 0) return count;

        return a.row.rank - b.row.rank;
      });

    const exact = ordered.filter(
      (entry) => !constrained || entry.source?.allConditionsMet === true
    );
    const nearMisses = constrained
      ? ordered
          .filter((entry) => entry.source?.allConditionsMet !== true)
          .slice(0, RESUME_SEARCH_MAX_NEAR_MISSES)
      : [];

    const matches: ResumeSearchMatch[] = [
      ...exact.slice(0, RESUME_SEARCH_MAX_RESULTS),
      ...nearMisses,
    ].map((entry, index) => ({
      candidateId: entry.row.candidateId,
      // Only meaningful when the board has more than one kind of row, so it is
      // left off entirely for the recruiter scope rather than sent as a constant.
      ...(scope.kind === "connector"
        ? { rowKind: entry.source?.rowKind ?? "candidate" }
        : {}),
      score: entry.row.score,
      rank: index + 1,
      matchedOn: deriveMatchedOn({
        tokens: result.usedTerms,
        vocabulary: entry.source?.vocabulary,
        isVectorHit: vectorHits.has(entry.row.candidateId),
      }),
      allConditionsMet: !constrained || entry.source?.allConditionsMet === true,
      conditions: entry.source?.conditions ?? [],
    }));

    return {
      query,
      matches,
      totalCandidates: result.totalCandidates,
      indexedCandidates: result.indexedCandidates,
      degraded: embedding === null,
      truncated: fused.truncated || exact.length > RESUME_SEARCH_MAX_RESULTS,
      constraints: [
        ...constraints.map((constraint) => constraint.label),
        ...(plan.minYearsExperience === null
          ? []
          : [`${plan.minYearsExperience}+ years experience`]),
      ],
      plannerUnavailable: planned === null,
      unknownExperienceCount: result.unknownExperienceCount,
      // Capped, because `matches` carries only exact.slice(0, MAX_RESULTS) —
      // the field documents a prefix length into `matches`, so the uncapped
      // count would point past the end on a constrained query.
      exactMatchCount: Math.min(exact.length, RESUME_SEARCH_MAX_RESULTS),
    };
  }
}
