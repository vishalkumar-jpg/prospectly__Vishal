import { Module } from "@nestjs/common";
import { PresignedService } from "./presigned.service";
import { PresignedController } from "./presigned.controller";

@Module({
  controllers: [PresignedController],
  providers: [PresignedService],
  exports: [PresignedService],
})
export class PreSignedModule {}
