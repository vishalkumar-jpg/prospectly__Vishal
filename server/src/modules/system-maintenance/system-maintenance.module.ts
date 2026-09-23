import { Module } from "@nestjs/common";
import { DatabaseModule } from "database/database.module";
import { SystemMaintenanceController } from "./system-maintenance.controller";
import { SystemMaintenanceService } from "./system-maintenance.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SystemMaintenanceController],
  providers: [SystemMaintenanceService],
  exports: [SystemMaintenanceService],
})
export class SystemMaintenanceModule {}
