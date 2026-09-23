import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { JOB_POOL_MATCH_STATUS } from "modules/recruitment/job-pool-matches/job-pool-matches.constants";
import { fetchCandidateAssessmentQuestions } from "modules/recruitment/assessment-bank/candidate-response/candidate-response.query";
import { toCanonicalLinkedInProfileUrl } from "utils/linkedin-profile.utils";
import type { CandidateAssessmentQuestion } from "modules/recruitment/assessment-bank/recruitment-assessment.util";
import { ConsentTokenService } from "./consent-token.service";
import { isSupersededConsentToken } from "../consent-token.utils";

export interface ConsentPageData {
  status:
    | "pending"
    | "expired"
    | "invalid"
    | "declined"
    | "accepted"
    | "superseded";
  jobId?: string;
  jobClosed?: boolean;
  closedAt?: string | null;
  closedReason?: string | null;
  job?: {
    id: string;
    title: string;
    companyName: string;
    companyWebsite: string | null;
    description: string;
    requirements: string | null;
    responsibilities: string | null;
    benefits: string | null;
    location: string | null;
    workType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    salaryRangeMin: string;
    salaryRangeMax: string;
    salaryCurrency: string | null;
    salaryPeriod: string | null;
    salaryRangeNotes: string | null;
    requiredSkills: string[] | null;
    preferredSkills: string[] | null;
    hasSuccessFee: boolean;
    successFeeAmount: string | null;
    probationPeriodDays: number | null;
    industryName: string | null;
    departmentName: string | null;
    createdAt: string;
  };
  connectorName?: string;
  source?: "ai_matched" | "connector_uploaded";
  contactHasLinkedin?: boolean;
  /** Resume-extracted LinkedIn for autofill; candidate confirms on apply. */
  suggestedLinkedinUrl?: string | null;
  hasAssessment?: boolean;
  assessmentQuestions?: CandidateAssessmentQuestion[];
}

@Injectable()
export class ConsentVerifyService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly consentTokenService: ConsentTokenService
  ) {}

  async verifyConsentToken(token: string): Promise<ConsentPageData> {
    // 1. Verify JWT
    let payload;
    try {
      payload = await this.consentTokenService.verifyToken(token);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("expired")) {
        return { status: "expired" };
      }
      return { status: "invalid" };
    }

    // 2. Find match and check status
    const [match] = await this.db
      .select()
      .from(schema.recruitmentJobPoolMatches)
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.id, payload.matchId),
          isNull(schema.recruitmentJobPoolMatches.deletedAt)
        )
      )
      .limit(1);

    if (!match) {
      return { status: "invalid" };
    }

    if (isSupersededConsentToken(match, token)) {
      return { status: "expired" };
    }

    if (match.status === JOB_POOL_MATCH_STATUS.CONSENT_DECLINED) {
      return { status: "declined", jobId: payload.jobId };
    }

    if (match.status === JOB_POOL_MATCH_STATUS.CONSENT_SUPERSEDED) {
      return { status: "superseded", jobId: payload.jobId };
    }

    if (match.status === JOB_POOL_MATCH_STATUS.CONSENT_ACCEPTED) {
      return { status: "accepted", jobId: payload.jobId };
    }

    // 3. Fetch job details with industry, department, and pricing
    const pricing = schema.recruitmentJobPricesSchema;
    const jobs = schema.recruitmentJobsSchema;

    const [jobData] = await this.db
      .select({
        job: {
          id: jobs.id,
          title: jobs.title,
          companyName: jobs.companyName,
          companyWebsite: jobs.companyWebsite,
          description: jobs.description,
          requirements: jobs.requirements,
          responsibilities: jobs.responsibilities,
          benefits: jobs.benefits,
          location: jobs.location,
          workType: jobs.workType,
          employmentType: jobs.employmentType,
          experienceLevel: jobs.experienceLevel,
          requiredSkills: jobs.requiredSkills,
          preferredSkills: jobs.preferredSkills,
          probationPeriodDays: jobs.probationPeriodDays,
          status: jobs.status,
          closedAt: jobs.closedAt,
          closedReason: jobs.closedReason,
          createdAt: jobs.createdAt,
        },
        salaryRangeMin: pricing.salaryRangeMin,
        salaryRangeMax: pricing.salaryRangeMax,
        salaryCurrency: pricing.salaryCurrency,
        salaryPeriod: pricing.salaryPeriod,
        salaryRangeNotes: pricing.salaryRangeNotes,
        hasSuccessFee: pricing.hasSuccessFee,
        successFeeAmount: pricing.successFeeAmount,
        industryName: schema.industriesSchema.name,
        departmentName: schema.departmentsSchema.name,
      })
      .from(jobs)
      .leftJoin(pricing, eq(jobs.id, pricing.jobId))
      .leftJoin(
        schema.industriesSchema,
        eq(jobs.industryId, schema.industriesSchema.id)
      )
      .leftJoin(
        schema.departmentsSchema,
        eq(jobs.departmentId, schema.departmentsSchema.id)
      )
      .where(and(eq(jobs.id, payload.jobId), isNull(jobs.deletedAt)))
      .limit(1);

    if (!jobData || !jobData.job) {
      return { status: "invalid" };
    }

    const { job } = jobData;
    const isJobClosed = job.status === "closed";

    // 4. Get connector name (first + last initial)
    const connector = await this.db.query.users.findFirst({
      where: eq(schema.users.id, payload.connectorUserId),
    });

    const connectorFirstName = connector?.firstName || "";
    const connectorLastInitial = connector?.lastName
      ? `${connector.lastName.charAt(0)}.`
      : "";
    const connectorName =
      `${connectorFirstName} ${connectorLastInitial}`.trim() || "A connector";

    // Source + contact linkedin lookup lets the client decide whether to
    // render the ConsentApplyModal or auto-submit (connector_uploaded path).
    const source =
      match.source === "connector_uploaded"
        ? "connector_uploaded"
        : "ai_matched";
    let contactHasLinkedin = false;
    let suggestedLinkedinUrl: string | null = null;
    if (source === "connector_uploaded") {
      const [contactRow] = await this.db
        .select({ linkedin: schema.contacts.linkedin })
        .from(schema.contacts)
        .where(eq(schema.contacts.id, match.contactId))
        .limit(1);
      const raw = contactRow?.linkedin?.trim() || null;
      suggestedLinkedinUrl = toCanonicalLinkedInProfileUrl(raw);
      contactHasLinkedin = !!suggestedLinkedinUrl;
    }

    // Candidate-facing assessment questions (answer key stripped). Drives the
    // assessment step in ConsentApplyModal and whether auto-submit is allowed.
    const assessmentQuestions = await fetchCandidateAssessmentQuestions(
      this.db,
      job.id
    );

    return {
      status: "pending",
      jobId: payload.jobId,
      source,
      contactHasLinkedin,
      suggestedLinkedinUrl,
      hasAssessment: assessmentQuestions.length > 0,
      assessmentQuestions,
      jobClosed: isJobClosed,
      closedAt: isJobClosed ? (job.closedAt?.toISOString() ?? null) : null,
      closedReason: isJobClosed ? (job.closedReason ?? null) : null,
      job: {
        id: job.id,
        title: job.title,
        companyName: job.companyName,
        companyWebsite: job.companyWebsite,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        benefits: job.benefits,
        location: job.location,
        workType: job.workType,
        employmentType: job.employmentType,
        experienceLevel: job.experienceLevel,
        salaryRangeMin: String(jobData.salaryRangeMin ?? "0"),
        salaryRangeMax: String(jobData.salaryRangeMax ?? "0"),
        salaryCurrency: jobData.salaryCurrency ?? null,
        salaryPeriod: jobData.salaryPeriod ?? null,
        salaryRangeNotes: jobData.salaryRangeNotes ?? null,
        requiredSkills: job.requiredSkills as string[] | null,
        preferredSkills: job.preferredSkills as string[] | null,
        hasSuccessFee: jobData.hasSuccessFee ?? false,
        successFeeAmount: jobData.successFeeAmount ?? null,
        probationPeriodDays: job.probationPeriodDays ?? null,
        industryName: jobData.industryName,
        departmentName: jobData.departmentName,
        createdAt: job.createdAt.toISOString(),
      },
      connectorName,
    };
  }
}
