import type { BountyContactData } from "./bounty-contact-data.types";

/**
 * Safely extract enrichment-derived fields from the enrichment_response JSONB.
 * Uses optional chaining and type guards — never throws.
 */
export function extractEnrichmentData(
  enrichmentResponse: unknown
): Partial<BountyContactData> {
  try {
    if (
      !enrichmentResponse ||
      typeof enrichmentResponse !== "object" ||
      Array.isArray(enrichmentResponse)
    ) {
      return {};
    }

    const person = enrichmentResponse as Record<string, unknown>;
    const result: Partial<BountyContactData> = {};

    // Person-level fields
    if (typeof person.seniority === "string" && person.seniority.trim()) {
      result.seniority = person.seniority.trim();
    }

    // Organization-level fields
    const org =
      person.organization && typeof person.organization === "object"
        ? (person.organization as Record<string, unknown>)
        : null;

    if (org) {
      if (
        typeof org.annual_revenue_printed === "string" &&
        org.annual_revenue_printed.trim()
      ) {
        result.annual_revenue = org.annual_revenue_printed.trim();
      } else if (
        typeof org.organization_revenue_printed === "string" &&
        org.organization_revenue_printed.trim()
      ) {
        result.annual_revenue = org.organization_revenue_printed.trim();
      }

      if (typeof org.market_cap === "string" && org.market_cap.trim()) {
        result.market_cap = org.market_cap.trim();
      }

      if (
        typeof org.founded_year === "number" &&
        !isNaN(org.founded_year) &&
        org.founded_year > 1800
      ) {
        result.founded_year = org.founded_year;
      }
    }

    // Calculate total years of experience from employment history
    const totalYears = calculateTotalYearsOfExperience(
      person.employment_history
    );
    if (totalYears > 0) {
      result.total_years_of_experience = totalYears;
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Calculate total years of experience from Apollo employment_history array.
 * Handles partial dates, current roles (uses today's date), and skips invalid entries.
 */
function calculateTotalYearsOfExperience(employmentHistory: unknown): number {
  if (!Array.isArray(employmentHistory) || employmentHistory.length === 0) {
    return 0;
  }

  let totalMs = 0;

  for (const entry of employmentHistory) {
    if (!entry || typeof entry !== "object") continue;

    const record = entry as Record<string, unknown>;
    const startDate = parsePartialDate(record.start_date);
    if (!startDate) continue;

    let endDate: Date;
    if (record.current === true || !record.end_date) {
      endDate = new Date();
    } else {
      const parsed = parsePartialDate(record.end_date);
      if (!parsed) continue;
      endDate = parsed;
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    if (durationMs > 0) {
      totalMs += durationMs;
    }
  }

  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
  const years = totalMs / MS_PER_YEAR;
  return Math.round(years * 10) / 10;
}

/**
 * Parse a date string that may be full (2020-01-15) or partial (2020).
 * Returns null if unparseable.
 */
function parsePartialDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const trimmed = value.trim();

  // Full date: 2020-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }

  // Year-month: 2020-01
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}-01`);
    return isNaN(date.getTime()) ? null : date;
  }

  // Year only: 2020
  if (/^\d{4}$/.test(trimmed)) {
    const year = parseInt(trimmed, 10);
    if (year > 1900 && year <= new Date().getFullYear() + 1) {
      return new Date(`${year}-01-01`);
    }
  }

  return null;
}
