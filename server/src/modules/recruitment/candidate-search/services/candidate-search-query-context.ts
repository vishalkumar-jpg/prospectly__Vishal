import type { NormalisedCriteria } from "../criteria/candidate-search-criteria";
import type { FitResult } from "../candidate-search.response";
import type { QueryFilterContext } from "./candidate-search-filters";
import { nameSignalLabel } from "../criteria/candidate-search-name";
import {
  buildSkillRemainder,
  flattenNameAlternatives,
} from "../criteria/candidate-search-query-boolean";
import {
  companySignalLabel,
  isIdentityOnly,
  titleSignalLabel,
  type SearchQueryParse,
} from "../criteria/candidate-search-query-parse";

export interface ParsedQueryRanking {
  identityOnly: boolean;
  nameTokens: string[];
  titleTokens: string[];
  companyTokens: string[];
  nameAlternatives: string[][];
  skillAlternatives: string[][];
  requiredSkills: string[];
  semanticIntent: string | null;
  remainder: string | null;
}

function resolveRemainderQueryText(
  criteria: NormalisedCriteria,
  parse: SearchQueryParse
): string | null {
  const hasStructured =
    parse.nameAlternatives.length > 0 ||
    parse.nameTokens.length > 0 ||
    parse.titleTokens.length > 0 ||
    parse.companyTokens.length > 0 ||
    parse.requiredSkills.length > 0 ||
    parse.skillAlternatives.length > 0;

  if (hasStructured) {
    return (
      parse.remainder ?? buildSkillRemainder(parse.skillAlternatives) ?? null
    );
  }
  return criteria.query;
}

function rankingToParse(ranking?: ParsedQueryRanking): SearchQueryParse {
  return {
    nameTokens: ranking?.nameTokens ?? [],
    titleTokens: ranking?.titleTokens ?? [],
    companyTokens: ranking?.companyTokens ?? [],
    nameAlternatives: ranking?.nameAlternatives ?? [],
    skillAlternatives: ranking?.skillAlternatives ?? [],
    requiredSkills: ranking?.requiredSkills ?? [],
    semanticIntent: ranking?.semanticIntent ?? null,
    remainder: ranking?.remainder ?? null,
  };
}

/** Structured parse + ranking flags → filter context for fetch/count. */
export function resolveQueryFilterContext(
  criteria: NormalisedCriteria,
  ranking?: ParsedQueryRanking,
  parse?: SearchQueryParse
): QueryFilterContext {
  const resolved = parse ?? rankingToParse(ranking);
  const identityOnly =
    ranking?.identityOnly ?? isIdentityOnly(resolved, criteria.skills.length);

  return {
    nameTokens: ranking?.nameTokens ?? resolved.nameTokens,
    titleTokens: ranking?.titleTokens ?? resolved.titleTokens,
    companyTokens: ranking?.companyTokens ?? resolved.companyTokens,
    nameAlternatives: ranking?.nameAlternatives ?? resolved.nameAlternatives,
    skillAlternatives: ranking?.skillAlternatives ?? resolved.skillAlternatives,
    requiredSkills: ranking?.requiredSkills ?? resolved.requiredSkills,
    semanticIntent: ranking?.semanticIntent ?? resolved.semanticIntent,
    identityOnly,
    queryText: resolveRemainderQueryText(criteria, resolved),
  };
}

function identitySignal(label: string): FitResult["signals"][number] {
  return { label, kind: "facet", weight: 0, state: "met" };
}

/** Prepends weight-0 identity chips for the Why column. */
export function attachIdentitySignals(
  fit: FitResult,
  tokens: {
    nameTokens: readonly string[];
    titleTokens: readonly string[];
    companyTokens: readonly string[];
    nameAlternatives?: readonly (readonly string[])[];
  }
): FitResult {
  const nameLabelTokens =
    tokens.nameAlternatives && tokens.nameAlternatives.length > 1
      ? flattenNameAlternatives([...tokens.nameAlternatives])
      : tokens.nameTokens;

  const chips = [
    nameLabelTokens.length > 0
      ? identitySignal(nameSignalLabel(nameLabelTokens))
      : null,
    tokens.titleTokens.length > 0
      ? identitySignal(titleSignalLabel(tokens.titleTokens))
      : null,
    tokens.companyTokens.length > 0
      ? identitySignal(companySignalLabel(tokens.companyTokens))
      : null,
  ].filter((chip): chip is FitResult["signals"][number] => chip !== null);

  if (chips.length === 0) return fit;
  return { ...fit, signals: [...chips, ...fit.signals] };
}
