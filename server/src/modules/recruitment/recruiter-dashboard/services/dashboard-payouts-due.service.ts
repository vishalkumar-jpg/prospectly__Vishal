import { Injectable, Inject } from "@nestjs/common";
import { alias } from "drizzle-orm/pg-core";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { utcDayjs } from "utils/dayjs";
import { RECRUITMENT_PERMISSIONS } from "modules/recruitment/collaboration/recruitment-collaboration.constants";
import type {
  PayoutDueItem,
  PayoutDueStatus,
  RecruiterPayoutsDueResponse,
} from "../recruiter-dashboard.response";
import {
  buildAccessibleJobsCondition,
  createCollaboratorJobIdsSubquery,
} from "../utils/recruiter-dashboard-job-scope.utils";
import { buildJobPermissionAccessMap } from "../utils/dashboard-priority-actions-permissions.helper";
import {
  computeConnectorWaitWindow,
  computeProbation,
} from "../../payout/services/recruitment-payout-gating.helper";
import {
  RECRUITMENT_CONNECTOR_CLASSIFICATION,
  RECRUITMENT_PAYOUT_STATUS,
  RECRUITMENT_PAYOUT_TYPE,
  RECRUITMENT_PROCESSING_STATUS,
  SINGLE_CONNECTOR_SHARE_PERCENT,
} from "../../payout/recruitment-payout.constants";
import { RecruitmentFeeConfigService } from "../../fee-config/recruitment-fee-config.service";
import {
  ACTIVITY_HIRED_STAGE,
  DASHBOARD_LIMITS,
  PAYOUTS_DUE_WINDOW_DAYS,
} from "../recruiter-dashboard.constants";

type NameParts = {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
};

function buildName(parts: NameParts, fallback: string): string {
  if (parts.fullName?.trim()) return parts.fullName.trim();
  const joined = [parts.firstName, parts.lastName].filter(Boolean).join(" ");
  return joined || fallback;
}

function resolveDueStatus(daysUntilRelease: number): PayoutDueStatus {
  if (daysUntilRelease < 0) return "overdue";
  if (daysUntilRelease === 0) return "due_today";
  return "upcoming";
}

/**
 * Hired-stage payouts the recruiter still has to act on (never released, or a
 * failed transfer to retry) whose release date is within the next
 * PAYOUTS_DUE_WINDOW_DAYS days or already passed. Release dates reuse the
 * payout gating helper, and amounts mirror RecruitmentPayoutStateService's
 * re-pricing, so the dashboard agrees with the Release dialog it deep-links to.
 */
@Injectable()
export class DashboardPayoutsDueService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly feeConfig: RecruitmentFeeConfigService
  ) {}

  async getPayoutsDue(
    userId: string,
    countries: string[]
  ): Promise<RecruiterPayoutsDueResponse> {
    const jobs = schema.recruitmentJobsSchema;
    const candidates = schema.recruitmentJobCandidates;
    const payouts = schema.recruitmentPayoutHistory;
    const prices = schema.recruitmentJobPricesSchema;
    const connectors = schema.recruitmentCandidateConnectors;
    const recipientUser = alias(schema.users, "payout_due_recipient");
    const candidateUser = alias(schema.users, "payout_due_candidate");

    const collabSubquery = createCollaboratorJobIdsSubquery(this.db, userId);
    const jobWhere = buildAccessibleJobsCondition(
      userId,
      jobs,
      collabSubquery,
      countries
    );

    const rows = await this.db
      .select({
        payoutId: payouts.id,
        candidateId: payouts.candidateId,
        jobId: jobs.id,
        jobTitle: jobs.title,
        payoutType: payouts.payoutType,
        processingStatus: payouts.processingStatus,
        recipientAmount: payouts.recipientAmount,
        currency: payouts.currency,
        hireDate: candidates.hireDate,
        anonymousLabel: candidates.anonymousLabel,
        probationPeriodDays: jobs.probationPeriodDays,
        intPayoutWaits: prices.intPayoutWaits,
        extPayoutWaits: prices.extPayoutWaits,
        intConnectorPayoutWaitDays: prices.intConnectorPayoutWaitDays,
        extConnectorPayoutWaitDays: prices.extConnectorPayoutWaitDays,
        flatReferralAmount: prices.flatReferralAmount,
        hasSuccessFee: prices.hasSuccessFee,
        successFeeAmount: prices.successFeeAmount,
        classificationType: connectors.classificationType,
        recipientFullName: recipientUser.fullName,
        recipientFirstName: recipientUser.firstName,
        recipientLastName: recipientUser.lastName,
        candidateFullName: candidateUser.fullName,
        candidateFirstName: candidateUser.firstName,
        candidateLastName: candidateUser.lastName,
      })
      .from(payouts)
      .innerJoin(candidates, eq(candidates.id, payouts.candidateId))
      .innerJoin(jobs, eq(jobs.id, payouts.jobId))
      .innerJoin(
        schema.recruitmentStagesSchema,
        eq(schema.recruitmentStagesSchema.id, candidates.stageId)
      )
      .leftJoin(
        prices,
        and(eq(prices.jobId, jobs.id), isNull(prices.deletedAt))
      )
      .leftJoin(
        connectors,
        and(
          eq(connectors.candidateId, payouts.candidateId),
          eq(connectors.connectorUserId, payouts.recipientId),
          isNull(connectors.deletedAt)
        )
      )
      .leftJoin(recipientUser, eq(recipientUser.id, payouts.recipientId))
      .leftJoin(candidateUser, eq(candidateUser.id, candidates.candidateUserId))
      .where(
        and(
          jobWhere,
          eq(schema.recruitmentStagesSchema.stageKey, ACTIVITY_HIRED_STAGE),
          isNotNull(candidates.hireDate),
          isNull(candidates.deletedAt),
          isNull(payouts.deletedAt),
          eq(payouts.status, RECRUITMENT_PAYOUT_STATUS.PENDING),
          or(
            isNull(payouts.processingStatus),
            inArray(payouts.processingStatus, [
              RECRUITMENT_PROCESSING_STATUS.PENDING,
              RECRUITMENT_PROCESSING_STATUS.FAILED,
            ])
          )
        )
      );

    const accessByJob = await buildJobPermissionAccessMap(
      this.db,
      userId,
      rows.map((row) => row.jobId)
    );

    const today = utcDayjs().startOf("day");
    const due: PayoutDueItem[] = [];

    for (const row of rows) {
      const access = accessByJob.get(row.jobId);
      const canRelease =
        access === "owner" ||
        (access instanceof Set &&
          access.has(RECRUITMENT_PERMISSIONS.PAYOUT_RELEASE));
      if (!canRelease || !row.hireDate) continue;

      const isConnector = row.payoutType === RECRUITMENT_PAYOUT_TYPE.CONNECTOR;
      const releaseDate = isConnector
        ? this.resolveConnectorReleaseDate(row)
        : (computeProbation({
            hireDate: row.hireDate,
            probationPeriodDays: row.probationPeriodDays,
          }).probationEndsAt ?? row.hireDate);

      const daysUntilRelease = utcDayjs(releaseDate)
        .startOf("day")
        .diff(today, "day");
      if (daysUntilRelease > PAYOUTS_DUE_WINDOW_DAYS) continue;

      const candidateName = buildName(
        {
          fullName: row.candidateFullName,
          firstName: row.candidateFirstName,
          lastName: row.candidateLastName,
        },
        row.anonymousLabel ?? "Candidate"
      );

      due.push({
        payoutId: row.payoutId,
        candidateId: row.candidateId,
        jobId: row.jobId,
        jobTitle: row.jobTitle,
        payoutType: isConnector ? "connector" : "candidate",
        recipientName: isConnector
          ? buildName(
              {
                fullName: row.recipientFullName,
                firstName: row.recipientFirstName,
                lastName: row.recipientLastName,
              },
              "Connector"
            )
          : candidateName,
        candidateName,
        amount: isConnector
          ? this.resolveConnectorAmount(row)
          : this.resolveCandidateAmount(row),
        currency: row.currency,
        releaseDate: releaseDate.toISOString(),
        daysUntilRelease,
        dueStatus: resolveDueStatus(daysUntilRelease),
        isFailed: row.processingStatus === RECRUITMENT_PROCESSING_STATUS.FAILED,
      });
    }

    // Priority: most overdue first, then due today, then soonest upcoming.
    due.sort(
      (a, b) =>
        a.releaseDate.localeCompare(b.releaseDate) ||
        Number(b.amount) - Number(a.amount)
    );

    return {
      totalCount: due.length,
      overdueCount: due.filter((item) => item.dueStatus === "overdue").length,
      dueTodayCount: due.filter((item) => item.dueStatus === "due_today")
        .length,
      items: due.slice(0, DASHBOARD_LIMITS.PAYOUTS_DUE),
    };
  }

  // Mirrors canReleaseConnectorNow: the waiting period only applies when the
  // job's flag for this classification is on; otherwise the connector is
  // payable from the hire date.
  private resolveConnectorReleaseDate(row: {
    hireDate: Date | null;
    classificationType: string | null;
    intPayoutWaits: boolean | null;
    extPayoutWaits: boolean | null;
    intConnectorPayoutWaitDays: number | null;
    extConnectorPayoutWaitDays: number | null;
  }): Date {
    const hireDate = row.hireDate as Date;
    const classificationType =
      row.classificationType ===
        RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL ||
      row.classificationType === RECRUITMENT_CONNECTOR_CLASSIFICATION.EXTERNAL
        ? row.classificationType
        : null;
    const waits =
      classificationType === RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL
        ? row.intPayoutWaits === true
        : row.extPayoutWaits === true;
    if (!waits) return hireDate;

    const { connectorWaitEndsAt } = computeConnectorWaitWindow(
      { classificationType },
      {
        hireDate,
        intConnectorPayoutWaitDays: row.intConnectorPayoutWaitDays,
        extConnectorPayoutWaitDays: row.extConnectorPayoutWaitDays,
      }
    );
    return connectorWaitEndsAt ?? hireDate;
  }

  private resolveConnectorAmount(row: {
    flatReferralAmount: string | null;
    recipientAmount: string;
  }): string {
    if (row.flatReferralAmount == null) return row.recipientAmount;
    return this.feeConfig.getConnectorPayoutBreakdown(
      Number(row.flatReferralAmount),
      SINGLE_CONNECTOR_SHARE_PERCENT
    ).recipientAmount;
  }

  private resolveCandidateAmount(row: {
    hasSuccessFee: boolean | null;
    successFeeAmount: string | null;
    recipientAmount: string;
  }): string {
    if (!row.hasSuccessFee || row.successFeeAmount == null) {
      return row.recipientAmount;
    }
    return this.feeConfig.splitAmount(
      Number(row.successFeeAmount),
      this.feeConfig.getCandidateSuccessFeeRecipientPercent()
    );
  }
}
