import { looksLikeNameToken } from "./candidate-search-name";

export interface BooleanQueryParse {
  nameAlternatives: string[][];
  skillAlternatives: string[][];
  /** Single-skill AND slots (no OR within the group). */
  requiredSkills: string[];
}

type QueryToken =
  | { kind: "word"; value: string }
  | { kind: "and" }
  | { kind: "or" };

const WRAPPER_WORDS = new Set([
  "candidate",
  "candidates",
  "person",
  "people",
  "find",
  "show",
  "search",
  "searching",
  "look",
  "me",
  "my",
  "our",
  "the",
  "a",
  "an",
  "with",
  "who",
  "whose",
  "has",
  "have",
  "is",
  "are",
  "his",
  "her",
  "their",
  "for",
  "in",
  "to",
  "of",
  "please",
]);

const SKILL_LEXICON = new Set([
  "software",
  "web",
  "fullstack",
  "full-stack",
  "intern",
  "internship",
  "qa",
  "qc",
  "ui",
  "ux",
  "mobile",
  "ios",
  "android",
  "data",
  "science",
  "scientist",
  "stack",
  "platform",
  "infra",
  "infrastructure",
  "security",
  "support",
  "admin",
  "administrator",
  "hr",
  "finance",
  "marketing",
  "sales",
  "designer",
  "design",
  "tester",
  "testing",
]);

const NAME_INTRODUCERS = new Set(["named", "called", "name"]);

function tokenizeWithOperators(text: string): QueryToken[] {
  const out: QueryToken[] = [];
  for (const raw of text.split(/\s+/)) {
    if (!raw) continue;
    if (raw === "and") {
      out.push({ kind: "and" });
      continue;
    }
    if (raw === "or") {
      out.push({ kind: "or" });
      continue;
    }
    out.push({ kind: "word", value: raw });
  }
  return out;
}

export function isKnownSkillOrRoleToken(token: string): boolean {
  const lower = token.toLowerCase();
  if (SKILL_LEXICON.has(lower)) return true;
  return !looksLikeNameToken(token);
}

function isSkillToken(token: string): boolean {
  return isKnownSkillOrRoleToken(token);
}

function classifyPhrase(
  tokens: string[],
  forceName: boolean
): "name" | "skill" {
  if (tokens.length === 0) return "skill";
  if (tokens.every((token) => looksLikeNameToken(token))) return "name";
  if (tokens.some((token) => isSkillToken(token))) return "skill";
  if (forceName && tokens.every((token) => looksLikeNameToken(token)))
    return "name";
  return "skill";
}

function stripWrappersAndIntroducers(tokens: QueryToken[]): {
  tokens: QueryToken[];
  forceName: boolean;
} {
  const out: QueryToken[] = [];
  let forceName = false;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (token.kind !== "word") {
      out.push(token);
      i += 1;
      continue;
    }

    const lower = token.value.toLowerCase();
    if (WRAPPER_WORDS.has(lower)) {
      i += 1;
      continue;
    }

    if (lower === "and") {
      const next = tokens[i + 1];
      if (next?.kind === "word" && next.value.toLowerCase() === "is") {
        i += 2;
        continue;
      }
    }

    if (NAME_INTRODUCERS.has(lower)) {
      forceName = true;
      i += 1;
      const next = tokens[i];
      if (next?.kind === "word" && next.value.toLowerCase() === "is") {
        i += 1;
      }
      continue;
    }

    out.push(token);
    i += 1;
  }

  return { tokens: out, forceName };
}

function hasBooleanOperators(tokens: QueryToken[]): boolean {
  return tokens.some((token) => token.kind === "and" || token.kind === "or");
}

function splitOrAlternatives(group: string[]): string[][] {
  const alts: string[][] = [];
  let current: string[] = [];

  for (const token of group) {
    if (token === "__or__") {
      if (current.length > 0) alts.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }

  if (current.length > 0) alts.push(current);
  return alts.length > 0 ? alts : [group];
}

function parseExplicitBoolean(
  tokens: QueryToken[],
  forceName: boolean
): BooleanQueryParse {
  const flat: string[] = [];
  for (const token of tokens) {
    if (token.kind === "and") flat.push("__and__");
    else if (token.kind === "or") flat.push("__or__");
    else flat.push(token.value);
  }

  const andGroups: string[][] = [];
  let current: string[] = [];
  for (const token of flat) {
    if (token === "__and__") {
      if (current.length > 0) andGroups.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  if (current.length > 0) andGroups.push(current);

  const nameAlternatives: string[][] = [];
  const skillAlternatives: string[][] = [];
  const requiredSkills: string[] = [];

  for (const group of andGroups) {
    const phrases = splitOrAlternatives(group);
    const classified = phrases.map((phrase) => ({
      phrase,
      kind: classifyPhrase(phrase, forceName),
    }));

    for (const { phrase, kind } of classified) {
      if (kind === "name") nameAlternatives.push(phrase);
    }

    const skillPhrases = classified.filter(({ kind }) => kind === "skill");
    if (skillPhrases.length === 1 && phrases.length === 1) {
      requiredSkills.push(skillPhrases[0].phrase.join(" "));
      continue;
    }

    for (const { phrase } of skillPhrases) {
      skillAlternatives.push(phrase);
    }
  }

  return { nameAlternatives, skillAlternatives, requiredSkills };
}

function classifyWord(word: string): "name" | "skill" {
  if (isSkillToken(word)) return "skill";
  if (looksLikeNameToken(word)) return "name";
  return "skill";
}

function parseJuxtaposed(text: string): BooleanQueryParse {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { nameAlternatives: [], skillAlternatives: [], requiredSkills: [] };
  }

  const segments: { kind: "name" | "skill"; tokens: string[] }[] = [];
  for (const word of words) {
    const kind = classifyWord(word);
    const last = segments[segments.length - 1];
    if (last && last.kind === kind) {
      last.tokens.push(word);
    } else {
      segments.push({ kind, tokens: [word] });
    }
  }

  return {
    nameAlternatives: segments
      .filter((segment) => segment.kind === "name")
      .map((segment) => segment.tokens),
    skillAlternatives: [],
    requiredSkills: segments
      .filter((segment) => segment.kind === "skill")
      .map((segment) => segment.tokens.join(" ")),
  };
}

export function buildSkillRemainder(
  skillAlternatives: readonly (readonly string[])[]
): string | null {
  if (skillAlternatives.length === 0) return null;
  return skillAlternatives.map((alt) => alt.join(" ")).join(" or ");
}

export function buildStructuredRemainder(
  requiredSkills: readonly string[],
  skillAlternatives: readonly (readonly string[])[]
): string | null {
  const parts = [
    ...requiredSkills,
    buildSkillRemainder(skillAlternatives) ?? "",
  ].filter((part) => part.trim());
  if (parts.length === 0) return null;
  return parts.join(" ");
}

export function flattenNameAlternatives(
  alternatives: readonly (readonly string[])[]
): string[] {
  if (alternatives.length === 1) return [...alternatives[0]];
  return [...new Set(alternatives.flat())];
}

/** Parses typed AND/OR and juxtaposed name+skill queries. Pure, no I/O. */
export function parseBooleanQuery(text: string): BooleanQueryParse {
  const trimmed = text.trim();
  if (!trimmed) {
    return { nameAlternatives: [], skillAlternatives: [], requiredSkills: [] };
  }

  const { tokens, forceName } = stripWrappersAndIntroducers(
    tokenizeWithOperators(trimmed)
  );
  if (tokens.length === 0) {
    return { nameAlternatives: [], skillAlternatives: [], requiredSkills: [] };
  }

  if (hasBooleanOperators(tokens)) {
    return parseExplicitBoolean(tokens, forceName);
  }

  if (forceName) {
    const words = tokens
      .filter(
        (token): token is { kind: "word"; value: string } =>
          token.kind === "word"
      )
      .map((token) => token.value);
    if (words.every((word) => looksLikeNameToken(word))) {
      return {
        nameAlternatives: [words],
        skillAlternatives: [],
        requiredSkills: [],
      };
    }
  }

  const words = tokens
    .filter(
      (token): token is { kind: "word"; value: string } => token.kind === "word"
    )
    .map((token) => token.value)
    .join(" ");
  const juxtaposed = parseJuxtaposed(words);
  if (
    juxtaposed.nameAlternatives.length > 0 ||
    juxtaposed.skillAlternatives.length > 0
  ) {
    return juxtaposed;
  }

  return {
    nameAlternatives: [],
    skillAlternatives: [trimmed.split(/\s+/).filter(Boolean)],
    requiredSkills: [],
  };
}
