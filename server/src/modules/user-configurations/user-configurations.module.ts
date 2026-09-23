import { Module } from "@nestjs/common";
import { UserConfigurationsService } from "./user-configurations.service";

@Module({
  providers: [UserConfigurationsService],
  exports: [UserConfigurationsService],
})
export class UserConfigurationsModule {}
