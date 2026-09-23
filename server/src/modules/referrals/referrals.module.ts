import { forwardRef, Module } from "@nestjs/common";
import { ReferralsService } from "./referrals.service";
import { ReferralsController } from "./referrals.controller";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { InvitesModule } from "../invites/invites.module";

@Module({
  imports: [SubscriptionsModule, forwardRef(() => InvitesModule)],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
