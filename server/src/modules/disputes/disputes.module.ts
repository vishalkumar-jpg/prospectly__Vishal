import { Module } from "@nestjs/common";
import { DisputesController } from "./disputes.controller";
import { DisputesService } from "./disputes.service";
import { DisputesValidateService } from "./disputes-validate.service";

@Module({
  controllers: [DisputesController],
  providers: [DisputesService, DisputesValidateService],
  exports: [DisputesService],
})
export class DisputesModule {}
