import {
  Injectable,
  Logger,
  Inject,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { MarketplaceShareService } from "./marketplace-share.service";
import { MarketplaceClaimVerifyService } from "./marketplace-claim-verify.service";
import { VerifyClaimDto } from "../dto/claim-request.dto";

@Injectable()
export class MarketplaceClaimService {
  private readonly logger = new Logger(MarketplaceClaimService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly shareService: MarketplaceShareService,
    private readonly verifyService: MarketplaceClaimVerifyService
  ) {}

  // async startClaim(userId: string, dto: StartClaimDto) {
  //   const { requestId, sharerCode } = dto;

  //   const share = await this.shareService.getShareByCode(sharerCode);
  //   if (!share) {
  //     throw new NotFoundException(MARKETPLACE_MESSAGES.ERROR.SHARE_NOT_FOUND);
  //   }

  //   const [introRequest] = await this.db
  //     .select()
  //     .from(schema.introductionRequests)
  //     .where(
  //       and(
  //         eq(schema.introductionRequests.id, requestId),
  //         eq(schema.introductionRequests.isMarketplaceVisible, true)
  //       )
  //     )
  //     .limit(1);

  //   if (!introRequest) {
  //     throw new NotFoundException(MARKETPLACE_MESSAGES.ERROR.REQUEST_NOT_FOUND);
  //   }

  //   // Check if request is already claimed
  //   const [existingClaim] = await this.db
  //     .select()
  //     .from(schema.marketplaceClaims)
  //     .where(
  //       and(
  //         eq(schema.marketplaceClaims.introductionRequestId, requestId),
  //         eq(schema.marketplaceClaims.status, "completed")
  //       )
  //     )
  //     .limit(1);

  //   if (existingClaim) {
  //     throw new BadRequestException(MARKETPLACE_MESSAGES.ERROR.ALREADY_CLAIMED);
  //   }

  //   if (introRequest.requesterId === userId) {
  //     throw new BadRequestException(
  //       MARKETPLACE_MESSAGES.ERROR.CANNOT_CLAIM_OWN
  //     );
  //   }

  //   // Check if user already has a pending claim for this request
  //   const [existingUserClaim] = await this.db
  //     .select()
  //     .from(schema.marketplaceClaims)
  //     .where(
  //       and(
  //         eq(schema.marketplaceClaims.introductionRequestId, requestId),
  //         eq(schema.marketplaceClaims.claimerId, userId)
  //       )
  //     )
  //     .limit(1);

  //   if (existingUserClaim) {
  //     // Return existing claim if already started
  //     return {
  //       claimId: existingUserClaim.id,
  //       status: existingUserClaim.status,
  //       message: MARKETPLACE_MESSAGES.INFO.CLAIM_STARTED,
  //     };
  //   }

  //   // Create marketplace claim with verification tracking fields initialized
  //   const [claim] = await this.db
  //     .insert(schema.marketplaceClaims)
  //     .values({
  //       introductionRequestId: requestId,
  //       claimerId: userId,
  //       sharerCode,
  //       sharerId: share.sharerId,
  //       status: "pending",
  //       sourcesChecked: [], // Initialize verification tracking
  //     })
  //     .returning();

  //   return {
  //     claimId: claim.id,
  //     status: claim.status,
  //     message: MARKETPLACE_MESSAGES.INFO.CLAIM_STARTED,
  //   };
  // }

  // Delegate to verify service
  async verifyClaim(userId: string, dto: VerifyClaimDto) {
    return this.verifyService.verifyClaim(userId, dto);
  }

  async completeClaim(userId: string, claimId: string) {
    return this.verifyService.completeClaim(userId, claimId);
  }

  async getUserClaims(userId: string, page = 1, limit = 20) {
    return this.verifyService.getUserClaims(userId, page, limit);
  }

  async getClaimStatus(userId: string, claimId: string) {
    return this.verifyService.getClaimStatus(userId, claimId);
  }
}
