import { Module } from "@nestjs/common";
import { GlobalMarketplaceModule } from "modules/global-marketplace/global-marketplace.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [GlobalMarketplaceModule, ProfilesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
