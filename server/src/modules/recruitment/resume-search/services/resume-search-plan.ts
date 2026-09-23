import {
  RESUME_SEARCH_PLAN_MAX_SKILLS,
  RESUME_SEARCH_PLAN_MAX_TERM_LENGTH,
  RESUME_SEARCH_PLAN_MAX_VARIANTS,
  RESUME_SEARCH_PLAN_MAX_YEARS,
} from "../resume-search.constants";

/** One hard requirement: a label to show, and the spellings that satisfy it. */
export interface ResumeSearchRequiredSkill {
  label: string;
  variants: string[];
}

export interface ResumeSearchPlan {
  requiredSkills: ResumeSearchRequiredSkill[];
  minYearsExperience: number | null;
  semanticIntent: string;
}

/** A requirement compiled for SQL — `expr` feeds websearch_to_tsquery. */
export interface ResumeSearchConstraint {
  label: string;
  expr: string;
}

export const EMPTY_RESUME_SEARCH_PLAN: ResumeSearchPlan = {
  requiredSkills: [],
  minYearsExperience: null,
  semanticIntent: "",
};

/**
 * Truncates by code point, not code unit. A plain `.slice()` can cut a
 * surrogate pair in half, and the lone surrogate survives JSON.stringify as
 * `\udXXX` — which Postgres rejects when the constraints array is cast to
 * jsonb, turning a long skill name into a 500 instead of a search.
 */
function truncateTerm(value: string): string {
  const points = Array.from(value);
  return points.length <= RESUME_SEARCH_PLAN_MAX_TERM_LENGTH
    ? value
    : points.slice(0, RESUME_SEARCH_PLAN_MAX_TERM_LENGTH).join("");
}

function cleanTerm(value: unknown): string {
  if (typeof value !== "string") return "";

  // Quotes are stripped rather than escaped: they are the phrase delimiter in
  // the expression built below, so leaving them in would let a variant break
  // out of its own phrase.
  //
  // Hyphens go too, but only at the edges — `expr` reaches
  // websearch_to_tsquery, where a leading `-` is NOT, so a variant like
  // "-react" would quietly invert its own requirement and match the candidates
  // who lack the skill. Stripped after truncation so a hyphen exposed by the
  // cut is caught as well. Interior hyphens stay: "front-end" is one term.
  return truncateTerm(value.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim())
    .trim()
    .replace(/^-+|-+$/g, "")
    .trim();
}

function cleanVariants(raw: unknown, label: string): string[] {
  const source = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const variants: string[] = [];

  for (const item of [label, ...source]) {
    const term = cleanTerm(item);
    const key = term.toLowerCase();

    if (!term || seen.has(key)) continue;

    seen.add(key);
    variants.push(term);
    if (variants.length >= RESUME_SEARCH_PLAN_MAX_VARIANTS) break;
  }

  return variants;
}

function cleanYears(raw: unknown): number | null {
  const value = typeof raw === "string" ? Number(raw) : raw;

  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  const years = Math.floor(value);
  if (years <= 0 || years > RESUME_SEARCH_PLAN_MAX_YEARS) return null;

  return years;
}

/**
 * The planner's response is model output derived from user-typed text, so it is
 * treated as untrusted: every field is re-validated and bounded here rather
 * than trusted from the response schema alone.
 */
export function sanitizeResumeSearchPlan(raw: unknown): ResumeSearchPlan {
  if (!raw || typeof raw !== "object") return EMPTY_RESUME_SEARCH_PLAN;

  const input = raw as Record<string, unknown>;
  const skills = Array.isArray(input.requiredSkills)
    ? input.requiredSkills
    : [];

  const requiredSkills: ResumeSearchRequiredSkill[] = [];
  const seen = new Set<string>();

  for (const entry of skills) {
    if (!entry || typeof entry !== "object") continue;

    const { label: rawLabel, variants: rawVariants } = entry as Record<
      string,
      unknown
    >;
    const label = cleanTerm(rawLabel);
    const key = label.toLowerCase();

    if (!label || seen.has(key)) continue;

    const variants = cleanVariants(rawVariants, label);
    if (variants.length === 0) continue;

    seen.add(key);
    requiredSkills.push({ label, variants });
    if (requiredSkills.length >= RESUME_SEARCH_PLAN_MAX_SKILLS) break;
  }

  return {
    requiredSkills,
    minYearsExperience: cleanYears(input.minYearsExperience),
    semanticIntent: cleanTerm(input.semanticIntent).slice(0, 200),
  };
}

/**
 * Compiles each requirement to an OR of its spellings. Multi-word variants are
 * quoted so `elastic search` matches as a phrase rather than two loose terms.
 *
 * Variants matter more than they look: the one resume that satisfies a "Vue.js"
 * requirement may carry the lexeme `vue.js` and not bare `vue`, and Postgres
 * does not stem between them.
 */
export function buildConstraints(
  plan: ResumeSearchPlan
): ResumeSearchConstraint[] {
  return plan.requiredSkills.map((skill) => ({
    label: skill.label,
    expr: skill.variants
      .map((variant) => (variant.includes(" ") ? `"${variant}"` : variant))
      .join(" or "),
  }));
}

export function planHasConstraints(plan: ResumeSearchPlan): boolean {
  return plan.requiredSkills.length > 0 || plan.minYearsExperience !== null;
}
