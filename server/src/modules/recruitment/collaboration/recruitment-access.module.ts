import { Global, Module } from "@nestjs/common";
import { DatabaseModule } from "database/database.module";
import { RecruitmentAccessService } from "./services/recruitment-access.service";

/** Shared job-access resolver — no notification/collaboration deps (safe for worker + email logs). */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [RecruitmentAccessService],
  exports: [RecruitmentAccessService],
})
export class RecruitmentAccessModule {}
