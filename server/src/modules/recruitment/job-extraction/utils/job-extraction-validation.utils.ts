import type { ExtractedJobData } from "../job-extraction.dto";

/**
 * Checks if the extracted job data contains any meaningful content.
 *
 * @param parsed - The extracted job data to validate
 * @returns True if any of the main fields contain non-whitespace content
 */
export function hasMeaningfulData(parsed: ExtractedJobData): boolean {
  return !!(
    parsed.title.trim() ||
    parsed.companyName.trim() ||
    parsed.description.trim() ||
    parsed.requirements.trim() ||
    parsed.responsibilities.trim()
  );
}
