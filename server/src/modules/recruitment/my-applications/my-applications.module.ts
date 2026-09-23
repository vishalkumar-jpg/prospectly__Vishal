import { Module } from "@nestjs/common";
import { MyApplicationsController } from "./my-applications.controller";
import { MyApplicationsService } from "./my-applications.service";
import { CandidateEvaluationModule } from "../candidate-evaluation/candidate-evaluation.module";

@Module({
  imports: [CandidateEvaluationModule],
  controllers: [MyApplicationsController],
  providers: [MyApplicationsService],
})
export class MyApplicationsModule {}
