import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type {
  CandidateSearchApplication,
  CandidateSearchCoverage,
} from "../candidate-search.response";

dayjs.extend(utc);

export interface CandidateSearchDbRow {
  rowId: string;
  contactId: number | null;
  candidateUserId: string | null;
  name: string | null;
  email: string | null;
  currentTitle: string | null;
  company: string | null;
  location: string | null;
  contactCountry: string | null;
  totalYearsExp: number | null;
  educationLevel: string | null;
  source: string | null;
  skills: string[];
  hasSearchableText: boolean;
  jobIds: string[];
  stageIds: number[];
  stageId: number | null;
  workTypes: string[];
  employmentTypes: string[];
  industryIds: number[];
  countryCodes: string[];
  appliedAt: string | null;
  postingCount: number;
  hasResume: boolean;
  applications: CandidateSearchApplication[];
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      out.push(item.trim());
      continue;
    }
    if (item && typeof item === "object" && "name" in item) {
      const { name } = item as { name: unknown };
      if (typeof name === "string" && name.trim()) out.push(name.trim());
    }
  }
  return out;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function toIsoString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = dayjs.utc(value);
  return parsed.isValid() ? parsed.toISOString() : null;
}

function toIntArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toInt(item))
    .filter((item): item is number => item !== null);
}

function toApplications(value: unknown): CandidateSearchApplication[] {
  if (!Array.isArray(value)) return [];
  const out: CandidateSearchApplication[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { id, jobId, stageId } = item as {
      id?: unknown;
      jobId?: unknown;
      stageId?: unknown;
    };
    if (typeof id !== "string" || !id.trim()) continue;
    if (typeof jobId !== "string" || !jobId.trim()) continue;
    out.push({
      id: id.trim(),
      jobId: jobId.trim(),
      stageId: toInt(stageId),
    });
  }
  return out;
}

export function mapCandidateSearchDbRow(
  row: Record<string, unknown>
): CandidateSearchDbRow {
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    rowId: String(row.row_id),
    contactId: toInt(row.contact_id),
    candidateUserId:
      typeof row.candidate_user_id === "string" ? row.candidate_user_id : null,
    name: typeof row.candidate_name === "string" ? row.candidate_name : null,
    email: typeof row.email === "string" ? row.email : null,
    currentTitle:
      typeof row.current_title === "string" ? row.current_title : null,
    company: typeof row.company === "string" ? row.company : null,
    location: typeof row.location === "string" ? row.location : null,
    contactCountry:
      typeof row.contact_country === "string" ? row.contact_country : null,
    totalYearsExp: toNumber(row.total_years_exp),
    educationLevel:
      typeof row.education_level === "string" ? row.education_level : null,
    source: typeof row.source === "string" ? row.source : null,
    skills: [
      ...toStringArray(row.skills),
      ...toStringArray(metadata.technologies),
      ...toStringArray(metadata.tools),
      ...toStringArray(metadata.domainExpertise),
    ],
    hasSearchableText: row.has_searchable_text === true,
    jobIds: toStringArray(row.job_ids),
    stageIds: toIntArray(row.stage_ids),
    stageId: toInt(row.stage_id),
    workTypes: toStringArray(row.work_types),
    employmentTypes: toStringArray(row.employment_types),
    industryIds: toIntArray(row.industry_ids),
    countryCodes: toStringArray(row.country_codes),
    appliedAt: toIsoString(row.applied_at),
    postingCount: toInt(row.posting_count) ?? 1,
    hasResume: row.has_resume === true,
    applications: toApplications(row.applications),
  };
}

export function mapCoverageFromRow(
  first: Record<string, unknown> | undefined
): CandidateSearchCoverage {
  return {
    totalCandidates: toInt(first?.total_count) ?? 0,
    withIndexedResume: toInt(first?.indexed_count) ?? 0,
    withExperienceYears: toInt(first?.years_count) ?? 0,
    withEducationLevel: toInt(first?.education_count) ?? 0,
  };
}

export { toInt };
