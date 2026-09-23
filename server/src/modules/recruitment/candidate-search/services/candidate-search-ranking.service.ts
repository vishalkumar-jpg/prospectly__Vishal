import { Injectable, Logger } from "@nestjs/common";
import {
  buildKeywordQuery,
  fuseByReciprocalRank,
  normalizeResumeSearchQuery,
  ResumeSearchEmbeddingService,
  ResumeSearchHybridRepository,
  ResumeSearchQueryPlannerService,
} from "modules/recruitment/resume-search/services";
import type { ResumeSearchScope } from "modules/recruitment/resume-search/resume-search.scope";
import type { FitSignalState } from "../candidate-search.response";
import type { NormalisedCriteria } from "../criteria/candidate-search-criteria";
import { CandidateSearchQueryIntentService } from "./candidate-search-query-intent.service";
import { buildSkillRemainder } from "../criteria/candidate-search-query-boolean";
import {
  isIdentityOnly,
  type SearchQueryParse,
} from "../criteria/candidate-search-query-parse";

export interface CandidateSearchRanking {
  relevance: Map<string, number>;
  termStates: Map<string, Record<string, FitSignalState>>;
  degraded: boolean;
  queryTerms?: string[];
  nameTokens: string[];
  titleTokens: string[];
  companyTokens: string[];
  nameAlternatives: string[][];
  skillAlternatives: string[][];
  requiredSkills: string[];
  semanticIntent: string | null;
  remainder: string | null;
  /** Bare name/title/company with no drawer skills — no embed/FTS. */
  identityOnly: boolean;
}

const EMPTY: CandidateSearchRanking = {
  relevance: new Map(),
  termStates: new Map(),
  degraded: false,
  nameTokens: [],
  titleTokens: [],
  companyTokens: [],
  nameAlternatives: [],
  skillAlternatives: [],
  requiredSkills: [],
  semanticIntent: null,
  remainder: null,
  identityOnly: false,
};

function toExpr(term: string): string {
  const clean = term.replace(/"/g, "").trim();
  return clean.includes(" ") ? `"${clean}"` : clean;
}

function hasStructuredTokens(parse: SearchQueryParse): boolean {
  return (
    parse.nameAlternatives.length > 0 ||
    parse.nameTokens.length > 0 ||
    parse.titleTokens.length > 0 ||
    parse.companyTokens.length > 0 ||
    parse.requiredSkills.length > 0 ||
    parse.skillAlternatives.length > 0
  );
}

function rankingQuery(parse: SearchQueryParse): string {
  if (!hasStructuredTokens(parse)) return "";
  return parse.remainder ?? buildSkillRemainder(parse.skillAlternatives) ?? "";
}

function parseFields(parse: SearchQueryParse) {
  return {
    nameTokens: parse.nameTokens,
    titleTokens: parse.titleTokens,
    companyTokens: parse.companyTokens,
    nameAlternatives: parse.nameAlternatives,
    skillAlternatives: parse.skillAlternatives,
    requiredSkills: parse.requiredSkills,
    semanticIntent: parse.semanticIntent,
    remainder: parse.remainder,
  };
}

@Injectable()
export class CandidateSearchRankingService {
  private readonly logger = new Logger(CandidateSearchRankingService.name);

  constructor(
    private readonly hybrid: ResumeSearchHybridRepository,
    private readonly embedding: ResumeSearchEmbeddingService,
    private readonly planner: ResumeSearchQueryPlannerService,
    private readonly intentService: CandidateSearchQueryIntentService
  ) {}

  async rank(
    scope: ResumeSearchScope,
    criteria: NormalisedCriteria,
    userId: string
  ): Promise<CandidateSearchRanking> {
    const rawQuery = criteria.query
      ? normalizeResumeSearchQuery(criteria.query)
      : "";
    const parse = await this.intentService.resolve(criteria.query, userId);
    const identityOnly = isIdentityOnly(parse, criteria.skills.length);
    const sharedParse = parseFields(parse);

    if (identityOnly) {
      return {
        ...EMPTY,
        queryTerms: [],
        ...sharedParse,
        identityOnly: true,
      };
    }

    const query = hasStructuredTokens(parse) ? rankingQuery(parse) : rawQuery;
    const skipResumePlanner =
      parse.requiredSkills.length > 0 || parse.skillAlternatives.length > 1;

    if (
      !query &&
      criteria.skills.length === 0 &&
      !parse.semanticIntent?.trim()
    ) {
      return { ...EMPTY, ...sharedParse };
    }

    const keyword = buildKeywordQuery(query);
    const plan =
      query && !skipResumePlanner
        ? await this.planner.plan(query, userId)
        : null;

    const constraints = [
      ...criteria.skills.map((skill) => ({
        label: skill,
        expr: toExpr(skill),
      })),
      ...parse.requiredSkills.map((skill) => ({
        label: skill,
        expr: toExpr(skill),
      })),
      ...(skipResumePlanner
        ? []
        : (plan?.requiredSkills ?? [])
            .filter(
              (skill) =>
                !criteria.skills.some(
                  (chosen) => chosen.toLowerCase() === skill.label.toLowerCase()
                ) &&
                !parse.requiredSkills.some(
                  (chosen) => chosen.toLowerCase() === skill.label.toLowerCase()
                )
            )
            .map((skill) => ({
              label: skill.label,
              expr: [skill.label, ...skill.variants].map(toExpr).join(" or "),
            }))),
    ];

    const intent =
      parse.semanticIntent?.trim() || plan?.semanticIntent?.trim() || query;
    const embedding = intent
      ? await this.embedding.embedQuery(intent, userId)
      : null;
    const degraded = Boolean(intent) && embedding === null;

    if (degraded) {
      this.logger.warn(
        "CANDIDATE_SEARCH_RANKING_SERVICE :: rank : EMBEDDING_UNAVAILABLE : falling back to keyword"
      );
    }

    const result = await this.hybrid.search({
      scope,
      embedding,
      tokens: keyword.tokens,
      phrases: keyword.phrases,
      constraints,
      minYearsExperience:
        criteria.experienceMin === null
          ? (plan?.minYearsExperience ?? null)
          : null,
    });

    const fused = fuseByReciprocalRank(
      result.rows.map((row) => ({
        candidateId: row.rowId as string,
        vectorRank: row.vectorRank,
        keywordRank: row.keywordRank,
      })),
      { applyCutoff: false }
    );

    const relevance = new Map<string, number>();
    for (const row of fused.rows) relevance.set(row.candidateId, row.score);

    const termStates = new Map<string, Record<string, FitSignalState>>();
    for (const row of result.rows) {
      if (!row.rowId || !row.conditions) continue;
      const states: Record<string, FitSignalState> = {};
      for (const condition of row.conditions) {
        states[condition.label.toLowerCase()] = condition.state;
      }
      termStates.set(row.rowId, states);
    }

    const queryTerms =
      parse.requiredSkills.length > 0
        ? parse.requiredSkills
        : plan?.requiredSkills.map((skill) => skill.label);

    return {
      relevance,
      termStates,
      degraded,
      queryTerms,
      ...sharedParse,
      identityOnly: false,
    };
  }
}
