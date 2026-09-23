import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NotificationPreferencesController } from "./notification-preferences.controller";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { NotificationSendGateService } from "./notification-send-gate.service";
import { UnsubscribeTokenService } from "./unsubscribe-token.service";

@Module({
  imports: [ConfigModule],
  controllers: [NotificationPreferencesController],
  providers: [
    NotificationPreferencesService,
    NotificationSendGateService,
    UnsubscribeTokenService,
  ],
  exports: [
    NotificationPreferencesService,
    NotificationSendGateService,
    UnsubscribeTokenService,
  ],
})
export class NotificationPreferencesModule {}
