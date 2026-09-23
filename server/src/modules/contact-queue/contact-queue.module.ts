import { Module } from "@nestjs/common";
import { GoogleContactsQueueModule } from "./google/google-contacts-queue.module";
import { MicrosoftContactsQueueModule } from "./microsoft/microsoft-contacts-queue.module";
import { AppleContactsQueueModule } from "./apple/apple-contacts-queue.module";
import { LinkedInContactsQueueModule } from "./linkedin/linkedin-contacts-queue.module";

@Module({
  imports: [
    GoogleContactsQueueModule,
    MicrosoftContactsQueueModule,
    AppleContactsQueueModule,
    LinkedInContactsQueueModule,
  ],
  exports: [
    GoogleContactsQueueModule,
    MicrosoftContactsQueueModule,
    AppleContactsQueueModule,
    LinkedInContactsQueueModule,
  ],
})
export class ContactQueueModule {}
