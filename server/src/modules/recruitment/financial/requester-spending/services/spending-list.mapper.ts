import { RECRUITMENT_INTERVIEW_TXN_TYPE } from "modules/recruitment/payout/recruitment-payout.constants";
import type {
  SpendingCandidateGroup,
  SpendingJobGroup,
} from "../requester-spending.response";

export interface SpendingListRow {
  id: string;
  jobId: string;
  candidateId: string;
  candidateLabel: string | null;
  candidateFirstName: string | null;
  candidateLastName: string | null;
  candidateEmail: string | null;
  totalAmount: string;
  status: string;
  transactionType: string;
  createdAt: Date;
}

interface SpendingJobRow {
  jobId: string;
  jobTitle: string;
  companyName: string;
  totalAmount: string;
}

const addMoney = (left: string, right: string): string =>
  (Number(left) + Number(right)).toFixed(2);

export function groupSpendingRows(
  jobRows: SpendingJobRow[],
  transactionRows: SpendingListRow[]
): SpendingJobGroup[] {
  const jobs = new Map<string, SpendingJobGroup>(
    jobRows.map((job) => [
      job.jobId,
      {
        jobId: job.jobId,
        jobTitle: job.jobTitle,
        companyName: job.companyName,
        totalAmount: job.totalAmount,
        candidates: [],
      },
    ])
  );
  const candidateMaps = new Map<string, Map<string, SpendingCandidateGroup>>();
  const revealedCandidates = getRevealedCandidates(transactionRows);

  for (const row of transactionRows) {
    const job = jobs.get(row.jobId);
    if (!job) continue;

    let candidates = candidateMaps.get(row.jobId);
    if (!candidates) {
      candidates = new Map();
      candidateMaps.set(row.jobId, candidates);
    }

    let candidate = candidates.get(row.candidateId);
    if (!candidate) {
      const revealed = revealedCandidates.has(row.candidateId);
      candidate = {
        candidateId: row.candidateId,
        candidateLabel: revealed
          ? getCandidateName(row)
          : getAnonymousLabel(row),
        candidateEmail: revealed ? row.candidateEmail : null,
        totalAmount: "0.00",
        transactions: [],
      };
      candidates.set(row.candidateId, candidate);
      job.candidates.push(candidate);
    }

    candidate.totalAmount = addMoney(candidate.totalAmount, row.totalAmount);
    candidate.transactions.push({
      id: row.id,
      totalAmount: row.totalAmount,
      status: row.status,
      transactionType: row.transactionType,
      createdAt: row.createdAt.toISOString(),
    });
  }

  return jobRows.map((row) => jobs.get(row.jobId)!);
}

function getRevealedCandidates(rows: SpendingListRow[]): Set<string> {
  return new Set(
    rows
      .filter(
        (row) =>
          row.status === "captured" &&
          row.transactionType !== RECRUITMENT_INTERVIEW_TXN_TYPE.FLAT_DEPOSIT
      )
      .map((row) => row.candidateId)
  );
}

function getCandidateName(row: SpendingListRow): string {
  return (
    [row.candidateFirstName, row.candidateLastName].filter(Boolean).join(" ") ||
    getAnonymousLabel(row)
  );
}

function getAnonymousLabel(row: SpendingListRow): string {
  return row.candidateLabel ?? "Unknown Candidate";
}
