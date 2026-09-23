import { Injectable } from "@nestjs/common";
import type {
  SpendingListResponse,
  SpendingStatsResponse,
  SpendingDetailResponse,
} from "./requester-spending.response";
import { SpendingListService } from "./services/spending-list.service";
import { SpendingStatsService } from "./services/spending-stats.service";
import { SpendingDetailService } from "./services/spending-detail.service";
import { RequesterSpendingQueryDto } from "./requester-spending.dto";

@Injectable()
export class RequesterSpendingService {
  constructor(
    private readonly listService: SpendingListService,
    private readonly statsService: SpendingStatsService,
    private readonly detailService: SpendingDetailService
  ) {}

  getSpendingList(
    userId: string,
    query: RequesterSpendingQueryDto
  ): Promise<SpendingListResponse> {
    return this.listService.getList(userId, query);
  }

  getStats(userId: string): Promise<SpendingStatsResponse> {
    return this.statsService.getStats(userId);
  }

  getDetail(id: string, userId: string): Promise<SpendingDetailResponse> {
    return this.detailService.getDetail(id, userId);
  }
}
