import type { SearchQueryParse } from "./candidate-search-query-parse";
import {
  buildSkillRemainder,
  flattenNameAlternatives,
} from "./candidate-search-query-boolean";
import { looksLikeNameToken } from "./candidate-search-name";

const MAX_SKILLS = 8;
const MAX_SKILL_LENGTH = 40;
const MAX_NAME_GROUPS = 4;
const MAX_NAME_TOKENS = 3;
const MAX_TITLE_TOKENS = 4;
const MAX_COMPANY_TOKENS = 4;

const PRODUCT_NAME_DENY = new Set([
  "typescript",
  "javascript",
  "graphql",
  "react",
  "vue",
  "angular",
  "python",
  "java",
  "nodejs",
  "node",
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  "postgres",
  "postgresql",
  "mysql",
  "mongodb",
  "redis",
  "kotlin",
  "swift",
  "rust",
  "golang",
  "dotnet",
  "net",
  "sql",
  "html",
  "css",
]);

export interface CandidateSearchIntentPlan {
  nameAlternatives: string[][];
  requiredSkills: string[];
  skillAlternatives: string[][];
  titleTokens: string[];
  companyTokens: string[];
  semanticIntent: string;
}

export const EMPTY_INTENT_PLAN: CandidateSearchIntentPlan = {
  nameAlternatives: [],
  requiredSkills: [],
  skillAlternatives: [],
  titleTokens: [],
  companyTokens: [],
  semanticIntent: "",
};

function cleanTerm(value: unknown, maxLength = MAX_SKILL_LENGTH): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/["\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^-+|-+$/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanSkill(value: unknown, seen: Set<string>): string | null {
  const term = cleanTerm(value);
  const key = term.toLowerCase();
  if (!term || seen.has(key)) return null;
  seen.add(key);
  return term;
}

function isPlausiblePersonName(token: string, skillKeys: Set<string>): boolean {
  const lower = token.toLowerCase();
  if (!looksLikeNameToken(token)) return false;
  if (skillKeys.has(lower)) return false;
  if (PRODUCT_NAME_DENY.has(lower)) return false;
  return true;
}

function cleanNameGroup(raw: unknown, skillKeys: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => cleanTerm(entry))
    .filter((token) => isPlausiblePersonName(token, skillKeys))
    .slice(0, MAX_NAME_TOKENS);
}

function cleanSkillGroups(raw: unknown, seen: Set<string>): string[][] {
  if (!Array.isArray(raw)) return [];
  const groups: string[][] = [];
  for (const entry of raw) {
    if (Array.isArray(entry)) {
      const tokens = entry
        .map((item) => cleanSkill(item, seen))
        .filter((item): item is string => item !== null);
      if (tokens.length > 0) groups.push(tokens);
    } else {
      const skill = cleanSkill(entry, seen);
      if (skill) groups.push([skill]);
    }
    if (groups.length >= MAX_SKILLS) break;
  }
  return groups;
}

function cleanStructuredTokens(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => cleanTerm(entry))
    .filter(Boolean)
    .slice(0, max);
}

export function sanitizeCandidateSearchIntentPlan(
  raw: unknown
): CandidateSearchIntentPlan | null {
  if (!raw || typeof raw !== "object") return null;

  const input = raw as Record<string, unknown>;
  const skillSeen = new Set<string>();
  const requiredSkills: string[] = [];

  for (const entry of Array.isArray(input.requiredSkills)
    ? input.requiredSkills
    : []) {
    const skill = cleanSkill(entry, skillSeen);
    if (!skill) continue;
    requiredSkills.push(skill);
    if (requiredSkills.length >= MAX_SKILLS) break;
  }

  const skillAlternatives = cleanSkillGroups(
    input.skillAlternatives,
    skillSeen
  );
  const skillKeys = new Set(
    [...requiredSkills, ...skillAlternatives.flat()].map((skill) =>
      skill.toLowerCase()
    )
  );

  const nameAlternatives: string[][] = [];
  for (const entry of Array.isArray(input.nameAlternatives)
    ? input.nameAlternatives
    : []) {
    const group = Array.isArray(entry)
      ? cleanNameGroup(entry, skillKeys)
      : cleanNameGroup(
          String(entry)
            .split(/\s+/)
            .map((token) => cleanTerm(token))
            .filter(Boolean),
          skillKeys
        );
    if (group.length > 0) nameAlternatives.push(group);
    if (nameAlternatives.length >= MAX_NAME_GROUPS) break;
  }

  const titleTokens = cleanStructuredTokens(
    input.titleTokens,
    MAX_TITLE_TOKENS
  );
  const companyTokens = cleanStructuredTokens(
    input.companyTokens,
    MAX_COMPANY_TOKENS
  );

  const hasSkills = requiredSkills.length > 0 || skillAlternatives.length > 0;
  const hasIdentity =
    nameAlternatives.length > 0 ||
    titleTokens.length > 0 ||
    companyTokens.length > 0;

  if (!hasSkills && !hasIdentity) return null;

  return {
    nameAlternatives,
    requiredSkills,
    skillAlternatives,
    titleTokens,
    companyTokens,
    semanticIntent: cleanTerm(input.semanticIntent, 200),
  };
}

function buildRemainder(plan: CandidateSearchIntentPlan): string | null {
  const parts = [
    ...plan.requiredSkills,
    buildSkillRemainder(plan.skillAlternatives),
  ].filter((part): part is string => Boolean(part && part.trim()));

  if (parts.length === 0) return null;
  return parts.join(" ");
}

export function intentPlanToSearchQueryParse(
  plan: CandidateSearchIntentPlan
): SearchQueryParse {
  const hasSkills =
    plan.requiredSkills.length > 0 || plan.skillAlternatives.length > 0;

  return {
    nameTokens: flattenNameAlternatives(plan.nameAlternatives),
    titleTokens: plan.titleTokens,
    companyTokens: plan.companyTokens,
    nameAlternatives: plan.nameAlternatives,
    skillAlternatives: plan.skillAlternatives,
    requiredSkills: plan.requiredSkills,
    semanticIntent: plan.semanticIntent || null,
    remainder: hasSkills ? buildRemainder(plan) : null,
  };
}
