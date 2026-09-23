import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { sanitizeRichText } from "utils/sanitize-rich-text";
import { ModuleAccessService } from "modules/module-access/module-access.service";
import { resolveInternalConnectorWaitDays } from "modules/module-access/module-access.utils";
import {
  assertValidSalaryBounds,
  buildSalaryPatch,
  shouldRematchQualifiedPool,
} from "./recruitment-jobs-update.helpers";
import {
  RecruitmentJobPricingService,
  JobPricingFields,
} from "./recruitment-job-pricing.service";
import { RECRUITMENT_JOBS_MESSAGES } from "../recruitment-jobs.constants";
import { UpdateRecruitmentJobDto } from "../recruitment-jobs.dto";
import { JobPoolMatchQueueService } from "../../job-pool-matches/job-pool-match-queue.service";
import { RecruitmentPayoutCreateService } from "../../payout/services/recruitment-payout-create.service";
import { normalizeJobAssessmentQuestions } from "../../assessment-bank/recruitment-assessment.util";
import { syncJobAssessmentQuestions } from "../../assessment-bank/recruitment-assessment-persistence";

const FLAT_REFERRAL_FEE_FIELD_KEY = "flat_referral_amount";
const SUCCESS_FEE_FIELD_KEY = "success_fee_amount";

@Injectable()
export class RecruitmentJobsUpdateService {
  private readonly logger = new Logger(RecruitmentJobsUpdateService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly jobPoolMatchQueueService: JobPoolMatchQueueService,
    private readonly pricingService: RecruitmentJobPricingService,
    private readonly payoutCreateService: RecruitmentPayoutCreateService,
    private readonly moduleAccessService: ModuleAccessService
  ) {}

  /**
   * Builds the connector-payout price-row patch, or null when the request does
   * not touch connector timing (so unrelated edits never reset it). Each field is
   * merged over the current stored value so only fields the request actually sends
   * change. External is taken from the DTO; internal is forced to the current org
   * admin default when one is configured, ignoring submitted internal values
   * (anti-bypass). A type that waits must end with a positive day count.
   */
  private async buildConnectorPayoutPatch(
    userId: string,
    jobId: string,
    dto: UpdateRecruitmentJobDto
  ): Promise<{
    intPayoutWaits: boolean;
    extPayoutWaits: boolean;
    intConnectorPayoutWaitDays: number | null;
    extConnectorPayoutWaitDays: number | null;
  } | null> {
    const provided =
      dto.intPayoutWaits !== undefined ||
      dto.extPayoutWaits !== undefined ||
      dto.intConnectorPayoutWaitDays !== undefined ||
      dto.extConnectorPayoutWaitDays !== undefined;
    if (!provided) return null;

    const prices = schema.recruitmentJobPricesSchema;
    const [existing] = await this.db
      .select({
        intPayoutWaits: prices.intPayoutWaits,
        extPayoutWaits: prices.extPayoutWaits,
        intConnectorPayoutWaitDays: prices.intConnectorPayoutWaitDays,
        extConnectorPayoutWaitDays: prices.extConnectorPayoutWaitDays,
      })
      .from(prices)
      .where(and(eq(prices.jobId, jobId), isNull(prices.deletedAt)))
      .limit(1);

    const normalizeWaitDays = (value?: number): number | null =>
      value && value > 0 ? value : null;

    const adminInternalWaitDays = resolveInternalConnectorWaitDays(
      await this.moduleAccessService.getRecruitingModuleConfig(userId)
    );
    const internalLocked = adminInternalWaitDays !== null;

    const patch = {
      intPayoutWaits: internalLocked
        ? true
        : dto.intPayoutWaits !== undefined
          ? dto.intPayoutWaits === true
          : (existing?.intPayoutWaits ?? false),
      intConnectorPayoutWaitDays: internalLocked
        ? adminInternalWaitDays
        : dto.intConnectorPayoutWaitDays !== undefined
          ? normalizeWaitDays(dto.intConnectorPayoutWaitDays)
          : (existing?.intConnectorPayoutWaitDays ?? null),
      extPayoutWaits:
        dto.extPayoutWaits !== undefined
          ? dto.extPayoutWaits === true
          : (existing?.extPayoutWaits ?? false),
      extConnectorPayoutWaitDays:
        dto.extConnectorPayoutWaitDays !== undefined
          ? normalizeWaitDays(dto.extConnectorPayoutWaitDays)
          : (existing?.extConnectorPayoutWaitDays ?? null),
    };

    // A waiting type must have a positive duration — otherwise the release gate
    // would treat it as elapsed immediately (silently paid on hire).
    if (
      (patch.intPayoutWaits && !patch.intConnectorPayoutWaitDays) ||
      (patch.extPayoutWaits && !patch.extConnectorPayoutWaitDays)
    ) {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.CONNECTOR_PAYOUT_WAIT_DAYS_REQUIRED
      );
    }

    return patch;
  }

  async updateJob(
    userId: string,
    jobId: string,
    dto: UpdateRecruitmentJobDto
  ): Promise<schema.RecruitmentJob> {
    const jobs = schema.recruitmentJobsSchema;
    const prices = schema.recruitmentJobPricesSchema;

    const [existing] = await this.db
      .select({
        id: jobs.id,
        title: jobs.title,
        status: jobs.status,
        experienceLevel: jobs.experienceLevel,
        requiredSkills: jobs.requiredSkills,
        preferredSkills: jobs.preferredSkills,
      })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.JOB_NOT_FOUND
      );
    }

    assertValidSalaryBounds(dto);

    // Connector payout timing edit — external is HR-controlled; internal is
    // re-derived from the org admin default when one is set (same anti-bypass as
    // create). Only applied when the connector fields are part of this request.
    const connectorPayoutPatch = await this.buildConnectorPayoutPatch(
      userId,
      jobId,
      dto
    );
    if (connectorPayoutPatch && existing.status === "closed") {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.CONNECTOR_PAYOUT_EDIT_CLOSED_JOB
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: toUTC(),
      updatedBy: userId,
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.companyName !== undefined) updateData.companyName = dto.companyName;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.countries !== undefined) updateData.countries = dto.countries;
    if (dto.workType !== undefined) updateData.workType = dto.workType;
    if (dto.employmentType !== undefined)
      updateData.employmentType = dto.employmentType;
    if (dto.experienceLevel !== undefined)
      updateData.experienceLevel = dto.experienceLevel;
    if (dto.industryId !== undefined) updateData.industryId = dto.industryId;
    if (dto.departmentId !== undefined)
      updateData.departmentId = dto.departmentId;
    if (dto.description != null)
      updateData.description = sanitizeRichText(dto.description);
    if (dto.requirements != null)
      updateData.requirements = sanitizeRichText(dto.requirements);
    if (dto.responsibilities != null)
      updateData.responsibilities = sanitizeRichText(dto.responsibilities);
    if (dto.benefits != null)
      updateData.benefits = sanitizeRichText(dto.benefits);
    if (dto.companyWebsite !== undefined)
      updateData.companyWebsite = dto.companyWebsite;
    if (dto.requiredSkills !== undefined)
      updateData.requiredSkills = dto.requiredSkills;
    if (dto.preferredSkills !== undefined)
      updateData.preferredSkills = dto.preferredSkills;

    const syncAssessment = dto.assessmentQuestions !== undefined;
    const assessmentQuestions = syncAssessment
      ? normalizeJobAssessmentQuestions(dto.assessmentQuestions ?? [])
      : [];

    const salaryPatch = buildSalaryPatch(dto, userId);
    const shouldRematch = shouldRematchQualifiedPool(existing, dto);

    if (shouldRematch) {
      updateData.embedding = null;
    }

    const updated = await this.db.transaction(async (tx) => {
      // Flat Referral Fee edit (Phase 1). Validate + recompute INSIDE the tx with
      // row locks so a job closed/changed concurrently is caught atomically (no
      // stale pre-read). Returns null when the fee is unchanged → skip the write +
      // audit row so a re-submitted identical value can't pollute the trail.
      const flatFeePatch =
        dto.flatReferralAmount !== undefined
          ? await this.resolveFlatFeeUpdate(tx, jobId, dto)
          : null;

      // Success Fee edit (Phase 2). Same locked-recompute-in-tx shape as the flat
      // fee. Enabling or a probation change also writes the probation window onto
      // the job below.
      const successFeePatch =
        dto.successFeeAmount !== undefined ||
        dto.hasSuccessFee !== undefined ||
        dto.probationPeriodDays !== undefined
          ? await this.resolveSuccessFeeUpdate(tx, jobId, dto)
          : null;

      if (
        successFeePatch &&
        successFeePatch.probationPeriodDays !== undefined
      ) {
        updateData.probationPeriodDays = successFeePatch.probationPeriodDays;
      }

      const [row] = await tx
        .update(jobs)
        .set(updateData)
        .where(eq(jobs.id, jobId))
        .returning();

      if (salaryPatch) {
        await tx
          .update(prices)
          .set(salaryPatch)
          .where(and(eq(prices.jobId, jobId), isNull(prices.deletedAt)));
      }

      if (connectorPayoutPatch) {
        await tx
          .update(prices)
          .set({
            ...connectorPayoutPatch,
            updatedBy: userId,
            updatedAt: toUTC(),
          })
          .where(and(eq(prices.jobId, jobId), isNull(prices.deletedAt)));
      }

      if (flatFeePatch) {
        await tx
          .update(prices)
          .set({
            ...flatFeePatch.pricingColumns,
            updatedBy: userId,
            updatedAt: toUTC(),
          })
          .where(and(eq(prices.jobId, jobId), isNull(prices.deletedAt)));

        await tx.insert(schema.recruitmentJobPriceChangeHistory).values({
          jobId,
          jobPriceId: flatFeePatch.jobPriceId,
          fieldKey: FLAT_REFERRAL_FEE_FIELD_KEY,
          oldValue: flatFeePatch.oldFlatReferralAmount,
          newValue: flatFeePatch.pricingColumns.flatReferralAmount,
          snapshot: flatFeePatch.pricingColumns,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      // Only write price columns + audit when the flag/amount changed; a
      // probation-only edit is written via `updateData` above (no audit noise).
      const successFeePriceColumns = successFeePatch?.priceColumns;
      if (successFeePatch && successFeePriceColumns) {
        await tx
          .update(prices)
          .set({
            ...successFeePriceColumns,
            updatedBy: userId,
            updatedAt: toUTC(),
          })
          .where(and(eq(prices.jobId, jobId), isNull(prices.deletedAt)));

        await tx.insert(schema.recruitmentJobPriceChangeHistory).values({
          jobId,
          jobPriceId: successFeePatch.jobPriceId,
          fieldKey: SUCCESS_FEE_FIELD_KEY,
          oldValue: successFeePatch.oldSuccessFeeAmount,
          newValue: successFeePriceColumns.successFeeAmount,
          snapshot: successFeePriceColumns,
          createdBy: userId,
          updatedBy: userId,
        });

        // Enabling a Success Fee after the fact: backfill pending bonus rows for
        // candidates already hired, so the "Release Candidate Bonus" action shows
        // for them. Their funding is reconciled (charged) at release.
        if (successFeePatch.enabled) {
          await this.payoutCreateService.backfillCandidateSuccessFeeRows(
            tx,
            jobId
          );
        }
      }

      if (syncAssessment) {
        await syncJobAssessmentQuestions(tx, {
          userId,
          jobId,
          questions: assessmentQuestions,
        });

        const settings = schema.recruitmentJobSettingsSchema;
        const now = toUTC();
        const [settingsRow] = await tx
          .update(settings)
          .set({
            hasAssessment: assessmentQuestions.length > 0,
            updatedBy: userId,
            updatedAt: now,
          })
          .where(and(eq(settings.jobId, jobId), isNull(settings.deletedAt)))
          .returning({ id: settings.id });

        if (!settingsRow) {
          await tx.insert(settings).values({
            jobId,
            hasAssessment: assessmentQuestions.length > 0,
            createdBy: userId,
            updatedBy: userId,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      return row;
    });

    if (shouldRematch) {
      try {
        await this.jobPoolMatchQueueService.queueJobMatchCompute(jobId);
      } catch (error) {
        this.logger.error(
          `RECRUITMENT_JOBS_UPDATE :: UPDATE_JOB : QUEUE_MATCH_ERROR : ${error}`
        );
      }
    }

    return updated;
  }

  /**
   * Validates and recomputes the Flat Referral pricing snapshot for a fee edit,
   * running INSIDE the caller's transaction with row locks so the guards can't be
   * bypassed by a concurrent state change (TOCTOU). Guards: the job must be open
   * (not closed) and use the flat_referral model — both re-read `.for("update")`.
   * The fee/deposit %/derived fees are recomputed server-side via the shared
   * pricing service (single source of truth), so a crafted payload cannot bypass
   * the Stripe/application/publish fees.
   *
   * Returns `null` when the recomputed fee equals the stored value — the caller
   * then skips both the price update and the audit-history insert, so a
   * re-submitted identical value never writes a no-op (`oldValue === newValue`) row.
   */
  private async resolveFlatFeeUpdate(
    tx: PostgresJsDatabase<typeof schema>,
    jobId: string,
    dto: UpdateRecruitmentJobDto
  ): Promise<{
    jobPriceId: string;
    oldFlatReferralAmount: string | null;
    pricingColumns: JobPricingFields;
  } | null> {
    const jobs = schema.recruitmentJobsSchema;
    const prices = schema.recruitmentJobPricesSchema;

    // Lock the job row and re-check status atomically — serializes against the
    // close service's `UPDATE recruitment_jobs SET status='closed'`.
    const [jobRow] = await tx
      .select({ status: jobs.status })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
      .for("update");

    if (!jobRow) {
      throw new NotFoundException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.JOB_NOT_FOUND
      );
    }

    if (jobRow.status === "closed") {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.FLAT_FEE_EDIT_CLOSED_JOB
      );
    }

    // Lock the price row before recomputing.
    const [priceRow] = await tx
      .select({
        id: prices.id,
        flatReferralAmount: prices.flatReferralAmount,
      })
      .from(prices)
      .where(and(eq(prices.jobId, jobId), isNull(prices.deletedAt)))
      .for("update");

    if (!priceRow) {
      throw new NotFoundException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.JOB_NOT_FOUND
      );
    }

    const pricingColumns = await this.pricingService.resolvePricingFields({
      flatReferralAmount: dto.flatReferralAmount,
    });

    // No-op guard: the fee is unchanged → nothing to persist, no audit row.
    if (
      priceRow.flatReferralAmount != null &&
      Number(priceRow.flatReferralAmount) ===
        Number(pricingColumns.flatReferralAmount)
    ) {
      return null;
    }

    return {
      jobPriceId: priceRow.id,
      oldFlatReferralAmount: priceRow.flatReferralAmount,
      pricingColumns,
    };
  }

  /**
   * Validates a Success Fee edit inside the caller's transaction with row locks.
   * Allows editing the amount, enabling a fee on a job that launched without one,
   * and disabling an active fee. Disabling is **future-only** — it stops charging
   * and creating bonuses going forward; candidates already charged keep their
   * pending bonus (no refund). The Success Fee is stored raw (100% to the
   * candidate), so there is no derived-fee recompute — just validate + persist.
   * Returns `null` when there is nothing to change.
   */
  private async resolveSuccessFeeUpdate(
    tx: PostgresJsDatabase<typeof schema>,
    jobId: string,
    dto: UpdateRecruitmentJobDto
  ): Promise<{
    jobPriceId: string;
    oldSuccessFeeAmount: string | null;
    /** Price columns to write + audit. `null` when only the probation changed. */
    priceColumns: {
      hasSuccessFee: boolean;
      successFeeAmount: string | null;
    } | null;
    /** Probation days to write on the job; `undefined` leaves it untouched. */
    probationPeriodDays?: number | null;
    enabled: boolean;
  } | null> {
    const jobs = schema.recruitmentJobsSchema;
    const prices = schema.recruitmentJobPricesSchema;

    const [jobRow] = await tx
      .select({
        status: jobs.status,
        probationPeriodDays: jobs.probationPeriodDays,
      })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
      .for("update");

    if (!jobRow) {
      throw new NotFoundException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.JOB_NOT_FOUND
      );
    }

    if (jobRow.status === "closed") {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.SUCCESS_FEE_EDIT_CLOSED_JOB
      );
    }

    const [priceRow] = await tx
      .select({
        id: prices.id,
        hasSuccessFee: prices.hasSuccessFee,
        successFeeAmount: prices.successFeeAmount,
      })
      .from(prices)
      .where(and(eq(prices.jobId, jobId), isNull(prices.deletedAt)))
      .for("update");

    if (!priceRow) {
      throw new NotFoundException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.JOB_NOT_FOUND
      );
    }

    const currentlyOn = priceRow.hasSuccessFee === true;

    // Disable an active Success Fee. Future-only: this only stops charging +
    // creating bonuses going forward (via the existing hasSuccessFee reads).
    // Candidates already charged keep their pending bonus, paid the funded amount
    // at release — no refund, no backfill. HR cancels a specific pending bonus via
    // the Release dialog if needed.
    if (currentlyOn && dto.hasSuccessFee === false) {
      return {
        jobPriceId: priceRow.id,
        oldSuccessFeeAmount: priceRow.successFeeAmount,
        priceColumns: { hasSuccessFee: false, successFeeAmount: null },
        // Probation left untouched on disable.
        enabled: false,
      };
    }

    const enabling = !currentlyOn && dto.hasSuccessFee === true;

    // Can't edit a fee that doesn't exist and isn't being enabled.
    if (!enabling && !currentlyOn) {
      return null;
    }

    // Amount is required on enable; on an active fee, keep the stored amount when
    // the caller only changed the probation window.
    if (enabling && dto.successFeeAmount === undefined) {
      throw new BadRequestException(
        RECRUITMENT_JOBS_MESSAGES.ERROR.SUCCESS_FEE_AMOUNT_REQUIRED
      );
    }
    const newAmount =
      dto.successFeeAmount !== undefined
        ? String(dto.successFeeAmount)
        : priceRow.successFeeAmount;

    // Probation is written on enable, or when explicitly changed on an active fee
    // (`undefined` = the caller didn't touch it, so leave the current value). A
    // 0/blank probation is stored as null, matching the create service.
    const currentProbation = jobRow.probationPeriodDays ?? null;
    const newProbation =
      enabling || dto.probationPeriodDays !== undefined
        ? dto.probationPeriodDays || null
        : undefined;

    const amountChanged =
      enabling ||
      Number(priceRow.successFeeAmount ?? NaN) !== Number(newAmount ?? NaN);
    const probationChanged =
      newProbation !== undefined && newProbation !== currentProbation;

    // Nothing actually changed → skip write + audit (no no-op audit noise).
    if (!amountChanged && !probationChanged) {
      return null;
    }

    return {
      jobPriceId: priceRow.id,
      oldSuccessFeeAmount: priceRow.successFeeAmount,
      // Only write price columns + audit when the flag/amount actually changed.
      priceColumns: amountChanged
        ? { hasSuccessFee: true, successFeeAmount: newAmount }
        : null,
      probationPeriodDays: newProbation,
      enabled: enabling,
    };
  }
}
