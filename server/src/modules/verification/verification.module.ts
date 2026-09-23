import { forwardRef, Module } from "@nestjs/common";
import { VerificationService } from "./verification.service";
import { InvitesModule } from "../invites/invites.module";

@Module({
  imports: [forwardRef(() => InvitesModule)],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
