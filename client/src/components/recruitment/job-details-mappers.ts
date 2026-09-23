import type { MarketplaceJob } from "@/types/marketplace";
import type {
  InboxJob,
  ClosedInboxJob,
} from "@/pages/recruitment/connector-pipeline/types";
import type { PublicJobData } from "@/lib/api/recruitment";

export interface JobDetailsDisplayData {
  id?: string;
  title: string;
  companyName: string;
  location?: string | null;
  workType?: string | null;
  employmentType?: string | null;
  experienceLevel?: string | null;
  industryName?: string | null;
  departmentName?: string | null;
  description?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
  benefits?: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  salaryRangeMin: string;
  salaryRangeMax: string;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  salaryRangeNotes?: string | null;
  connectorPayout: string;
  // Only populated when the source includes lifecycle status (currently only
  // the public-job endpoint). Drives the inactive-job banner in the drawer.
  status?: string | null;
}

export function marketplaceJobToDisplayData(
  job: MarketplaceJob
): JobDetailsDisplayData {
  return {
    id: job.id,
    title: job.title,
    companyName: job.companyName,
    location: job.location ?? null,
    workType: undefined,
    employmentType: job.employmentType ?? null,
    experienceLevel: undefined,
    industryName: undefined,
    departmentName: undefined,
    description: job.description ?? null,
    requirements: undefined,
    responsibilities: undefined,
    benefits: undefined,
    requiredSkills: job.requiredSkills ?? [],
    preferredSkills: job.preferredSkills ?? [],
    salaryRangeMin: job.salaryRangeMin,
    salaryRangeMax: job.salaryRangeMax,
    salaryCurrency: job.salaryCurrency ?? null,
    salaryPeriod: job.salaryPeriod ?? null,
    salaryRangeNotes: job.salaryRangeNotes ?? null,
    connectorPayout: job.connectorPayout,
  };
}

export function publicJobToDisplayData(
  job: PublicJobData
): JobDetailsDisplayData {
  return {
    id: job.id,
    title: job.title,
    companyName: job.companyName,
    location: job.location ?? null,
    workType: job.workType ?? null,
    employmentType: job.employmentType ?? null,
    experienceLevel: job.experienceLevel ?? null,
    industryName: job.industryName ?? null,
    departmentName: job.departmentName ?? null,
    description: job.description ?? null,
    requirements: job.requirements ?? null,
    responsibilities: job.responsibilities ?? null,
    benefits: job.benefits ?? null,
    requiredSkills: job.requiredSkills ?? [],
    preferredSkills: job.preferredSkills ?? [],
    salaryRangeMin: job.salaryRangeMin,
    salaryRangeMax: job.salaryRangeMax,
    salaryCurrency: job.salaryCurrency ?? null,
    salaryPeriod: job.salaryPeriod ?? null,
    salaryRangeNotes: job.salaryRangeNotes ?? null,
    connectorPayout: job.connectorPayout,
    status: job.status ?? null,
  };
}

export function inboxJobToDisplayData(
  job: InboxJob | ClosedInboxJob
): JobDetailsDisplayData {
  return {
    id: job.jobId,
    title: job.jobTitle,
    companyName: job.jobCompany,
    location: job.jobLocation ?? null,
    workType: undefined,
    employmentType: undefined,
    experienceLevel: undefined,
    industryName: undefined,
    departmentName: undefined,
    description: job.jobDescription ?? null,
    requirements: undefined,
    responsibilities: undefined,
    benefits: undefined,
    requiredSkills: job.jobRequiredSkills ?? [],
    preferredSkills: job.jobPreferredSkills ?? [],
    salaryRangeMin: job.jobSalaryRangeMin,
    salaryRangeMax: job.jobSalaryRangeMax,
    salaryCurrency: job.jobSalaryCurrency ?? null,
    salaryPeriod: job.jobSalaryPeriod ?? null,
    salaryRangeNotes: job.jobSalaryRangeNotes ?? null,
    connectorPayout: job.connectorPayout ?? job.bountyAmount,
  };
}
