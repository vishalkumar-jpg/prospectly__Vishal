import { Module, forwardRef } from "@nestjs/common";
import { SystemConfigurationModule } from "modules/system-configuration/system-configuration.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { AccountDeletionService } from "./account-deletion.service";
import { AccountDeletionQueueModule } from "./account-deletion-queue.module";

@Module({
  imports: [
    forwardRef(() => StripeModule),
    SystemConfigurationModule,
    AccountDeletionQueueModule,
  ],
  providers: [AccountDeletionService],
  exports: [AccountDeletionService],
})
export class AccountDeletionModule {}
