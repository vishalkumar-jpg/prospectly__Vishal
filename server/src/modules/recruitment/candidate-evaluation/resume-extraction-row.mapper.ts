import type { ResumeExtractionParsed } from "../resume-extraction/services/resume-extraction-ai.service";

/** The `contact_resumes` columns needed to rebuild an extraction. */
export interface PersistedResumeExtractionRow {
  jobTitle: string | null;
  skills: unknown;
  totalYearsExp: string | null;
  aiSummary: string | null;
  metadata: unknown;
}

/**
 * Rehydrate a persisted `contact_resumes` row into the same shape the AI parser
 * returns.
 *
 * The evaluation processor reuses the extraction the resume-extraction queue
 * already produced instead of re-parsing the PDF. Going through this mapper
 * keeps `buildResumeText` seeing the same field shape either way, so the score
 * is derived from exactly the data the recruiter is shown.
 */
export function toResumeExtractionParsed(
  row: PersistedResumeExtractionRow
): ResumeExtractionParsed {
  return {
    jobTitle: row.jobTitle?.trim() || null,
    skills: Array.isArray(row.skills)
      ? row.skills
          .filter((skill): skill is string => typeof skill === "string")
          .map((skill) => skill.trim())
          .filter(Boolean)
      : [],
    totalYearsExp:
      row.totalYearsExp != null && String(row.totalYearsExp).trim() !== ""
        ? String(row.totalYearsExp).trim()
        : null,
    aiSummary: typeof row.aiSummary === "string" ? row.aiSummary : null,
    metadata:
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}
