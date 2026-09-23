import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { ProfilesService } from "modules/profiles/profiles.service";
import { CalendarService } from "modules/calendar/calendar.service";
import { ModuleAccessService } from "modules/module-access/module-access.service";
import { resolveInternalConnectorWaitDays } from "modules/module-access/module-access.utils";
import { toUTC } from "utils/dayjs";
import {
  sanitizeRichText,
  sanitizeRichTextOptional,
} from "utils/sanitize-rich-text";
import { RecruitmentJobPricingService } from "./recruitment-job-pricing.service";
import { normalizeSalaryCurrency } from "../../recruitment-salary-currency";
import { CreateRecruitmentJobDto } from "../recruitment-jobs.dto";
import { RECRUITMENT_JOBS_MESSAGES } from "../recruitment-jobs.constants";
import { JobPoolMatchQueueService } from "../../job-pool-matches/job-pool-match-queue.service";
import { RecruitmentNotificationsDispatchService } from "../../notifications/services";
import { normalizeJobAssessmentQuestions } from "../../assessment-bank/recruitment-assessment.util";
import { syncJobAssessmentQuestions } from "../../assessment-bank/recruitment-assessment-persistence";

@Injectable()
export class RecruitmentJobsCreateService {
  private readonly logger = new Logger(RecruitmentJobsCreateService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService,
    private readonly calendarService: CalendarService,
    private readonly jobPricingService: RecruitmentJobPricingService,
    private readonly jobPoolMatchQueueService: JobPoolMatchQueueService,
    private readonly notificationsDispatchService: RecruitmentNotificationsDispatchService,
    private readonly moduleAccessService: ModuleAccessService
  ) {}

  private async validatePaymentMethod(userId: string): Promise<void> {
    const profile = await this.profilesService.getProfileById(userId);

    if (!profile) {
      throw new NotFoundException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.PROFILE_NOT_FOUND
      );
    }

    if (!profile.stripePrimaryPaymentMethodId) {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.NO_PAYMENT_METHOD
      );
    }
  }

  private async validateCalendarConnection(userId: string): Promise<void> {
    const integration =
      await this.calendarService.getActiveCalendarIntegration(userId);

    if (!integration) {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.NO_CALENDAR_CONNECTED
      );
    }
  }

  async createJob(
    userId: string,
    dto: CreateRecruitmentJobDto
  ): Promise<schema.RecruitmentJob> {
    await this.validatePaymentMethod(userId);
    await this.validateCalendarConnection(userId);

    // Salary range is optional. Both fields must be supplied together
    // ("both-or-neither"); when present, max must exceed min. Absent salary is
    // persisted as 0/0 to satisfy the NOT NULL columns.
    const salaryRangeMin = dto.salaryRangeMin ?? 0;
    const salaryRangeMax = dto.salaryRangeMax ?? 0;
    const hasMin = salaryRangeMin > 0;
    const hasMax = salaryRangeMax > 0;
    if (hasMin !== hasMax) {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.SALARY_RANGE_INCOMPLETE
      );
    }
    if (hasMin && hasMax && salaryRangeMax <= salaryRangeMin) {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.SALARY_RANGE_INVALID
      );
    }

    const salaryPeriod = dto.salaryPeriod ?? "yearly";

    // All fee values are computed server-side — the client never supplies them.
    const pricingFields = await this.jobPricingService.resolvePricingFields({
      flatReferralAmount: dto.flatReferralAmount,
    });

    const hasSuccessFee = dto.hasSuccessFee === true;
    if (hasSuccessFee && dto.successFeeAmount === undefined) {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.SUCCESS_FEE_AMOUNT_REQUIRED
      );
    }
    const successFeeAmount = hasSuccessFee
      ? String(dto.successFeeAmount)
      : null;
    const probationPeriodDays =
      hasSuccessFee && dto.probationPeriodDays ? dto.probationPeriodDays : null;
    // Connector payout timing is independent of the success fee — it is driven
    // solely by the dedicated Connector Payout step. External timing is always
    // HR-controlled; internal timing is locked to the org admin's default when
    // one is configured, ignoring whatever the client submitted (anti-bypass).
    const normalizeWaitDays = (value: number | undefined): number | null =>
      value && value > 0 ? value : null;

    const adminInternalWaitDays = resolveInternalConnectorWaitDays(
      await this.moduleAccessService.getRecruitingModuleConfig(userId)
    );
    const internalLocked = adminInternalWaitDays !== null;

    const intPayoutWaits = internalLocked ? true : dto.intPayoutWaits === true;
    const intConnectorPayoutWaitDays = internalLocked
      ? adminInternalWaitDays
      : normalizeWaitDays(dto.intConnectorPayoutWaitDays);
    const extPayoutWaits = dto.extPayoutWaits === true;
    const extConnectorPayoutWaitDays = normalizeWaitDays(
      dto.extConnectorPayoutWaitDays
    );

    // Normalize + validate assessment questions up-front (throws on bad input
    // before we open the transaction). Empty when the recruiter skipped the step.
    const assessmentQuestions = dto.assessmentQuestions?.length
      ? normalizeJobAssessmentQuestions(dto.assessmentQuestions)
      : [];
    const hasAssessment = assessmentQuestions.length > 0;

    const now = toUTC();

    const { job, pricing } = await this.db.transaction(async (tx) => {
      const [createdJob] = await tx
        .insert(schema.recruitmentJobsSchema)
        .values({
          requesterId: userId,
          title: dto.title,
          description: sanitizeRichText(dto.description),
          companyName: dto.companyName,
          requirements: sanitizeRichText(dto.requirements),
          experienceLevel: dto.experienceLevel,
          industryId: dto.industryId,
          departmentId: dto.departmentId,
          requiredSkills: dto.requiredSkills,
          preferredSkills: dto.preferredSkills ?? [],
          workType: dto.workType,
          employmentType: dto.employmentType ?? null,
          location: dto.location,
          countries: dto.countries,
          responsibilities: sanitizeRichTextOptional(dto.responsibilities),
          benefits: sanitizeRichTextOptional(dto.benefits),
          creationMethod: dto.creationMethod ?? "manual",
          sourceUrl: dto.sourceUrl,
          companyWebsite: dto.companyWebsite,
          probationPeriodDays,
          status: "active",
          createdBy: userId,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const [createdPricing] = await tx
        .insert(schema.recruitmentJobPricesSchema)
        .values({
          jobId: createdJob.id,
          salaryRangeMin: String(salaryRangeMin),
          salaryRangeMax: String(salaryRangeMax),
          salaryCurrency: normalizeSalaryCurrency(dto.salaryCurrency),
          salaryPeriod,
          salaryRangeNotes: dto.salaryRangeNotes ?? null,
          // Written explicitly: the column's DB default is still the legacy
          // "per_interview" and there is no migration changing it.
          pricingModel: "flat_referral",
          bountyAmount: pricingFields.bountyAmount,
          suggestedBountyAmount: pricingFields.suggestedBountyAmount,
          providerFee: pricingFields.providerFee,
          processingFee: pricingFields.processingFee,
          totalAmount: pricingFields.totalAmount,
          flatReferralAmount: pricingFields.flatReferralAmount,
          hasSuccessFee,
          successFeeAmount,
          intPayoutWaits,
          extPayoutWaits,
          intConnectorPayoutWaitDays,
          extConnectorPayoutWaitDays,
          createdBy: userId,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Every job gets a settings row on creation — this table is generic
      // per-job settings, not notification-only state.
      await tx.insert(schema.recruitmentJobSettingsSchema).values({
        jobId: createdJob.id,
        notifyOnCreate: dto.notifyUsers === true,
        organisationIds: dto.organisationIds ?? null,
        hasAssessment,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      if (assessmentQuestions.length > 0) {
        await syncJobAssessmentQuestions(tx, {
          userId,
          jobId: createdJob.id,
          questions: assessmentQuestions,
        });
      }

      return { job: createdJob, pricing: createdPricing };
    });

    // Queue match computation for the new job
    try {
      await this.jobPoolMatchQueueService.queueJobMatchCompute(job.id);
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_JOBS_CREATE :: CREATE_JOB : QUEUE_MATCH_ERROR : ${error}`
      );
    }

    // Dispatch the bulk job-post notification if the recruiter opted in.
    // A failure here must not fail job creation — log and continue.
    if (dto.notifyUsers && dto.organisationIds?.length) {
      try {
        await this.notificationsDispatchService.dispatchNotification({
          userId,
          jobId: job.id,
          organisationIds: dto.organisationIds,
          fromCreation: true,
        });
      } catch (error) {
        this.logger.error(
          `RECRUITMENT_JOBS_CREATE :: CREATE_JOB : NOTIFY_ERROR : ${error}`
        );
      }
    }

    return {
      ...job,
      salaryRangeMin: pricing.salaryRangeMin,
      salaryRangeMax: pricing.salaryRangeMax,
      salaryCurrency: pricing.salaryCurrency,
      salaryPeriod: pricing.salaryPeriod,
      bountyAmount: pricing.bountyAmount,
    } as schema.RecruitmentJob & {
      salaryRangeMin: string;
      salaryRangeMax: string;
      salaryCurrency: string | null;
      salaryPeriod: string | null;
      bountyAmount: string;
    };
  }
}
