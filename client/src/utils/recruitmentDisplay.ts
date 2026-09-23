import { isHttpOrHttpsUrl } from "@/lib/url-utils";
import { CandidateApplication } from "@/lib/types/recruitment";
import { EXPERIENCE_LEVELS } from "@/pages/recruitment/post-job-wizard/constants";
import {
  RECRUITMENT_EMPLOYMENT_TYPE_LABELS,
  type RecruitmentEmploymentType,
} from "@/lib/recruitment/employment-types";

/** Human-readable work arrangement for badges (API may send lowercase). */
export function formatRecruitmentWorkType(
  workType: string | null | undefined
): string {
  const w = (workType ?? "").toLowerCase().trim();
  if (w === "remote") return "Remote";
  if (w === "hybrid") return "Hybrid";
  if (w === "onsite" || w === "on-site" || w === "on_site") return "On-site";
  const raw = (workType ?? "").trim();
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Human-readable employment type for badges (API may send lowercase). */
export function formatRecruitmentEmploymentType(
  employmentType: string | null | undefined
): string {
  const type = (employmentType ?? "").trim().toLowerCase();
  if (!type) return "";

  // Check if it matches a known employment type label
  if (
    Object.prototype.hasOwnProperty.call(
      RECRUITMENT_EMPLOYMENT_TYPE_LABELS,
      type
    )
  ) {
    return RECRUITMENT_EMPLOYMENT_TYPE_LABELS[
      type as RecruitmentEmploymentType
    ];
  }

  // Fallback: convert snake_case/kebab-case or lowercase to Capital Case
  return type.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human-readable experience level for badges (API may send lowercase). */
export function formatRecruitmentExperienceLevel(
  experienceLevel: string | null | undefined
): string {
  const level = (experienceLevel ?? "").trim();
  if (!level) return "";

  // First check if it's a known experience level
  const knownLevel = EXPERIENCE_LEVELS.find(
    (e) => e.value === level.toLowerCase()
  );
  if (knownLevel) {
    return knownLevel.label;
  }

  // Fallback: capitalize first letter
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

/** Determines if a candidate can join the meeting */
export function canJoinMeeting(application: CandidateApplication): boolean {
  return (
    (application.status === "interview_scheduled" ||
      application.status === "interview_invite_sent") &&
    !!application.meetingLink &&
    isHttpOrHttpsUrl(application.meetingLink) &&
    application.interviewType === "video"
  );
}
