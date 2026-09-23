import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject, Optional } from "@nestjs/common";
import { Job } from "bullmq";
import { fetchiCloudContacts } from "services/apple-contacts.service";
import { importContacts } from "services/contactImportService";
import { filterDisposableEmails } from "services/emailValidationService";
import { TrustScoreQueueService } from "modules/trust-score-queue/trust-score-queue.service";
import {
  ClaimVerificationService,
  ClaimVerificationQueueService,
} from "modules/global-marketplace/claim";
import { JobPoolMatchQueueService } from "modules/recruitment/job-pool-matches/job-pool-match-queue.service";
import { TypesenseSyncQueueService } from "modules/typesense/sync-queue/typesense-sync-queue.service";
import { CreditImportAllocationQueueService } from "modules/credits/credit-import-allocation-queue.service";
import { toUTC } from "utils/dayjs";
import {
  AppleContactsImportJobData,
  AppleContactsImportJobResult,
} from "./apple-contacts-queue.types";
import {
  APPLE_CONTACTS_QUEUE_NAME,
  IMPORT_STATUS,
} from "./constants/apple-contacts-queue.constants";
import { ContactsImportService } from "../contacts-import.service";
import { ContactsProviderTokensService } from "../contacts-provider-tokens.service";

// Helper function to decode HTML entities and clean text
function cleanText(text: string): string {
  if (!text) return text;

  // Remove HTML entities for common characters
  const cleaned = text
    .replace(/&#13;/g, "") // Carriage return
    .replace(/&#10;/g, "") // Line feed
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "") // Remove actual carriage returns
    .replace(/\n/g, "") // Remove line feeds
    .trim();

  return cleaned;
}

interface TransformedContact {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  company?: string;
  title?: string;
  city?: string;
  state?: string;
  country?: string;
  profile_photo_url?: string;
}

@Processor(APPLE_CONTACTS_QUEUE_NAME)
export class AppleContactsQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(AppleContactsQueueProcessor.name);

  constructor(
    @Inject(ContactsImportService)
    private readonly contactsImportService: ContactsImportService,
    @Inject(ContactsProviderTokensService)
    private readonly contactsProviderTokensService: ContactsProviderTokensService,
    @Inject(TrustScoreQueueService)
    private readonly trustScoreQueueService: TrustScoreQueueService,
    @Optional()
    @Inject(ClaimVerificationService)
    private readonly claimVerificationService: ClaimVerificationService | null,
    @Optional()
    @Inject(ClaimVerificationQueueService)
    private readonly claimVerificationQueueService: ClaimVerificationQueueService | null,
    @Optional()
    @Inject(JobPoolMatchQueueService)
    private readonly jobPoolMatchQueueService: JobPoolMatchQueueService | null,
    @Optional()
    @Inject(TypesenseSyncQueueService)
    private readonly typesenseSyncQueueService: TypesenseSyncQueueService | null,
    @Optional()
    @Inject(CreditImportAllocationQueueService)
    private readonly creditImportAllocationQueueService: CreditImportAllocationQueueService | null
  ) {
    super();
  }

  async process(
    job: Job<AppleContactsImportJobData>
  ): Promise<AppleContactsImportJobResult> {
    const { data, id } = job;
    const { userId, integrationId } = data;

    // integrationId is now the import record ID from contacts_imports table
    const importRecordId = integrationId;

    try {
      // Update status to processing (record already created in connect or resync)
      await this.contactsImportService.updateContactsImport(importRecordId, {
        status: IMPORT_STATUS.PROCESSING,
        startedAt: toUTC(),
      });

      // Get import record by ID to find tokenId
      const importRecord =
        await this.contactsImportService.getContactsImportById(importRecordId);

      if (!importRecord || !importRecord.tokenId) {
        throw new Error(
          "Import record not found or missing tokenId for import record"
        );
      }

      // Get Apple credentials from contacts_provider_tokens table using tokenId
      const tokens = await this.contactsProviderTokensService.getTokensById(
        importRecord.tokenId
      );

      if (!tokens) {
        throw new Error("Apple credentials not found for token record");
      }

      // For Apple, accessToken contains the encrypted app-specific password
      // and email is stored in the email field
      const appPassword = tokens.accessToken;
      const appleId = tokens.email;

      if (!appleId || !appPassword) {
        throw new Error("Apple ID or app-specific password not found");
      }

      // Fetch contacts from iCloud using CardDAV
      let iCloudContacts;
      try {
        iCloudContacts = await fetchiCloudContacts(appleId, appPassword);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `Failed to fetch contacts from Apple iCloud: ${errorMessage}`
        );

        // Check if it's an authentication error (401/403)
        if (
          errorMessage.includes("401") ||
          errorMessage.includes("403") ||
          errorMessage.includes("authenticate") ||
          errorMessage.includes("password")
        ) {
          // Mark tokens as inactive if authentication fails
          try {
            await this.contactsProviderTokensService.deactivateTokenById(
              importRecord.tokenId
            );
          } catch (deactivateError) {
            this.logger.error(
              `Failed to deactivate tokens: ${deactivateError instanceof Error ? deactivateError.message : "Unknown error"}`
            );
          }
          throw new Error(
            "Invalid Apple ID or App-Specific Password. Please verify your credentials."
          );
        }

        throw error;
      }

      // Transform iCloud contacts to ContactImportRow format
      const contactRows: TransformedContact[] = iCloudContacts
        .map((contact) => {
          // Skip contacts without email or phone (require at least one identifier)
          if (!contact.email && !contact.phone) {
            return null;
          }

          // Split name into first and last name and clean thoroughly
          const nameParts = cleanText(contact.name || "")
            .split(" ")
            .filter((part) => part.trim());
          const [firstNamePart, ...lastNameParts] = nameParts;
          const firstName = cleanText(firstNamePart || "");
          const lastName = cleanText(lastNameParts.join(" "));

          // Require first_name (derived from name)
          if (!firstName) {
            return null;
          }

          const email = cleanText(contact.email || "");
          const phoneNumber = cleanText(contact.phone || "");

          return {
            first_name: firstName,
            last_name: lastName,
            email: email || undefined,
            phone_number: phoneNumber || undefined,
            company: contact.company || undefined,
            title: contact.title || undefined,
            city: contact.city || undefined,
            state: contact.state || undefined,
            country: contact.country || undefined,
            profile_photo_url: contact.photoUrl || undefined,
          };
        })
        .filter((contact): contact is TransformedContact => contact !== null);

      // Filter out contacts with disposable emails before importing
      const { filtered: validContacts } =
        await filterDisposableEmails(contactRows);

      // Import all contacts using centralized import service
      // The import service will handle deduplication
      const importResult = await importContacts(validContacts, {
        userId,
        source: "apple_import",
      });

      // Update import record with results
      // totalFetched excludes filtered contacts (disposable emails)
      await this.contactsImportService.updateContactsImport(importRecordId, {
        status: IMPORT_STATUS.COMPLETED,
        imported: importResult.imported,
        failed: importResult.errors,
        duplicates: importResult.duplicates,
        totalFetched: validContacts.length,
        completedAt: toUTC(),
      });

      try {
        await this.creditImportAllocationQueueService?.enqueueAfterImportCompleted(
          importRecordId
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue credit allocation for Apple import: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }

      // Trigger trust score calculation for successful import (including duplicates)
      // Duplicates also create contact_import_snapshots which count toward credits
      if (importResult.imported > 0 || importResult.duplicates > 0) {
        try {
          await this.trustScoreQueueService.enqueueTrustScoreEvent(
            userId,
            "apple_contact_import",
            { contactCount: importResult.imported + importResult.duplicates }
          );
        } catch (error) {
          this.logger.error(
            `Failed to queue trust score event for Apple contact import: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // Sync imported + updated contacts to Typesense for search
      const allContactIdsToSync = [
        ...importResult.importedContactIds,
        ...importResult.updatedContactIds,
      ];
      if (allContactIdsToSync.length > 0) {
        try {
          await this.typesenseSyncQueueService?.enqueueSyncJob(
            allContactIdsToSync.map(String),
            userId,
            "apple_import"
          );
        } catch (error) {
          this.logger.error(
            `Failed to queue typesense sync: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // NOTE: Automatic claim verification removed - now triggered manually by user

      return {
        success: true,
        userId,
        integrationId: importRecordId,
        imported: importResult.imported,
        failed: importResult.errors,
        duplicates: importResult.duplicates,
        totalFetched: contactRows.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Apple Contacts import job ${id} failed: ${errorMessage}`
      );

      // Update import record with error
      if (importRecordId) {
        await this.contactsImportService.updateContactsImport(importRecordId, {
          status: IMPORT_STATUS.FAILED,
          errorMessage,
          completedAt: toUTC(),
        });
      }

      throw error;
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<AppleContactsImportJobData>) {
    this.logger.log(
      `Apple Contacts import job ${job.id} completed successfully`
    );
    // Disabled: job matching on contact import to avoid unnecessary Gemini API calls
    // this.jobPoolMatchQueueService
    //   ?.queueContactMatchCompute(job.data.userId)
    //   .catch((error) => {
    //     this.logger.error(
    //       `Failed to queue job pool match compute after Apple import: ${error instanceof Error ? error.message : "Unknown error"}`
    //     );
    //   });
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<AppleContactsImportJobData>, error: Error) {
    this.logger.error(
      `Apple Contacts import job ${job.id} failed: ${error.message}`
    );
  }
}
