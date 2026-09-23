import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { describeDbError } from "utils/db-error.utils";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ResumeSearchScope } from "modules/recruitment/resume-search/resume-search.scope";
import type { NormalisedCriteria } from "../criteria/candidate-search-criteria";
import type { CandidateSearchCoverage } from "../candidate-search.response";
import {
  buildCountFilteredQuery,
  buildFetchFilteredQuery,
} from "./candidate-search-fetch.query";
import {
  buildStructuredFilters,
  combineFilters,
  type QueryFilterContext,
} from "./candidate-search-filters";
import {
  mapCandidateSearchDbRow,
  mapCoverageFromRow,
  toInt,
  type CandidateSearchDbRow,
} from "./candidate-search-row.mapper";
import { CANDIDATE_SEARCH_MAX_SCORED_ROWS } from "../candidate-search.constants";

export interface CandidateSearchFetch {
  rows: CandidateSearchDbRow[];
  coverage: CandidateSearchCoverage;
  truncated: boolean;
}

@Injectable()
export class CandidateSearchRepository {
  private readonly logger = new Logger(CandidateSearchRepository.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async fetchFiltered(
    scope: ResumeSearchScope,
    criteria: NormalisedCriteria,
    retrievedRowIds: readonly string[] = [],
    queryContext?: QueryFilterContext
  ): Promise<CandidateSearchFetch> {
    const where = combineFilters(
      buildStructuredFilters(criteria, retrievedRowIds, queryContext)
    );
    const query = buildFetchFilteredQuery(scope, where);

    try {
      const result = await this.db.execute(query);
      const raw = Array.isArray(result)
        ? (result as Array<Record<string, unknown>>)
        : ((result as { rows?: Array<Record<string, unknown>> }).rows ?? []);

      const truncated = raw.length > CANDIDATE_SEARCH_MAX_SCORED_ROWS;
      const kept = truncated
        ? raw.slice(0, CANDIDATE_SEARCH_MAX_SCORED_ROWS)
        : raw;

      return {
        rows: kept
          .filter((row) => row.row_id != null)
          .map((row) => mapCandidateSearchDbRow(row)),
        coverage: mapCoverageFromRow(raw[0]),
        truncated,
      };
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_REPOSITORY :: fetchFiltered : ERROR : ${describeDbError(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  async countFiltered(
    scope: ResumeSearchScope,
    criteria: NormalisedCriteria,
    queryContext?: QueryFilterContext,
    retrievedRowIds: readonly string[] = []
  ): Promise<number> {
    const where = combineFilters(
      buildStructuredFilters(criteria, retrievedRowIds, queryContext)
    );
    const query = buildCountFilteredQuery(scope, where);

    try {
      const result = await this.db.execute(query);
      const raw = Array.isArray(result)
        ? (result as Array<Record<string, unknown>>)
        : ((result as { rows?: Array<Record<string, unknown>> }).rows ?? []);
      return toInt(raw[0]?.total) ?? 0;
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_REPOSITORY :: countFiltered : ERROR : ${describeDbError(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
