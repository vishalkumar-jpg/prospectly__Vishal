import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { describeDbError } from "utils/db-error.utils";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  CandidateSearchFacets,
  FacetValue,
} from "../candidate-search.response";
import { loadCandidateCountryFacets } from "./candidate-search-country-facets";
import {
  CANDIDATE_SEARCH_EDUCATION_LEVELS,
  CANDIDATE_SEARCH_EMPLOYMENT_TYPES,
  CANDIDATE_SEARCH_EMPLOYMENT_TYPE_LABELS,
  CANDIDATE_SEARCH_WORK_MODES,
} from "../candidate-search.constants";

/** Sentence-case a snake_case or lower-case token for display. */
function titleCase(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * The facet lists behind the quick-filter row and the drawer.
 *
 * Scoped identically to `/search` — a facet list leaking a skill or company
 * name from outside the recruiter's scope is the same breach in a smaller
 * package, and this page exposes facets on first paint, before any search.
 *
 * Candidate-side values come from `recruitment_job_facet_counts`, summed over
 * the accessible postings. Job-side values are one row per job and cheap enough
 * to read directly.
 */
@Injectable()
export class CandidateSearchFacetsService {
  private readonly logger = new Logger(CandidateSearchFacetsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async getFacets(jobIds: string[]): Promise<CandidateSearchFacets> {
    if (jobIds.length === 0) return this.emptyFacets();

    try {
      const [rollup, postings, stages, jobSide, countries] = await Promise.all([
        this.loadRollup(jobIds),
        this.loadPostings(jobIds),
        this.loadStages(jobIds),
        this.loadJobSide(jobIds),
        loadCandidateCountryFacets(this.db, jobIds),
      ]);

      return {
        postings,
        stages,
        skills: rollup.skill ?? [],
        titles: rollup.title ?? [],
        companies: rollup.company ?? [],
        educationLevels: this.orderEducation(rollup.education ?? []),
        sources: rollup.source ?? [],
        industries: jobSide.industries,
        countries,
        workModes: jobSide.workModes,
        employmentTypes: jobSide.employmentTypes,
      };
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_FACETS_SERVICE :: getFacets : ERROR : ${describeDbError(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Summed across the accessible postings, ordered by frequency.
   *
   * Frequency order is what makes the quick-filter row read as *this
   * recruiter's* database rather than a generic menu, so it is not incidental.
   */
  private async loadRollup(
    jobIds: string[]
  ): Promise<Record<string, FacetValue[]>> {
    const table = schema.recruitmentJobFacetCounts;
    const rows = await this.db
      .select({
        facetKind: table.facetKind,
        value: table.value,
        label: sql<string>`min(${table.displayValue})`,
        count: sql<number>`sum(${table.count})::int`,
      })
      .from(table)
      .where(and(inArray(table.jobId, jobIds), isNull(table.deletedAt)))
      .groupBy(table.facetKind, table.value)
      .orderBy(desc(sql`sum(${table.count})`));

    const grouped: Record<string, FacetValue[]> = {};
    for (const row of rows) {
      const bucket = (grouped[row.facetKind] ??= []);
      bucket.push({ value: row.value, label: row.label, count: row.count });
    }
    return grouped;
  }

  private async loadPostings(jobIds: string[]): Promise<FacetValue[]> {
    const jobs = schema.recruitmentJobsSchema;
    const rows = await this.db
      .select({ id: jobs.id, title: jobs.title })
      .from(jobs)
      .where(and(inArray(jobs.id, jobIds), isNull(jobs.deletedAt)));

    return rows.map((row) => ({
      value: row.id,
      label: row.title,
      // Per-posting candidate counts would need a second aggregate over the
      // pipeline; the Scope control does not display counts, so it is not paid for.
      count: 0,
    }));
  }

  /** Only stages that actually occur in scope — an empty stage is noise. */
  private async loadStages(jobIds: string[]): Promise<FacetValue[]> {
    const candidates = schema.recruitmentJobCandidates;
    const stages = schema.recruitmentStagesSchema;

    const rows = await this.db
      .select({
        id: stages.id,
        label: stages.label,
        order: stages.stageOrder,
        count: sql<number>`count(DISTINCT coalesce(${candidates.contactId}::text, ${candidates.candidateUserId}::text))::int`,
      })
      .from(candidates)
      .innerJoin(stages, eq(stages.id, candidates.stageId))
      .where(
        and(inArray(candidates.jobId, jobIds), isNull(candidates.deletedAt))
      )
      .groupBy(stages.id, stages.label, stages.stageOrder)
      .orderBy(stages.stageOrder);

    // Value is the id because that is what the DTO filters on. No stage_key
    // here: the page resolves colour from `useRecruitmentStages()` master data,
    // and a second copy of that mapping is a second thing that can drift.
    return rows.map((row) => ({
      value: String(row.id),
      label: row.label,
      count: row.count,
    }));
  }

  /**
   * Work mode, employment type and industry describe the posting (D6).
   * Country counts come from candidate location — see loadCandidateCountryFacets.
   */
  private async loadJobSide(jobIds: string[]): Promise<{
    workModes: FacetValue[];
    employmentTypes: FacetValue[];
    industries: FacetValue[];
  }> {
    const jobs = schema.recruitmentJobsSchema;
    const industries = schema.industriesSchema;

    const rows = await this.db
      .select({
        workType: jobs.workType,
        employmentType: jobs.employmentType,
        industryId: jobs.industryId,
        industryName: industries.name,
      })
      .from(jobs)
      .leftJoin(industries, eq(industries.id, jobs.industryId))
      .where(and(inArray(jobs.id, jobIds), isNull(jobs.deletedAt)));

    const workModes = new Map<string, number>();
    const employmentTypes = new Map<string, number>();
    const industryCounts = new Map<string, { label: string; count: number }>();

    for (const row of rows) {
      if (row.workType) {
        workModes.set(row.workType, (workModes.get(row.workType) ?? 0) + 1);
      }
      if (row.employmentType) {
        employmentTypes.set(
          row.employmentType,
          (employmentTypes.get(row.employmentType) ?? 0) + 1
        );
      }
      if (row.industryId !== null && row.industryName) {
        const key = String(row.industryId);
        const existing = industryCounts.get(key);
        industryCounts.set(key, {
          label: row.industryName,
          count: (existing?.count ?? 0) + 1,
        });
      }
    }

    return {
      // Vocabulary order, not frequency: these are short fixed lists, and a row
      // of chips that reorders itself as postings change is disorienting.
      workModes: CANDIDATE_SEARCH_WORK_MODES.filter((mode) =>
        workModes.has(mode)
      ).map((mode) => ({
        value: mode,
        label: titleCase(mode),
        count: workModes.get(mode) ?? 0,
      })),
      employmentTypes: CANDIDATE_SEARCH_EMPLOYMENT_TYPES.filter((type) =>
        employmentTypes.has(type)
      ).map((type) => ({
        value: type,
        label: CANDIDATE_SEARCH_EMPLOYMENT_TYPE_LABELS[type],
        count: employmentTypes.get(type) ?? 0,
      })),
      industries: [...industryCounts.entries()]
        .map(([value, entry]) => ({
          value,
          label: entry.label,
          count: entry.count,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /** Ladder order, so the control reads high-school → doctorate, not by count. */
  private orderEducation(values: FacetValue[]): FacetValue[] {
    const byValue = new Map(values.map((entry) => [entry.value, entry]));
    return CANDIDATE_SEARCH_EDUCATION_LEVELS.map((level) =>
      byValue.get(level)
    ).filter((entry): entry is FacetValue => entry !== undefined);
  }

  private emptyFacets(): CandidateSearchFacets {
    return {
      postings: [],
      stages: [],
      skills: [],
      titles: [],
      companies: [],
      industries: [],
      countries: [],
      workModes: [],
      employmentTypes: [],
      educationLevels: [],
      sources: [],
    };
  }
}
