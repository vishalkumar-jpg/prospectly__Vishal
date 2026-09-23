import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NotificationPreferencesModule } from "modules/notification-preferences/notification-preferences.module";
import { EmailsService } from "./emails.service";

import { EmailsController } from "./emails.controller";

@Module({
  imports: [ConfigModule, NotificationPreferencesModule],
  controllers: [EmailsController],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
