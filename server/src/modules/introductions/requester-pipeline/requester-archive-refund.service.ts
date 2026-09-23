import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { RefundsService } from "../refunds/refunds.service";
import {
  FAILURE_STAGES,
  REFUND_INITIATOR,
  REFUNDS_MESSAGES,
} from "../refunds/refunds.constants";

@Injectable()
export class RequesterArchiveRefundService {
  private readonly logger = new Logger(RequesterArchiveRefundService.name);

  constructor(private readonly refundsService: RefundsService) {}

  async processRefundAfterArchive(
    requestId: string,
    userId: string,
    archiveReason: string
  ): Promise<void> {
    try {
      await this.refundsService.processRefundForUnfulfillment(
        requestId,
        FAILURE_STAGES.INTRO_SENT,
        REFUND_INITIATOR.REQUESTER,
        userId,
        archiveReason
      );
    } catch (error) {
      let msg: string;
      if (error instanceof BadRequestException) {
        msg = error.message;
      } else if (error instanceof Error) {
        msg = error.message;
      } else {
        msg = String(error);
      }
      const isNoTransaction =
        error instanceof BadRequestException &&
        msg === REFUNDS_MESSAGES.ERROR.TRANSACTION_NOT_FOUND;
      if (isNoTransaction) {
        this.logger.warn(
          `REQUESTER_ARCHIVE_REFUND_SERVICE :: processRefundAfterArchive : REFUND : skipped_no_transaction`
        );
      } else {
        const stack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `REQUESTER_ARCHIVE_REFUND_SERVICE :: processRefundAfterArchive : REFUND_FAILED : requestId=${requestId} userId=${userId} : ${msg}`,
          stack
        );
        throw error;
      }
    }
  }
}
