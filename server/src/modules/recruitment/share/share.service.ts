import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, desc, sql, count, isNull, inArray, ne } from "drizzle-orm";
import { normalizeSkillsArray } from "utils/helper.utils";
import { fetchCandidateAssessmentQuestions } from "modules/recruitment/assessment-bank/candidate-response/candidate-response.query";
import { randomBytes, createHash } from "node:crypto";
import { CreateJobShareDto } from "./share.dto";
import { JOB_SHARE_MESSAGES } from "./share.constants";
import { RecruitmentFeeConfigService } from "../fee-config/recruitment-fee-config.service";

@Injectable()
export class RecruitmentJobShareService {
  private readonly logger = new Logger(RecruitmentJobShareService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly feeConfig: RecruitmentFeeConfigService
  ) {}

  private generateSharerCode(): string {
    return randomBytes(12).toString("hex");
  }

  private normalizeIp(ip: string): string {
    let normalized = ip.toLowerCase();

    if (normalized.startsWith("::ffff:")) {
      normalized = normalized.slice(7);
    }

    const hasBrackets = normalized.includes("[") && normalized.includes("]");

    if (hasBrackets) {
      normalized = normalized.slice(
        normalized.indexOf("[") + 1,
        normalized.indexOf("]")
      );
    } else if (normalized.includes(".")) {
      const colonIndex = normalized.indexOf(":");
      if (colonIndex !== -1) {
        normalized = normalized.slice(0, colonIndex);
      }
    }

    if (normalized === "::1") {
      normalized = "127.0.0.1";
    }

    return normalized;
  }

  private hashIp(ip: string): string {
    const normalized = this.normalizeIp(ip);
    return createHash("sha256").update(normalized).digest("hex").slice(0, 64);
  }

  async createShare(userId: string, dto: CreateJobShareDto) {
    const { jobId, platform, utmSource, utmMedium, utmCampaign } = dto;

    // Validate job exists and is active
    const [job] = await this.db
      .select({
        id: schema.recruitmentJobsSchema.id,
        requesterId: schema.recruitmentJobsSchema.requesterId,
      })
      .from(schema.recruitmentJobsSchema)
      .where(
        and(
          eq(schema.recruitmentJobsSchema.id, jobId),
          eq(schema.recruitmentJobsSchema.status, "active"),
          isNull(schema.recruitmentJobsSchema.deletedAt)
        )
      )
      .limit(1);

    if (!job) {
      throw new NotFoundException(JOB_SHARE_MESSAGES.ERROR.JOB_NOT_FOUND);
    }

    // Prevent sharing own job
    if (job.requesterId === userId) {
      throw new BadRequestException(
        JOB_SHARE_MESSAGES.ERROR.CANNOT_SHARE_OWN_JOB
      );
    }

    // Check for existing share with same (job, user, platform) combination
    const [existingShare] = await this.db
      .select()
      .from(schema.recruitmentJobShares)
      .where(
        and(
          eq(schema.recruitmentJobShares.jobId, jobId),
          eq(schema.recruitmentJobShares.sharerId, userId),
          eq(schema.recruitmentJobShares.platform, platform)
        )
      )
      .limit(1);

    if (existingShare) {
      return {
        shareId: existingShare.id,
        sharerCode: existingShare.sharerCode,
        platform: existingShare.platform,
      };
    }

    const sharerCode = this.generateSharerCode();

    const [share] = await this.db
      .insert(schema.recruitmentJobShares)
      .values({
        jobId,
        sharerId: userId,
        sharerCode,
        platform,
        utmSource,
        utmMedium,
        utmCampaign,
      })
      .returning();

    return {
      shareId: share.id,
      sharerCode: share.sharerCode,
      platform: share.platform,
    };
  }

  async getShareByCode(sharerCode: string) {
    const [share] = await this.db
      .select()
      .from(schema.recruitmentJobShares)
      .where(eq(schema.recruitmentJobShares.sharerCode, sharerCode))
      .limit(1);

    return share;
  }

  async getUserJobShares(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const pricing = schema.recruitmentJobPricesSchema;

    const shares = await this.db
      .select({
        id: schema.recruitmentJobShares.id,
        sharerCode: schema.recruitmentJobShares.sharerCode,
        platform: schema.recruitmentJobShares.platform,
        createdAt: schema.recruitmentJobShares.createdAt,
        jobId: schema.recruitmentJobShares.jobId,
        job: {
          id: schema.recruitmentJobsSchema.id,
          title: schema.recruitmentJobsSchema.title,
          companyName: schema.recruitmentJobsSchema.companyName,
          bountyAmount: pricing.bountyAmount,
          status: schema.recruitmentJobsSchema.status,
        },
      })
      .from(schema.recruitmentJobShares)
      .innerJoin(
        schema.recruitmentJobsSchema,
        eq(schema.recruitmentJobShares.jobId, schema.recruitmentJobsSchema.id)
      )
      .leftJoin(pricing, eq(schema.recruitmentJobShares.jobId, pricing.jobId))
      .where(
        and(
          eq(schema.recruitmentJobShares.sharerId, userId),
          ne(schema.recruitmentJobShares.platform, "consent")
        )
      )
      .orderBy(desc(schema.recruitmentJobShares.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.recruitmentJobShares)
      .where(
        and(
          eq(schema.recruitmentJobShares.sharerId, userId),
          ne(schema.recruitmentJobShares.platform, "consent")
        )
      );

    const shareIds = shares.map((s) => s.id);

    const clickCounts =
      shareIds.length > 0
        ? await this.db
            .select({
              shareId: schema.recruitmentJobShareEvents.shareId,
              clicksCount: count(),
            })
            .from(schema.recruitmentJobShareEvents)
            .where(
              and(
                inArray(schema.recruitmentJobShareEvents.shareId, shareIds),
                eq(schema.recruitmentJobShareEvents.eventType, "view")
              )
            )
            .groupBy(schema.recruitmentJobShareEvents.shareId)
        : [];

    const clicksCountMap = new Map<string, number>();
    clickCounts.forEach((cc) => {
      clicksCountMap.set(cc.shareId, Number(cc.clicksCount));
    });

    const sharesWithClicks = shares.map((share) => ({
      id: share.id,
      sharerCode: share.sharerCode,
      platform: share.platform,
      createdAt: share.createdAt,
      clicksCount: clicksCountMap.get(share.id) || 0,
      job: share.job,
    }));

    return {
      shares: sharesWithClicks,
      total: Number(countResult?.count ?? 0),
      page,
      limit,
    };
  }

  async getPublicJob(jobId: string, includeClosed = false) {
    const conditions = [
      eq(schema.recruitmentJobsSchema.id, jobId),
      isNull(schema.recruitmentJobsSchema.deletedAt),
    ];
    if (!includeClosed) {
      conditions.push(eq(schema.recruitmentJobsSchema.status, "active"));
    }

    const pricingTable = schema.recruitmentJobPricesSchema;

    const [job] = await this.db
      .select({
        id: schema.recruitmentJobsSchema.id,
        title: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
        companyWebsite: schema.recruitmentJobsSchema.companyWebsite,
        description: schema.recruitmentJobsSchema.description,
        requirements: schema.recruitmentJobsSchema.requirements,
        responsibilities: schema.recruitmentJobsSchema.responsibilities,
        benefits: schema.recruitmentJobsSchema.benefits,
        location: schema.recruitmentJobsSchema.location,
        workType: schema.recruitmentJobsSchema.workType,
        employmentType: schema.recruitmentJobsSchema.employmentType,
        experienceLevel: schema.recruitmentJobsSchema.experienceLevel,
        salaryRangeMin: pricingTable.salaryRangeMin,
        salaryRangeMax: pricingTable.salaryRangeMax,
        salaryCurrency: pricingTable.salaryCurrency,
        salaryPeriod: pricingTable.salaryPeriod,
        salaryRangeNotes: pricingTable.salaryRangeNotes,
        bountyAmount: pricingTable.bountyAmount,
        hasSuccessFee: pricingTable.hasSuccessFee,
        successFeeAmount: pricingTable.successFeeAmount,
        probationPeriodDays: schema.recruitmentJobsSchema.probationPeriodDays,
        requiredSkills: schema.recruitmentJobsSchema.requiredSkills,
        preferredSkills: schema.recruitmentJobsSchema.preferredSkills,
        status: schema.recruitmentJobsSchema.status,
        closedAt: schema.recruitmentJobsSchema.closedAt,
        createdAt: schema.recruitmentJobsSchema.createdAt,
        departmentName: schema.departmentsSchema.name,
        industryName: schema.industriesSchema.name,
      })
      .from(schema.recruitmentJobsSchema)
      .leftJoin(
        pricingTable,
        eq(schema.recruitmentJobsSchema.id, pricingTable.jobId)
      )
      .leftJoin(
        schema.departmentsSchema,
        eq(
          schema.recruitmentJobsSchema.departmentId,
          schema.departmentsSchema.id
        )
      )
      .leftJoin(
        schema.industriesSchema,
        eq(schema.recruitmentJobsSchema.industryId, schema.industriesSchema.id)
      )
      .where(and(...conditions))
      .limit(1);

    if (!job) return null;

    // Candidate-facing assessment questions (answer key stripped). Empty array
    // when the job has no assessment.
    const assessmentQuestions = await fetchCandidateAssessmentQuestions(
      this.db,
      job.id
    );

    const grossAmount = Number(job.bountyAmount);
    return {
      ...job,
      requiredSkills: normalizeSkillsArray(job.requiredSkills),
      preferredSkills: normalizeSkillsArray(job.preferredSkills),
      connectorPayout: this.feeConfig.splitAmount(
        grossAmount,
        this.feeConfig.getConnectorPercent()
      ),
      sharerPayout: this.feeConfig.getSharerPayoutAmount(grossAmount),
      hasAssessment: assessmentQuestions.length > 0,
      assessmentQuestions,
    };
  }

  async trackView(
    shareId: string,
    ip: string,
    userAgent?: string,
    referrer?: string
  ) {
    const ipHash = this.hashIp(ip);

    const insertResult = await this.db
      .insert(schema.recruitmentJobShareEvents)
      .values({
        shareId,
        eventType: "view",
        ipHash,
        userAgent: userAgent?.slice(0, 500),
        referrer: referrer?.slice(0, 1000),
      })
      .onConflictDoNothing({
        target: [
          schema.recruitmentJobShareEvents.shareId,
          schema.recruitmentJobShareEvents.eventType,
          schema.recruitmentJobShareEvents.ipHash,
        ],
      })
      .returning({ id: schema.recruitmentJobShareEvents.id });

    return { success: true, isNew: insertResult.length > 0 };
  }

  async trackConsentView(
    jobId: string,
    ip: string,
    userAgent?: string,
    referrer?: string
  ) {
    const sharerCode = `consent_${jobId}`;

    await this.db
      .insert(schema.recruitmentJobShares)
      .values({
        jobId,
        sharerId: null,
        sharerCode,
        platform: "consent",
      })
      .onConflictDoNothing({
        target: schema.recruitmentJobShares.sharerCode,
      });

    const [share] = await this.db
      .select({ id: schema.recruitmentJobShares.id })
      .from(schema.recruitmentJobShares)
      .where(eq(schema.recruitmentJobShares.sharerCode, sharerCode))
      .limit(1);

    if (!share) return { success: false, isNew: false };

    return this.trackView(share.id, ip, userAgent, referrer);
  }
}
