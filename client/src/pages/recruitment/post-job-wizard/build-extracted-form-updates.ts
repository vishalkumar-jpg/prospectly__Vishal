import type {
  Department,
  ExtractedJobData,
  Industry,
} from "@/lib/api/recruitment";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, WORK_TYPES } from "./constants";
import type { JobFormData } from "./types";
import { JOB_FIELD_LIMITS } from "./validation";
import { plainTextToHtml } from "@/lib/rich-text";

const ALLOWED_EXPERIENCE = new Set(EXPERIENCE_LEVELS.map((e) => e.value));
const ALLOWED_WORK_TYPE = new Set(WORK_TYPES.map((t) => t.value));
const ALLOWED_EMPLOYMENT_TYPE = new Set(
  EMPLOYMENT_TYPES.map((t) => t.value as string)
);

function isMeaningfulText(raw: string): boolean {
  const s = raw.trim();
  return s.length > 0 && s !== "0";
}

function maybeClampedText(raw: string, maxLen: number): string | undefined {
  if (!isMeaningfulText(raw)) return undefined;
  return raw.trim().slice(0, maxLen);
}

function normalizeExtractedSkillArray(
  arr: string[],
  maxItems: number
): string[] | undefined {
  const skillMax = JOB_FIELD_LIMITS.skill.max;
  const out = arr
    .map((s) => (typeof s === "string" ? s.trim().slice(0, skillMax) : ""))
    .filter(Boolean);
  if (out.length === 0) return undefined;
  return out.slice(0, maxItems);
}

function matchMasterIdByName(
  raw: string,
  items: { id: number; name: string }[]
): string | undefined {
  const key = raw.trim().toLowerCase();
  if (!key || key === "0") return undefined;
  const m = items.find((i) => i.name.trim().toLowerCase() === key);
  return m !== undefined ? m.id.toString() : undefined;
}

function applyExtractedScalarTextFields({
  out,
  extracted,
}: {
  out: Partial<JobFormData>;
  extracted: ExtractedJobData;
}): void {
  const title = maybeClampedText(extracted.title, JOB_FIELD_LIMITS.title.max);
  if (title !== undefined) out.title = title;

  const companyName = maybeClampedText(
    extracted.companyName,
    JOB_FIELD_LIMITS.companyName.max
  );
  if (companyName !== undefined) out.companyName = companyName;

  const location = maybeClampedText(
    extracted.location,
    JOB_FIELD_LIMITS.location.max
  );
  if (location !== undefined) out.location = location;
}

function applyExtractedRichTextFields({
  out,
  extracted,
}: {
  out: Partial<JobFormData>;
  extracted: ExtractedJobData;
}): void {
  const description = maybeClampedText(
    extracted.description,
    JOB_FIELD_LIMITS.description.max
  );
  if (description !== undefined) out.description = plainTextToHtml(description);

  const requirements = maybeClampedText(
    extracted.requirements,
    JOB_FIELD_LIMITS.requirements.max
  );
  if (requirements !== undefined) {
    out.requirements = plainTextToHtml(requirements);
  }

  const responsibilities = maybeClampedText(
    extracted.responsibilities,
    JOB_FIELD_LIMITS.responsibilities.max
  );
  if (responsibilities !== undefined) {
    out.responsibilities = plainTextToHtml(responsibilities);
  }

  const benefits = maybeClampedText(
    extracted.benefits,
    JOB_FIELD_LIMITS.benefits.max
  );
  if (benefits !== undefined) out.benefits = plainTextToHtml(benefits);
}

function applyExtractedSkills({
  out,
  extracted,
}: {
  out: Partial<JobFormData>;
  extracted: ExtractedJobData;
}): void {
  const reqSkills = Array.isArray(extracted.requiredSkills)
    ? normalizeExtractedSkillArray(
        extracted.requiredSkills,
        JOB_FIELD_LIMITS.requiredSkills.maxArray
      )
    : undefined;
  if (reqSkills !== undefined) out.requiredSkills = reqSkills;

  const prefSkills = Array.isArray(extracted.preferredSkills)
    ? normalizeExtractedSkillArray(
        extracted.preferredSkills,
        JOB_FIELD_LIMITS.preferredSkills.maxArray
      )
    : undefined;
  if (prefSkills !== undefined) out.preferredSkills = prefSkills;
}

function applyExtractedEnumsAndMasterData({
  out,
  extracted,
  industries,
  departments,
}: {
  out: Partial<JobFormData>;
  extracted: ExtractedJobData;
  industries: Industry[];
  departments: Department[];
}): void {
  const exp = extracted.experienceLevel.trim();
  if (exp && exp !== "0" && ALLOWED_EXPERIENCE.has(exp)) {
    out.experienceLevel = exp;
  }

  const work = extracted.workType.trim();
  if (work && work !== "0" && ALLOWED_WORK_TYPE.has(work)) {
    out.workType = work;
  }

  const employment = extracted.employmentType?.trim();
  if (
    employment &&
    employment !== "0" &&
    ALLOWED_EMPLOYMENT_TYPE.has(employment)
  ) {
    out.employmentType = employment;
  }

  const industryId = matchMasterIdByName(extracted.industry, industries);
  if (industryId !== undefined) out.industry = industryId;

  const departmentId = matchMasterIdByName(extracted.department, departments);
  if (departmentId !== undefined) out.department = departmentId;
}

/**
 * Builds a partial form update from extraction: only meaningful, clamped values;
 * omits keys when extraction is empty or unknown so merge with prev preserves user data.
 */
export function buildExtractedFormUpdates(
  _prev: JobFormData,
  extracted: ExtractedJobData,
  industries: Industry[],
  departments: Department[]
): Partial<JobFormData> {
  const out: Partial<JobFormData> = {};

  applyExtractedScalarTextFields({ out, extracted });
  applyExtractedRichTextFields({ out, extracted });
  applyExtractedSkills({ out, extracted });
  applyExtractedEnumsAndMasterData({
    out,
    extracted,
    industries,
    departments,
  });

  return out;
}
