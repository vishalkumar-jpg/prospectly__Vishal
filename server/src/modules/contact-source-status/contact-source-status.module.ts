import { Module, forwardRef } from "@nestjs/common";
import { ContactQueueModule } from "modules/contact-queue/contact-queue.module";
import { ContactSourceStatusController } from "./contact-source-status.controller";
import { ContactSourceStatusService } from "./contact-source-status.service";

/**
 * Module for contact source status features
 * Provides API for checking connection status and contact counts
 * for Google, Microsoft, and Apple contact sources
 */
@Module({
  imports: [forwardRef(() => ContactQueueModule)],
  controllers: [ContactSourceStatusController],
  providers: [ContactSourceStatusService],
  exports: [ContactSourceStatusService],
})
export class ContactSourceStatusModule {}
