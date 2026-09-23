import type {
  CandidateSearchRow,
  FitResult,
} from "../candidate-search.response";
import type { FitProfile } from "../criteria/candidate-search-fit";
import type { CandidateSearchDbRow } from "./candidate-search-row.mapper";

export function toFitProfile(row: CandidateSearchDbRow): FitProfile {
  return {
    skills: row.skills,
    hasSearchableText: row.hasSearchableText,
    totalYearsExp: row.totalYearsExp,
    educationLevel: row.educationLevel,
    workTypes: row.workTypes,
    employmentTypes: row.employmentTypes,
    industryIds: row.industryIds,
    countryCodes: row.countryCodes,
    location: row.location,
    contactCountry: row.contactCountry,
    stageIds: row.stageIds,
    company: row.company,
    title: row.currentTitle,
    source: row.source,
    appliedAt: row.appliedAt,
  };
}

export function toCandidateSearchRow(
  row: CandidateSearchDbRow,
  fit: FitResult | null,
  relevance: number | null
): CandidateSearchRow {
  return {
    id: row.rowId,
    contactId: row.contactId,
    candidateUserId: row.candidateUserId,
    name: row.name,
    email: row.email,
    currentTitle: row.currentTitle,
    company: row.company,
    location: row.location,
    experienceYears: row.totalYearsExp,
    educationLevel: row.educationLevel,
    source: row.source,
    jobIds: row.jobIds,
    postingCount: row.postingCount,
    stageIds: row.stageIds,
    stageId: row.stageId,
    applications: row.applications,
    appliedAt: row.appliedAt,
    fit,
    relevance,
    indexed: row.hasSearchableText,
    hasResume: row.hasResume,
  };
}
