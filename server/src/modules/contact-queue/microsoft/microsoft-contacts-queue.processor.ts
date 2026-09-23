import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject, Optional } from "@nestjs/common";
import { Job } from "bullmq";
import { importContacts } from "services/contactImportService";
import { filterDisposableEmails } from "services/emailValidationService";
import { fetchMicrosoftContactPhoto } from "services/microsoft-contacts.service";
import { refreshMicrosoftToken } from "services/microsoft-calendar.service";
import { oauthConfig } from "config/oauth.config";
import { TrustScoreQueueService } from "modules/trust-score-queue/trust-score-queue.service";
import {
  ClaimVerificationService,
  ClaimVerificationQueueService,
} from "modules/global-marketplace/claim";
import { JobPoolMatchQueueService } from "modules/recruitment/job-pool-matches/job-pool-match-queue.service";
import { TypesenseSyncQueueService } from "modules/typesense/sync-queue/typesense-sync-queue.service";
import { CreditImportAllocationQueueService } from "modules/credits/credit-import-allocation-queue.service";
import { S3Service } from "shared/s3.service";
import { toUTC } from "utils/dayjs";
import {
  MicrosoftContactsImportJobData,
  MicrosoftContactsImportJobResult,
} from "./microsoft-contacts-queue.types";
import {
  MICROSOFT_CONTACTS_QUEUE_NAME,
  IMPORT_STATUS,
} from "./constants/microsoft-contacts-queue.constants";
import { ContactsImportService } from "../contacts-import.service";
import { ContactsProviderTokensService } from "../contacts-provider-tokens.service";

// Microsoft Graph API Contact type
interface MicrosoftGraphContact {
  id?: string;
  givenName?: string;
  surname?: string;
  emailAddresses?: Array<{ address?: string; name?: string }>;
  mobilePhone?: string;
  businessPhones?: string[];
  homePhones?: string[];
  companyName?: string;
  jobTitle?: string;
  homeAddress?: {
    city?: string;
    state?: string;
    countryOrRegion?: string;
  };
  businessAddress?: {
    city?: string;
    state?: string;
    countryOrRegion?: string;
  };
  photo?: {
    "@odata.mediaContentType"?: string;
  };
}

interface MicrosoftGraphContactsResponse {
  value?: MicrosoftGraphContact[];
  "@odata.nextLink"?: string;
}

interface TransformedContact {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  company?: string;
  title?: string;
  linkedin?: string;
  city?: string;
  state?: string;
  country?: string;
  profile_photo_url?: string;
  source?: string;
}

@Processor(MICROSOFT_CONTACTS_QUEUE_NAME)
export class MicrosoftContactsQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(MicrosoftContactsQueueProcessor.name);

  constructor(
    @Inject(ContactsImportService)
    private readonly contactsImportService: ContactsImportService,
    @Inject(ContactsProviderTokensService)
    private readonly contactsProviderTokensService: ContactsProviderTokensService,
    @Inject(TrustScoreQueueService)
    private readonly trustScoreQueueService: TrustScoreQueueService,
    @Optional()
    @Inject(S3Service)
    private readonly s3Service: S3Service | null,
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

  /**
   * Upload a contact photo to S3 and return the S3 key
   */
  private async uploadContactPhotoToS3(
    userId: string,
    contactId: string,
    photoBuffer: Buffer,
    mimeType: string
  ): Promise<string | null> {
    if (!this.s3Service?.isS3Available()) {
      return null;
    }

    try {
      const extension = mimeType.includes("png") ? "png" : "jpg";
      const key = `contacts/${userId}/${contactId}.${extension}`;
      await this.s3Service.uploadBuffer(key, photoBuffer, mimeType);
      return key;
    } catch (error) {
      this.logger.warn(
        `Failed to upload photo to S3 for contact ${contactId}: ${error}`
      );
      return null;
    }
  }

  /**
   * Helper to perform Microsoft token refresh
   */
  private async performTokenRefresh(
    refreshToken: string,
    tokenId: string,
    userId: string
  ): Promise<string | null> {
    this.logger.log(`Attempting Microsoft token refresh for user ${userId}...`);
    try {
      const newTokens = await refreshMicrosoftToken(refreshToken);

      if (!newTokens.access_token) {
        this.logger.error(
          `Empty access token from Microsoft refresh for user ${userId}, tokenId: ${tokenId}`
        );
        throw new Error("Empty access token from Microsoft refresh");
      }

      // Update tokens in DB
      await this.contactsProviderTokensService.updateTokens(tokenId, {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || refreshToken || undefined,
        tokenExpiresAt: newTokens.expiry_date
          ? toUTC(newTokens.expiry_date)
          : undefined,
      });

      this.logger.log(`Token refresh successful.`);
      return newTokens.access_token;
    } catch (refreshError) {
      const refreshErrorMsg =
        refreshError instanceof Error
          ? refreshError.message
          : String(refreshError);
      this.logger.error(
        `Token refresh failed for user ${userId}: ${refreshErrorMsg}`
      );

      try {
        await this.contactsProviderTokensService.deactivateTokenById(tokenId);
      } catch (deactivateError) {
        this.logger.error(
          `Failed to deactivate token ${tokenId}: ${deactivateError instanceof Error ? deactivateError.message : String(deactivateError)}`
        );
      }

      throw new Error(
        `Authentication failed and token refresh failed: ${refreshErrorMsg}`
      );
    }
  }

  async process(
    job: Job<MicrosoftContactsImportJobData>
  ): Promise<MicrosoftContactsImportJobResult> {
    const { data, id } = job;
    const { userId, integrationId } = data;

    // integrationId is now the import record ID from contacts_imports table
    const importRecordId = integrationId;

    this.logger.log(
      `Processing Microsoft Contacts import job ${id} for user ${userId}, import record ${importRecordId}`
    );

    try {
      // Update status to processing (record already created in callback or resync)
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

      // Get Microsoft tokens from contacts_provider_tokens table using tokenId
      const tokens = await this.contactsProviderTokensService.getTokensById(
        importRecord.tokenId
      );

      if (!tokens) {
        throw new Error("Microsoft tokens not found for token record");
      }

      // We maintain the current access token to use across calls
      let currentAccessToken = tokens.accessToken;
      const { refreshToken, tokenExpiresAt } = tokens;

      // Check for token expiration or decryption failure (empty token)
      const isExpired =
        tokenExpiresAt &&
        toUTC(tokenExpiresAt) <= toUTC(toUTC().valueOf() + 30000); // 30s buffer
      if ((!currentAccessToken || isExpired) && refreshToken) {
        this.logger.warn(
          `Token is ${
            !currentAccessToken ? "missing (decryption failed)" : "expired"
          }. Performing preemptive refresh...`
        );
        const refreshedToken = await this.performTokenRefresh(
          refreshToken,
          importRecord.tokenId,
          userId
        );
        if (refreshedToken) {
          currentAccessToken = refreshedToken;
        }
      }

      // Fetch contacts from Microsoft Graph API
      const allContacts: TransformedContact[] = [];
      // Track contacts with photos for later fetching (microsoftId -> index in allContacts)
      const contactsWithPhotos: Map<string, number> = new Map();

      try {
        this.logger.log("Fetching contacts from Microsoft Graph API...");

        // Microsoft Graph API uses pagination with @odata.nextLink
        let nextLink: string | null = null;
        let pageCount = 0;
        const maxPages = 100; // Safety limit to prevent infinite loops

        do {
          const url = nextLink
            ? nextLink
            : `${oauthConfig.microsoft.graphApiBaseUrl}/me/contacts?$top=999`;

          let contactsResponse: Response;

          // Wrap fetch in try-catch to handle network error or auth issue
          try {
            contactsResponse = await fetch(url, {
              headers: {
                Authorization: `Bearer ${currentAccessToken}`,
              },
            });

            // Check for 401 Unauthorized
            if (contactsResponse.status === 401 && refreshToken) {
              this.logger.warn(
                `Unauthorized (401) fetching Microsoft contacts. Attempting token refresh...`
              );

              const refreshedToken = await this.performTokenRefresh(
                refreshToken,
                importRecord.tokenId,
                userId
              );

              if (refreshedToken) {
                // Update local token
                currentAccessToken = refreshedToken;

                this.logger.log(`Retrying request...`);

                // Retry the request with new token
                contactsResponse = await fetch(url, {
                  headers: {
                    Authorization: `Bearer ${currentAccessToken}`,
                  },
                });
              }
            }
          } catch (error) {
            this.logger.error(
              `Failed to fetch contacts from Microsoft: ${error}`
            );
            throw error;
          }

          if (!contactsResponse.ok) {
            const errorText = await contactsResponse.text();
            throw new Error(
              `Failed to fetch contacts from Microsoft: ${contactsResponse.status} ${errorText}`
            );
          }

          const contactsData =
            (await contactsResponse.json()) as MicrosoftGraphContactsResponse;

          if (contactsData.value && contactsData.value.length > 0) {
            // Transform Microsoft contacts to our format
            for (const contact of contactsData.value) {
              const email = contact.emailAddresses?.[0]?.address || null;
              const phone =
                contact.mobilePhone ||
                contact.businessPhones?.[0] ||
                contact.homePhones?.[0] ||
                null;
              const givenName = contact.givenName || null;
              const surname = contact.surname || null;
              const company = contact.companyName || null;
              const title = contact.jobTitle || null;
              const city =
                contact.homeAddress?.city ||
                contact.businessAddress?.city ||
                null;
              const state =
                contact.homeAddress?.state ||
                contact.businessAddress?.state ||
                null;
              const country =
                contact.homeAddress?.countryOrRegion ||
                contact.businessAddress?.countryOrRegion ||
                null;
              const hasPhoto = !!contact.id;

              // Require email or phone (at least one identifier)
              if (!email && !phone) {
                continue;
              }

              const transformedContact: TransformedContact = {
                first_name:
                  givenName || (email ? email.split("@")[0] : undefined),
                last_name: surname,
                email: email || undefined,
                phone_number: phone || undefined,
                company,
                title,
                linkedin: null,
                city,
                state,
                country,
                profile_photo_url: undefined,
                source: "microsoft_import",
              };

              const contactIndex = allContacts.length;
              allContacts.push(transformedContact);

              // Track contacts for photo fetching; we'll ignore 404s
              if (hasPhoto && contact.id) {
                contactsWithPhotos.set(contact.id, contactIndex);
              }
            }
          }

          // Check for next page
          nextLink = contactsData["@odata.nextLink"] || null;
          pageCount++;

          if (pageCount >= maxPages) {
            this.logger.warn(
              `Reached maximum page limit (${maxPages}), stopping pagination`
            );
            break;
          }
        } while (nextLink);

        this.logger.log(
          `Fetched ${allContacts.length} contacts from Microsoft Graph API (${pageCount} pages)`
        );

        // Fetch and upload photos for contacts that have them
        if (contactsWithPhotos.size > 0 && this.s3Service?.isS3Available()) {
          this.logger.log(
            `Fetching photos for ${contactsWithPhotos.size} contacts...`
          );

          let photosProcessed = 0;
          let photosUploaded = 0;

          // Process photos in batches to avoid overwhelming the API
          const batchSize = 10;
          const contactIds = Array.from(contactsWithPhotos.keys());

          for (let i = 0; i < contactIds.length; i += batchSize) {
            const batch = contactIds.slice(i, i + batchSize);

            await Promise.all(
              batch.map(async (microsoftContactId) => {
                const contactIndex = contactsWithPhotos.get(microsoftContactId);
                if (contactIndex === undefined) return;

                // For photo fetching we also need to handle potential 401s, though less critical
                // For simplicity, we'll try/catch individually and just log for now
                try {
                  const photoData = await fetchMicrosoftContactPhoto(
                    currentAccessToken, // Use potentially updated token
                    microsoftContactId,
                    this.logger
                  );

                  if (photoData) {
                    const s3Key = await this.uploadContactPhotoToS3(
                      userId,
                      microsoftContactId,
                      photoData.buffer,
                      photoData.mimeType
                    );

                    if (s3Key) {
                      allContacts[contactIndex].profile_photo_url = s3Key;
                      photosUploaded++;
                    }
                  }
                } catch (e) {
                  this.logger.error(
                    `Failed to fetch photo for contact ${microsoftContactId}: ${e}`
                  );
                }
                photosProcessed++;
              })
            );
          }

          this.logger.log(
            `Processed ${photosProcessed} photos, uploaded ${photosUploaded} to S3`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `Failed to fetch contacts from Microsoft Graph API: ${errorMessage}`
        );
        throw error;
      }

      if (allContacts.length === 0) {
        this.logger.warn("No contacts found");
      }

      // Filter out contacts with disposable emails before importing
      const { filtered: validContacts, filteredCount } =
        await filterDisposableEmails(allContacts);

      if (filteredCount > 0) {
        this.logger.log(
          `Filtered out ${filteredCount} contacts with disposable email addresses`
        );
      }

      // Import all contacts using centralized import service
      // The import service will handle deduplication
      const importResult = await importContacts(validContacts, {
        userId,
        source: "microsoft_import",
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

      this.logger.log(
        `Microsoft Contacts import completed: ${importResult.imported} imported, ${importResult.duplicates} duplicates, ${importResult.errors} errors`
      );

      try {
        await this.creditImportAllocationQueueService?.enqueueAfterImportCompleted(
          importRecordId
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue credit allocation for Microsoft import: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }

      // Trigger trust score calculation for successful import (including duplicates)
      // Duplicates also create contact_import_snapshots which count toward credits
      if (importResult.imported > 0 || importResult.duplicates > 0) {
        try {
          await this.trustScoreQueueService.enqueueTrustScoreEvent(
            userId,
            "microsoft_contact_import",
            { contactCount: importResult.imported + importResult.duplicates }
          );
        } catch (error) {
          this.logger.error(
            `Failed to queue trust score event for Microsoft contact import: ${error instanceof Error ? error.message : "Unknown error"}`
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
            "microsoft_import"
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
        totalFetched: allContacts.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Microsoft Contacts import job ${id} failed: ${errorMessage}`
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
  onCompleted(job: Job<MicrosoftContactsImportJobData>) {
    this.logger.log(
      `Microsoft Contacts import job ${job.id} completed successfully`
    );
    // Disabled: job matching on contact import to avoid unnecessary Gemini API calls
    // this.jobPoolMatchQueueService
    //   ?.queueContactMatchCompute(job.data.userId)
    //   .catch((error) => {
    //     this.logger.error(
    //       `Failed to queue job pool match compute after Microsoft import: ${error instanceof Error ? error.message : "Unknown error"}`
    //     );
    //   });
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<MicrosoftContactsImportJobData>, error: Error) {
    this.logger.error(
      `Microsoft Contacts import job ${job.id} failed: ${error.message}`
    );
  }
}
