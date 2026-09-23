/** Keep in sync with server/src/database/schema/recruitment-jobs.ts */
export const RECRUITMENT_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "freelance",
] as const;

export type RecruitmentEmploymentType =
  (typeof RECRUITMENT_EMPLOYMENT_TYPES)[number];

export const RECRUITMENT_EMPLOYMENT_TYPE_LABELS: Record<
  RecruitmentEmploymentType,
  string
> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
  freelance: "Freelance",
};
