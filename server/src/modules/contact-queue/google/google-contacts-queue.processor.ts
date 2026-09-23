import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject, Optional } from "@nestjs/common";
import { Job } from "bullmq";
import {
  fetchGoogleContacts,
  fetchGoogleOtherContacts,
  fetchGoogleDirectoryContacts,
  transformGoogleContact,
} from "services/google-oauth.service";
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
import { refreshGoogleToken } from "services/google-calendar.service";
import { toUTC, utcDayjs } from "utils/dayjs";
import {
  GoogleContactsImportJobData,
  GoogleContactsImportJobResult,
} from "./google-contacts-queue.types";
import {
  GOOGLE_CONTACTS_QUEUE_NAME,
  IMPORT_STATUS,
} from "./constants/google-contacts-queue.constants";
import { ContactsImportService } from "../contacts-import.service";
import { ContactsProviderTokensService } from "../contacts-provider-tokens.service";

@Processor(GOOGLE_CONTACTS_QUEUE_NAME)
export class GoogleContactsQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(GoogleContactsQueueProcessor.name);

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

  /**
   * Helper to execute an operation with token refresh on 401/403 errors
   */
  private async executeWithTokenRefresh<T>(
    operation: (token: string) => Promise<T>,
    initialAccessToken: string,
    initialRefreshToken: string | undefined | null,
    tokenRecordId: string,
    userId: string,
    initialTokenExpiresAt?: Date | null
  ): Promise<{
    result: T;
    accessToken: string;
    refreshToken: string | undefined | null;
    tokenExpiresAt: Date | undefined | null;
  }> {
    let currentAccessToken = initialAccessToken;
    let currentRefreshToken = initialRefreshToken;
    let currentTokenExpiresAt = initialTokenExpiresAt;

    // Helper to perform refresh
    const performRefresh = async () => {
      if (!currentRefreshToken) return null;

      this.logger.log(`Attempting token refresh for user ${userId}...`);
      try {
        const refreshedTokens = await refreshGoogleToken(currentRefreshToken);

        if (refreshedTokens.access_token) {
          const updatedAccessToken = refreshedTokens.access_token;
          const updatedRefreshToken =
            refreshedTokens.refresh_token || currentRefreshToken || undefined;
          const updatedExpiresAt = refreshedTokens.expiry_date
            ? toUTC(refreshedTokens.expiry_date)
            : undefined;

          // Update in DB
          await this.contactsProviderTokensService.updateTokens(tokenRecordId, {
            accessToken: updatedAccessToken,
            refreshToken: updatedRefreshToken,
            tokenExpiresAt: updatedExpiresAt,
          });

          this.logger.log(`Token refresh successful.`);

          // Update local state for return
          currentAccessToken = updatedAccessToken;
          currentRefreshToken = updatedRefreshToken || null;
          currentTokenExpiresAt = updatedExpiresAt || null;

          return updatedAccessToken;
        }
        return null;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Token refresh failed for user ${userId}: ${errorMsg}`
        );

        // If refresh fails, deactivate the token so UI shows "Reconnect"
        await this.contactsProviderTokensService.deactivateTokenById(
          tokenRecordId
        );
        throw new Error(
          `Authentication failed and token refresh failed: ${errorMsg}`
        );
      }
    };

    // Pre-check: if token is missing (decryption failed) or expired
    const isExpired =
      currentTokenExpiresAt &&
      utcDayjs(currentTokenExpiresAt).isSameOrBefore(
        utcDayjs().add(30, "second")
      ); // 30s buffer
    if ((!currentAccessToken || isExpired) && currentRefreshToken) {
      this.logger.warn(
        `Token is ${!currentAccessToken ? "missing (decryption failed)" : "expired"}. Performing preemptive refresh...`
      );
      await performRefresh();
    }

    try {
      const result = await operation(currentAccessToken);
      return {
        result,
        accessToken: currentAccessToken,
        refreshToken: currentRefreshToken,
        tokenExpiresAt: currentTokenExpiresAt,
      };
    } catch (error: AnyType) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check for auth errors
      const isAuthError =
        errorMessage.includes("401") ||
        errorMessage.includes("403") ||
        errorMessage.toLowerCase().includes("unauthenticated") ||
        errorMessage.toLowerCase().includes("invalid_grant");

      if (isAuthError && currentRefreshToken) {
        this.logger.warn(
          `Auth error encountered (${errorMessage}). Attempting token refresh for user ${userId}...`
        );

        const refreshedToken = await performRefresh();
        if (refreshedToken) {
          this.logger.log(`Retrying operation after refresh...`);
          const result = await operation(refreshedToken);
          return {
            result,
            accessToken: currentAccessToken,
            refreshToken: currentRefreshToken,
            tokenExpiresAt: currentTokenExpiresAt,
          };
        }
      }

      throw error;
    }
  }

  async process(
    job: Job<GoogleContactsImportJobData>
  ): Promise<GoogleContactsImportJobResult> {
    const { data, id } = job;
    const { userId, integrationId } = data;

    // integrationId is now the import record ID from contacts_imports table
    const importRecordId = integrationId;

    this.logger.log(
      `Processing Google Contacts import job ${id} for user ${userId}, import record ${importRecordId}`
    );

    try {
      // Update status to processing (record already created in auth.service or resync)
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

      // Get Google tokens from contacts_provider_tokens table using tokenId
      const tokens = await this.contactsProviderTokensService.getTokensById(
        importRecord.tokenId
      );

      if (!tokens) {
        throw new Error("Google tokens not found for token record");
      }

      // We maintain the current access token to use across calls
      let currentAccessToken = tokens.accessToken;
      let currentRefreshToken = tokens.refreshToken;
      let currentTokenExpiresAt = tokens.tokenExpiresAt;

      // Fetch contacts from all three Google sources
      const allContacts: Array<{
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
      }> = [];

      // 1. Fetch regular contacts (people.connections.list)
      try {
        this.logger.log("Fetching contacts from Google Contacts API...");

        const {
          result: googleContacts,
          accessToken,
          refreshToken,
          tokenExpiresAt,
        } = await this.executeWithTokenRefresh(
          (token) => fetchGoogleContacts(token),
          currentAccessToken,
          currentRefreshToken,
          importRecord.tokenId,
          userId,
          currentTokenExpiresAt
        );

        currentAccessToken = accessToken;
        currentRefreshToken = refreshToken;
        currentTokenExpiresAt = tokenExpiresAt;

        const transformedContacts = googleContacts
          .map(transformGoogleContact)
          .filter((contact) => contact.email || contact.phone_number)
          .map((contact) => ({
            ...contact,
            source: "contacts",
          }));

        allContacts.push(...transformedContacts);

        this.logger.log(
          `Fetched ${googleContacts.length} contacts from Contacts API, ${transformedContacts.length} with email addresses or phone numbers`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `Failed to fetch contacts from Contacts API: ${errorMessage}`
        );
        throw error;
      }

      // 2. Fetch other contacts (people.otherContacts.list)
      try {
        this.logger.log("Fetching other contacts from Google Contacts API...");

        const {
          result: googleOtherContacts,
          accessToken,
          refreshToken,
          tokenExpiresAt,
        } = await this.executeWithTokenRefresh(
          (token) => fetchGoogleOtherContacts(token),
          currentAccessToken,
          currentRefreshToken,
          importRecord.tokenId,
          userId,
          currentTokenExpiresAt
        );

        currentAccessToken = accessToken;
        currentRefreshToken = refreshToken;
        currentTokenExpiresAt = tokenExpiresAt;

        const transformedOtherContacts = googleOtherContacts
          .map(transformGoogleContact)
          .filter((contact) => contact.email || contact.phone_number)
          .map((contact) => ({
            ...contact,
            source: "other_contacts",
          }));

        allContacts.push(...transformedOtherContacts);

        this.logger.log(
          `Fetched ${googleOtherContacts.length} other contacts, ${transformedOtherContacts.length} with email addresses or phone numbers`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `Failed to fetch other contacts: ${errorMessage}. Continuing with other sources...`
        );
        // Don't throw here - other contacts are optional
      }

      // 3. Fetch directory contacts (people.searchDirectoryPeople)
      try {
        this.logger.log(
          "Fetching directory contacts from Google Contacts API..."
        );

        const {
          result: googleDirectoryContacts,
          accessToken,
          refreshToken,
          tokenExpiresAt,
        } = await this.executeWithTokenRefresh(
          (token) => fetchGoogleDirectoryContacts(token),
          currentAccessToken,
          currentRefreshToken,
          importRecord.tokenId,
          userId,
          currentTokenExpiresAt
        );

        currentAccessToken = accessToken;
        currentRefreshToken = refreshToken;
        currentTokenExpiresAt = tokenExpiresAt;

        const transformedDirectoryContacts = googleDirectoryContacts
          .map(transformGoogleContact)
          .filter((contact) => contact.email || contact.phone_number)
          .map((contact) => ({
            ...contact,
            source: "directory",
          }));

        allContacts.push(...transformedDirectoryContacts);

        this.logger.log(
          `Fetched ${googleDirectoryContacts.length} directory contacts, ${transformedDirectoryContacts.length} with email addresses or phone numbers`
        );
      } catch (error: AnyType) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Check for G Suite domain user error (FAILED_PRECONDITION)
        // This is expected for standard Gmail accounts
        const isGSuiteError =
          errorMessage.includes("G Suite domain user") ||
          errorMessage.includes("FAILED_PRECONDITION") ||
          error.response?.data?.error?.status === "FAILED_PRECONDITION" ||
          (error.status === 400 && errorMessage.includes("G Suite"));

        if (isGSuiteError) {
          this.logger.warn(
            "Directory contacts not available (requires G Suite account). Skipping..."
          );
        } else {
          this.logger.error(
            `Failed to fetch directory contacts: ${errorMessage}. Continuing with other sources...`
          );
        }
        // Don't throw here - directory contacts are optional
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
        source: "google_import",
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
        `Google Contacts import completed: ${importResult.imported} imported, ${importResult.duplicates} duplicates, ${importResult.errors} errors`
      );

      try {
        await this.creditImportAllocationQueueService?.enqueueAfterImportCompleted(
          importRecordId
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue credit allocation for Google import: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }

      // Trigger trust score calculation for successful import (including duplicates)
      // Duplicates also create contact_import_snapshots which count toward credits
      if (importResult.imported > 0 || importResult.duplicates > 0) {
        try {
          await this.trustScoreQueueService.enqueueTrustScoreEvent(
            userId,
            "google_contact_import",
            { contactCount: importResult.imported + importResult.duplicates }
          );
        } catch (error) {
          this.logger.error(
            `Failed to queue trust score event for Google contact import: ${error instanceof Error ? error.message : "Unknown error"}`
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
            "google_import"
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
        `Google Contacts import job ${id} failed: ${errorMessage}`
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
  onCompleted(job: Job<GoogleContactsImportJobData>) {
    this.logger.log(
      `Google Contacts import job ${job.id} completed successfully`
    );
    // Disabled: job matching on contact import to avoid unnecessary Gemini API calls
    // this.jobPoolMatchQueueService
    //   ?.queueContactMatchCompute(job.data.userId)
    //   .catch((error) => {
    //     this.logger.error(
    //       `Failed to queue job pool match compute after Google import: ${error instanceof Error ? error.message : "Unknown error"}`
    //     );
    //   });
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<GoogleContactsImportJobData>, error: Error) {
    this.logger.error(
      `Google Contacts import job ${job.id} failed: ${error.message}`
    );
  }
}
