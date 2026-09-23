import type {
  ConnectorEarningCandidateGroup,
  ConnectorEarningJobGroup,
  ConnectorEarningPayoutItem,
} from "../connector-earning.response";

export interface EarningListRow {
  id: string;
  jobId: string;
  candidateId: string;
  candidateLabel: string | null;
  earnedAmount: string | null;
  creditsApplied: string;
  processingStatus: string;
  isShared: boolean;
  createdAt: Date;
}

interface EarningJobRow {
  jobId: string;
  jobTitle: string;
  companyName: string;
  totalAmount: string;
}

const addMoney = (left: string, right: string): string =>
  (Number(left) + Number(right)).toFixed(2);

export function groupEarningRows(
  jobRows: EarningJobRow[],
  payoutRows: EarningListRow[]
): ConnectorEarningJobGroup[] {
  const jobs = new Map<string, ConnectorEarningJobGroup>(
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
  const candidateMaps = new Map<
    string,
    Map<string, ConnectorEarningCandidateGroup>
  >();

  for (const row of payoutRows) {
    const job = jobs.get(row.jobId);
    if (!job) continue;

    let candidates = candidateMaps.get(row.jobId);
    if (!candidates) {
      candidates = new Map();
      candidateMaps.set(row.jobId, candidates);
    }

    let candidate = candidates.get(row.candidateId);
    if (!candidate) {
      candidate = {
        candidateId: row.candidateId,
        candidateLabel: row.candidateLabel ?? "Unknown Candidate",
        totalAmount: "0.00",
        earnings: [],
      };
      candidates.set(row.candidateId, candidate);
      job.candidates.push(candidate);
    }

    const amount = row.earnedAmount ?? "0";
    candidate.totalAmount = addMoney(candidate.totalAmount, amount);
    candidate.earnings.push({
      id: row.id,
      earnedAmount: row.earnedAmount,
      creditsApplied: row.creditsApplied,
      processingStatus:
        row.processingStatus as ConnectorEarningPayoutItem["processingStatus"],
      isShared: row.isShared,
      createdAt: row.createdAt.toISOString(),
    });
  }

  return jobRows.map((row) => jobs.get(row.jobId)!);
}
