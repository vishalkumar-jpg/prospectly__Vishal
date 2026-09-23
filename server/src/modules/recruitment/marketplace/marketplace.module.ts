import { Module } from "@nestjs/common";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceQueryService } from "./services";
import { RecruitmentFeeConfigModule } from "../fee-config/recruitment-fee-config.module";

@Module({
  imports: [RecruitmentFeeConfigModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceQueryService],
})
export class MarketplaceModule {}
