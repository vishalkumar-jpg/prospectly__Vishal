import { Injectable } from "@nestjs/common";
import { ARCHIVE_SUCCESS_MESSAGE } from "./requester-archive.constants";
import { ArchiveRequesterIntroductionDto } from "./requester-archive.dto";
import { RequesterArchiveValidationService } from "./requester-archive-validation.service";
import { RequesterArchivePersistenceService } from "./requester-archive-persistence.service";
import { RequesterArchiveRefundService } from "./requester-archive-refund.service";

@Injectable()
export class RequesterArchiveService {
  constructor(
    private readonly validationService: RequesterArchiveValidationService,
    private readonly persistenceService: RequesterArchivePersistenceService,
    private readonly refundService: RequesterArchiveRefundService
  ) {}

  async archiveIntroduction(
    userId: string,
    requestId: string,
    dto: ArchiveRequesterIntroductionDto
  ): Promise<{ success: boolean; message: string }> {
    await this.validationService.assertCanArchive(userId, requestId);
    await this.persistenceService.archiveRequest(requestId, dto);
    await this.refundService.processRefundAfterArchive(
      requestId,
      userId,
      dto.archiveReason
    );

    return {
      success: true,
      message: ARCHIVE_SUCCESS_MESSAGE,
    };
  }
}
