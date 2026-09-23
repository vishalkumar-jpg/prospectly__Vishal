import { Injectable, Logger } from "@nestjs/common";
import type { ResumeSearchScope } from "modules/recruitment/resume-search/resume-search.scope";
import type { NormalisedCriteria } from "../criteria/candidate-search-criteria";
import type {
  CandidateSearchCountResponse,
  CandidateSearchFacets,
  CandidateSearchResponse,
} from "../candidate-search.response";
import { CandidateSearchFacetsService } from "./candidate-search-facets.service";
import {
  attachIdentitySignals,
  resolveQueryFilterContext,
} from "./candidate-search-query-context";
import {
  toCandidateSearchRow,
  toFitProfile,
} from "./candidate-search-response.mapper";
import { CandidateSearchRankingService } from "./candidate-search-ranking.service";
import { CandidateSearchQueryIntentService } from "./candidate-search-query-intent.service";
import { CandidateSearchRepository } from "./candidate-search.repository";
import { CandidateSearchScopeService } from "./candidate-search-scope.service";
import {
  applyRelevancePercent,
  sortScoredRows,
} from "./candidate-search-scoring";
import {
  normalizeCriteria,
  summarizeCriteria,
} from "../criteria/candidate-search-criteria.normalizer";
import { scoreFit } from "../criteria/candidate-search-fit";

@Injectable()
export class CandidateSearchService {
  private readonly logger = new Logger(CandidateSearchService.name);

  constructor(
    private readonly scopeService: CandidateSearchScopeService,
    private readonly repository: CandidateSearchRepository,
    private readonly facetsService: CandidateSearchFacetsService,
    private readonly rankingService: CandidateSearchRankingService,
    private readonly intentService: CandidateSearchQueryIntentService
  ) {}

  async search(
    userId: string,
    input: unknown
  ): Promise<CandidateSearchResponse> {
    const criteria = normalizeCriteria(input);
    const started = Date.now();

    const jobIds = await this.scopeService.resolveAccessibleJobIds(userId);
    if (this.scopeService.hasNoScope(jobIds))
      return this.emptyResponse(criteria);

    const scope: ResumeSearchScope = { kind: "workspace", userId, jobIds };
    const ranking = await this.rankingService.rank(scope, criteria, userId);
    const queryContext = resolveQueryFilterContext(criteria, ranking);

    const { rows, coverage, truncated } = await this.repository.fetchFiltered(
      scope,
      criteria,
      [...ranking.relevance.keys()],
      queryContext
    );

    const summary = summarizeCriteria(criteria, ranking.queryTerms);
    const scored = rows.map((row) => ({
      row,
      relevance: ranking.relevance.get(row.rowId) ?? null,
      fit:
        summary.total > 0
          ? attachIdentitySignals(
              scoreFit(
                {
                  ...toFitProfile(row),
                  termStates: ranking.termStates.get(row.rowId),
                },
                criteria,
                ranking.queryTerms,
                { skipWhySkillSignals: ranking.identityOnly }
              ),
              {
                nameTokens: ranking.nameTokens,
                titleTokens: ranking.titleTokens,
                companyTokens: ranking.companyTokens,
                nameAlternatives: ranking.nameAlternatives,
              }
            )
          : null,
    }));

    applyRelevancePercent(scored, criteria, summary, ranking.identityOnly);

    const matching = scored.filter(({ fit }) => {
      if (!fit) return true;
      if (criteria.scoreMin !== null && fit.percent < criteria.scoreMin)
        return false;
      if (criteria.scoreMax !== null && fit.percent > criteria.scoreMax)
        return false;
      return true;
    });

    sortScoredRows(matching, criteria);

    const total = matching.length;
    const start = (criteria.page - 1) * criteria.pageSize;
    const page = matching.slice(start, start + criteria.pageSize);

    this.logger.log(
      `CANDIDATE_SEARCH_SERVICE :: search : scope=${jobIds.length} filtered=${total} ` +
        `criteria=${summary.total} truncated=${truncated} ms=${Date.now() - started}`
    );

    return {
      rows: page.map((entry) =>
        toCandidateSearchRow(entry.row, entry.fit, entry.relevance)
      ),
      meta: {
        page: criteria.page,
        limit: criteria.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / criteria.pageSize)),
      },
      coverage,
      degraded: ranking.degraded,
      truncated,
      hasCriteria: summary.total > 0,
    };
  }

  async count(
    userId: string,
    input: unknown
  ): Promise<CandidateSearchCountResponse> {
    const criteria = normalizeCriteria(input);
    const jobIds = await this.scopeService.resolveAccessibleJobIds(userId);
    if (this.scopeService.hasNoScope(jobIds)) {
      return { count: 0, textCounted: true };
    }

    const scope: ResumeSearchScope = { kind: "workspace", userId, jobIds };
    const ranking = await this.rankingService.rank(scope, criteria, userId);
    const queryContext = resolveQueryFilterContext(criteria, ranking);
    const count = await this.repository.countFiltered(
      scope,
      criteria,
      queryContext,
      [...ranking.relevance.keys()]
    );

    return {
      count,
      textCounted:
        criteria.scoreMin === null &&
        criteria.scoreMax === null &&
        (queryContext.identityOnly || criteria.query === null),
    };
  }

  async facets(userId: string): Promise<CandidateSearchFacets> {
    const jobIds = await this.scopeService.resolveAccessibleJobIds(userId);
    return this.facetsService.getFacets(jobIds);
  }

  private emptyResponse(criteria: NormalisedCriteria): CandidateSearchResponse {
    return {
      rows: [],
      meta: { page: 1, limit: criteria.pageSize, total: 0, totalPages: 1 },
      coverage: {
        totalCandidates: 0,
        withIndexedResume: 0,
        withExperienceYears: 0,
        withEducationLevel: 0,
      },
      degraded: false,
      truncated: false,
      hasCriteria: summarizeCriteria(criteria).total > 0,
    };
  }
}
