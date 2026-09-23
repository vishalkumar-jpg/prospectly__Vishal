import { Injectable } from "@nestjs/common";
import type {
  ConnectorEarningListResponse,
  ConnectorEarningStatsResponse,
  ConnectorEarningDetailResponse,
} from "./connector-earning.response";
import { EarningListService } from "./services/earning-list.service";
import { EarningStatsService } from "./services/earning-stats.service";
import { EarningDetailService } from "./services/earning-detail.service";
import { ConnectorEarningQueryDto } from "./connector-earning.dto";

/**
 * Thin orchestrator that forwards each endpoint to its dedicated sub-service.
 * Business logic lives in the sub-services.
 */
@Injectable()
export class ConnectorEarningService {
  constructor(
    private readonly listService: EarningListService,
    private readonly statsService: EarningStatsService,
    private readonly detailService: EarningDetailService
  ) {}

  getEarningList(
    userId: string,
    query: ConnectorEarningQueryDto
  ): Promise<ConnectorEarningListResponse> {
    return this.listService.getList(userId, query);
  }

  getStats(userId: string): Promise<ConnectorEarningStatsResponse> {
    return this.statsService.getStats(userId);
  }

  getDetail(
    id: string,
    userId: string
  ): Promise<ConnectorEarningDetailResponse> {
    return this.detailService.getDetail(id, userId);
  }
}
