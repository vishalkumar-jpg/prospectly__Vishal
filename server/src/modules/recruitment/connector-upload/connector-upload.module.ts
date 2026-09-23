import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "database/database.module";
import { ConnectorUploadController } from "./connector-upload.controller";
import { ConnectorUploadService } from "./services/connector-upload.service";
import { ConnectorUploadReplaceService } from "./services/connector-upload-replace.service";
import { ConnectorUploadReplaceTargetService } from "./services/connector-upload-replace-target.service";
import { ConnectorUploadReplaceEligibilityService } from "./services/connector-upload-replace-eligibility.service";
import { ConnectorUploadReplacePersistService } from "./services/connector-upload-replace-persist.service";
import { ConnectorUploadContactService } from "./services/connector-upload-contact.service";
import { ConnectorUploadQueueService } from "./connector-upload-queue.service";
import {
  CONNECTOR_UPLOAD_QUEUE_NAME,
  CONNECTOR_UPLOAD_QUEUE_CONFIG,
} from "./connector-upload.constants";
import { CandidateEvaluationModule } from "../candidate-evaluation/candidate-evaluation.module";
import { ResumeExtractionModule } from "../resume-extraction/resume-extraction.module";
import { JobExtractionModule } from "../job-extraction/job-extraction.module";
import { ResumeIndexingQueueModule } from "../resume-indexing/resume-indexing-queue.module";

@Module({
  imports: [
    DatabaseModule,
    JobExtractionModule,
    ResumeExtractionModule,
    CandidateEvaluationModule,
    ResumeIndexingQueueModule,
    BullModule.registerQueue({
      name: CONNECTOR_UPLOAD_QUEUE_NAME,
      defaultJobOptions: CONNECTOR_UPLOAD_QUEUE_CONFIG.defaultJobOptions,
    }),
  ],
  controllers: [ConnectorUploadController],
  providers: [
    ConnectorUploadService,
    ConnectorUploadReplaceService,
    ConnectorUploadReplaceTargetService,
    ConnectorUploadReplaceEligibilityService,
    ConnectorUploadReplacePersistService,
    ConnectorUploadContactService,
    ConnectorUploadQueueService,
  ],
  exports: [ConnectorUploadQueueService],
})
export class ConnectorUploadModule {}
