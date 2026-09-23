import { Injectable, Logger } from "@nestjs/common";
import type { ConnectorPipelineCandidate } from "../connector-pipeline.types";
import { ConnectorPipelineCandidatesService } from "./connector-pipeline-candidates.service";
import {
  JobPoolMatchesActiveQueryService,
  type JobBoardInboxItem,
} from "../../job-pool-matches/services";
import { GetConnectorPipelineQueryDto } from "../connector-pipeline.dto";

export interface ConnectorJobBoard {
  jobTitle: string;
  jobCompany: string;
  jobLocation: string | null;
  bountyAmount: string;
  jobSalaryRangeMin: string;
  jobSalaryRangeMax: string;
  jobSalaryCurrency: string | null;
  jobSalaryPeriod: string | null;
  myReferCount?: number;
  hasSharedLink?: boolean;
  connectorPayout?: string;
  sharerPayout?: string;
  /** Pre-referral candidates (rich inbox items) for the pool-sourced columns. */
  poolItems: JobBoardInboxItem[];
  /** Referred candidates (Consent Accepted → Hired / Rejected). */
  referred: ConnectorPipelineCandidate[];
}

@Injectable()
export class ConnectorPipelineService {
  private readonly logger = new Logger(ConnectorPipelineService.name);

  constructor(
    private readonly candidatesService: ConnectorPipelineCandidatesService,
    private readonly activeQueryService: JobPoolMatchesActiveQueryService
  ) {}

  /**
   * Per-job board — pre-referral pool candidates (pool_matches + in-flight
   * upload_jobs) plus referred candidates for a single job. The two sets are
   * kept separate: they carry different shapes (rich inbox items vs referred
   * candidates) and the client renders each with its own card. Overlap is
   * impossible by construction — the pool side excludes `consent_accepted`,
   * which is exactly when the referred `job_candidates` row is created.
   */
  async getJobBoard(
    userId: string,
    jobId: string,
    query?: GetConnectorPipelineQueryDto
  ): Promise<ConnectorJobBoard> {
    const search = query?.search;
    const [poolItems, referred, header] = await Promise.all([
      this.activeQueryService.getJobBoardCandidates(userId, jobId, search),
      this.candidatesService.getCandidates(userId, search, jobId),
      this.activeQueryService.getJobHeader(jobId, userId),
    ]);

    return {
      jobTitle: header?.jobTitle ?? "",
      jobCompany: header?.jobCompany ?? "",
      jobLocation: header?.jobLocation ?? null,
      bountyAmount: header?.bountyAmount ?? "0",
      jobSalaryRangeMin: header?.jobSalaryRangeMin ?? "0",
      jobSalaryRangeMax: header?.jobSalaryRangeMax ?? "0",
      jobSalaryCurrency: header?.jobSalaryCurrency ?? null,
      jobSalaryPeriod: header?.jobSalaryPeriod ?? null,
      myReferCount: header?.myReferCount ?? 0,
      hasSharedLink: header?.hasSharedLink ?? false,
      connectorPayout: header?.connectorPayout,
      sharerPayout: header?.sharerPayout,
      poolItems,
      referred,
    };
  }
}
