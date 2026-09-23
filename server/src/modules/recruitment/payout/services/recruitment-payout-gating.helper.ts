import { utcDayjs } from "utils/dayjs";
import { RECRUITMENT_CONNECTOR_CLASSIFICATION } from "../recruitment-payout.constants";

// Shared payout gating logic used by both the read endpoint
// (RecruitmentPayoutStateService) and the write endpoint
// (RecruitmentPayoutReleaseService). Keeping a single source of truth here
// avoids the read endpoint reporting `canReleaseNow=true` while the write
// endpoint rejects with a 400 on the same row.
//
// Two independent windows exist for a hired candidate:
//   - Candidate success-fee  -> gated by the job's probation period
//     (recruitment_jobs.probationPeriodDays). See computeProbation.
//   - Connector payout        -> gated by a per-type waiting period
//     (recruitment_job_prices.int/extConnectorPayoutWaitDays), selected by the
//     connector's classification. See computeConnectorWaitWindow. When there is
//     no waiting period for that type the connector is paid on hire.

export interface ProbationContext {
  hireDate: Date | null;
  probationPeriodDays: number | null;
}

export interface ConnectorWaitContext {
  hireDate: Date | null;
  intConnectorPayoutWaitDays: number | null;
  extConnectorPayoutWaitDays: number | null;
}

export interface JobPayoutTimingFlags {
  intPayoutWaits: boolean;
  extPayoutWaits: boolean;
}

export interface ConnectorClassificationLite {
  classificationType: "internal" | "external" | null;
}

// Returns the probation-end timestamp and whether it has elapsed.
// When no probation is configured (null/0 days), probation is considered
// elapsed immediately.
export function computeProbation(ctx: ProbationContext): {
  probationEndsAt: Date | null;
  probationElapsed: boolean;
} {
  if (!ctx.hireDate || !ctx.probationPeriodDays) {
    return { probationEndsAt: null, probationElapsed: true };
  }
  const end = utcDayjs(ctx.hireDate).add(ctx.probationPeriodDays, "days");
  return {
    probationEndsAt: end.toDate(),
    probationElapsed: end.isBefore(utcDayjs()),
  };
}

// Returns the connector waiting-period-end timestamp and whether it has
// elapsed, for a single connector row. The duration is the wait-days for that
// connector's classification (internal -> int days, otherwise ext days) — when
// it is null/0 (or there is no hire date yet), the wait is considered elapsed
// immediately, i.e. the connector is paid on hire.
export function computeConnectorWaitWindow(
  classification: ConnectorClassificationLite,
  ctx: ConnectorWaitContext
): {
  connectorWaitEndsAt: Date | null;
  connectorWaitElapsed: boolean;
  // The resolved wait-days for this classification (int vs ext), so callers
  // don't re-derive the selection. Null when the type has no waiting period.
  waitDays: number | null;
} {
  const waitDays =
    classification.classificationType ===
    RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL
      ? ctx.intConnectorPayoutWaitDays
      : ctx.extConnectorPayoutWaitDays;
  if (!ctx.hireDate || !waitDays) {
    return {
      connectorWaitEndsAt: null,
      connectorWaitElapsed: true,
      waitDays: waitDays ?? null,
    };
  }
  const end = utcDayjs(ctx.hireDate).add(waitDays, "days");
  return {
    connectorWaitEndsAt: end.toDate(),
    // Inclusive of the exact boundary: now === end counts as elapsed.
    connectorWaitElapsed: !end.isAfter(utcDayjs()),
    waitDays,
  };
}

// Per-connector-row gate. Returns true when the row is releasable now (either
// no waiting was configured for its classification, or the waiting period has
// already passed). Unclassified rows are treated as gated — the recruiter
// must classify before they can release.
export function canReleaseConnectorNow(
  classification: ConnectorClassificationLite,
  flags: JobPayoutTimingFlags,
  connectorWaitElapsed: boolean
): boolean {
  if (!classification.classificationType) return false;
  const waits =
    classification.classificationType ===
    RECRUITMENT_CONNECTOR_CLASSIFICATION.INTERNAL
      ? flags.intPayoutWaits
      : flags.extPayoutWaits;
  return !waits || connectorWaitElapsed;
}

// Candidate (success-fee) row is always gated by probation when one is set.
export function canReleaseCandidateNow(probationElapsed: boolean): boolean {
  return probationElapsed;
}
