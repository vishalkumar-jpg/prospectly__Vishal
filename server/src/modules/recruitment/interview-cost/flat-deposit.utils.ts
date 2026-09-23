import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import {
  RECRUITMENT_INTERVIEW_TXN_TYPE,
  RECRUITMENT_INTERVIEW_TXN_STATUS,
} from "modules/recruitment/payout/recruitment-payout.constants";

/**
 * The dollars ACTUALLY captured as the one-time flat deposit for a job (there is
 * at most one captured `flat_deposit` row per job). Returns 0 when no deposit was
 * captured — e.g. a mis-configured $0 deposit, or a job whose first shortlist has
 * not happened yet.
 *
 * Single source of truth for the deposit credit: the hire-time charge, the
 * fee-edit preview, and the recruiter breakdown display all subtract THIS value
 * (not the live `recruitment_job_prices.flatDepositAmount` snapshot), so the two
 * captures always sum to the latest Flat Referral Fee even after a mid-pipeline
 * fee edit. Accepts a `db` or transaction handle so it works inside/outside a tx.
 */
export async function getCapturedFlatDepositAmount(
  db: PostgresJsDatabase<typeof schema>,
  jobId: string
): Promise<number> {
  const [deposit] = await db
    .select({
      chargeAmount: schema.recruitmentInterviewTransactions.chargeAmount,
    })
    .from(schema.recruitmentInterviewTransactions)
    .where(
      and(
        eq(schema.recruitmentInterviewTransactions.jobId, jobId),
        eq(
          schema.recruitmentInterviewTransactions.transactionType,
          RECRUITMENT_INTERVIEW_TXN_TYPE.FLAT_DEPOSIT
        ),
        eq(
          schema.recruitmentInterviewTransactions.status,
          RECRUITMENT_INTERVIEW_TXN_STATUS.CAPTURED
        ),
        isNull(schema.recruitmentInterviewTransactions.deletedAt)
      )
    )
    .limit(1);

  return parseFloat(deposit?.chargeAmount ?? "0");
}
