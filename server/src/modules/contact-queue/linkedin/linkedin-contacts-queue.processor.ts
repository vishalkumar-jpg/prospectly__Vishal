import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject, Optional } from "@nestjs/common";
import { Job } from "bullmq";
import { importContacts } from "services/contactImportService";
import { filterDisposableEmails } from "services/emailValidationService";
import { S3Service } from "shared/s3.service";
import { LinkedInCsvProcessorService } from "services/linkedin-csv-processor.service";
import { eq } from "drizzle-orm";
import * as schema from "database/schema";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AnyType } from "types/common";
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
  LINKEDIN_CONTACTS_QUEUE_NAME,
  IMPORT_STATUS,
} from "./constants/linkedin-contacts-queue.constants";
import {
  LinkedInContactsImportJobData,
  LinkedInContactsImportJobResult,
} from "./linkedin-contacts-queue.types";
import { ContactsImportService } from "../contacts-import.service";

@Processor(LINKEDIN_CONTACTS_QUEUE_NAME)
export class LinkedInContactsQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(LinkedInContactsQueueProcessor.name);

  constructor(
    @Inject(ContactsImportService)
    private readonly contactsImportService: ContactsImportService,
    @Inject(S3Service)
    private readonly s3Service: S3Service,
    @Inject(LinkedInCsvProcessorService)
    private readonly csvProcessor: LinkedInCsvProcessorService,
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
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
    job: Job<LinkedInContactsImportJobData>
  ): Promise<LinkedInContactsImportJobResult> {
    const { data, id } = job;
    const { userId, importRecordId, s3Key } = data;

    this.logger.log(
      `Processing LinkedIn Contacts import job ${id} for user ${userId}, import record ${importRecordId}`
    );

    let linkedinImportId: string | null = null;

    try {
      // Update status to processing
      await this.contactsImportService.updateContactsImport(importRecordId, {
        status: IMPORT_STATUS.PROCESSING,
        startedAt: toUTC(),
      });

      // Get linkedin_imports record
      const linkedinImport = await this.db.query.linkedinImports.findFirst({
        where: eq(schema.linkedinImports.importRecordId, importRecordId),
      });

      if (!linkedinImport) {
        throw new Error("LinkedIn import record not found");
      }

      linkedinImportId = linkedinImport.id;

      // Get user's profile for filtering own contacts
      const userProfile = await this.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      const userEmail = userProfile?.email?.toLowerCase().trim() || null;
      const userLinkedInUrl =
        userProfile?.linkedinUrl?.toLowerCase().trim() || null;

      // Update progress: 0-10% - Zip extraction
      await job.updateProgress(5);

      // Download zip from S3
      this.logger.log(`Downloading zip file from S3: ${s3Key}`);
      const zipBuffer = await this.s3Service.downloadLinkedInZip(s3Key);
      this.logger.log(`Downloaded zip file (${zipBuffer.length} bytes)`);

      // Extract zip file
      this.logger.log("Extracting zip file...");
      const extractedFiles = await this.csvProcessor.extractZipFile(zipBuffer);
      this.logger.log(`Extracted ${extractedFiles.size} CSV files from zip`);

      await job.updateProgress(10);

      // Update progress: 10-30% - CSV parsing
      const extractionLog: Record<string, AnyType> = {};
      const processingLog: Record<string, AnyType> = {};

      // Process Profile.csv
      let profileData: Record<string, AnyType> = {};
      let linkedinProfileUrl: string | null = null;

      const profileFile = this.findCsvFile(extractedFiles, "Profile.csv");
      if (profileFile) {
        try {
          const profileRows = await this.csvProcessor.parseCSVFile(profileFile);
          extractionLog.Profile = {
            found: true,
            rowCount: profileRows.length,
          };
          if (profileRows.length > 0) {
            profileData = this.csvProcessor.extractProfileData(profileRows);
            this.logger.log("Extracted profile data from Profile.csv");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.logger.error(`Failed to parse Profile.csv: ${errorMessage}`);
          extractionLog.Profile = {
            found: true,
            rowCount: 0,
            error: errorMessage,
          };
        }
      } else {
        extractionLog.Profile = { found: false };
        this.logger.warn("Profile.csv not found in zip file");
      }

      await job.updateProgress(15);

      // Process Invitations.csv
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

      const invitationsFile = this.findCsvFile(
        extractedFiles,
        "Invitations.csv"
      );
      if (invitationsFile) {
        try {
          const invitationRows =
            await this.csvProcessor.parseCSVFile(invitationsFile);
          extractionLog.Invitations = {
            found: true,
            rowCount: invitationRows.length,
          };

          let invitationContacts = 0;
          for (const row of invitationRows) {
            const { contacts, inviterProfileUrl } =
              this.csvProcessor.transformInvitationsRow(row);

            // Extract user's LinkedIn profile URL from first OUTGOING invitation
            if (
              !linkedinProfileUrl &&
              inviterProfileUrl &&
              row.Direction === "OUTGOING"
            ) {
              linkedinProfileUrl = inviterProfileUrl;
            }

            // Process each contact from both "To" and "From" fields
            for (const contact of contacts) {
              // Filter out user's own contact record
              if (
                this.isUserOwnContact(
                  contact,
                  userEmail,
                  userLinkedInUrl,
                  linkedinProfileUrl
                )
              ) {
                continue;
              }

              allContacts.push({
                ...contact,
                source: "linkedin_invitations",
              });
              invitationContacts++;
            }
          }

          processingLog.Invitations = {
            processed: invitationContacts,
            total: invitationRows.length,
          };
          this.logger.log(
            `Processed ${invitationContacts} contacts from Invitations.csv`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.logger.error(
            `Failed to process Invitations.csv: ${errorMessage}`
          );
          extractionLog.Invitations = {
            found: true,
            rowCount: 0,
            error: errorMessage,
          };
        }
      } else {
        extractionLog.Invitations = { found: false };
        this.logger.warn("Invitations.csv not found in zip file");
      }

      await job.updateProgress(25);

      // Process Connections.csv
      const connectionsFile = this.findCsvFile(
        extractedFiles,
        "Connections.csv"
      );
      if (connectionsFile) {
        try {
          const connectionRows = await this.csvProcessor.parseCSVFile(
            connectionsFile,
            true
          );
          extractionLog.Connections = {
            found: true,
            rowCount: connectionRows.length,
          };

          let connectionContacts = 0;
          for (const row of connectionRows) {
            const contact = this.csvProcessor.transformConnectionsRow(row);

            if (contact) {
              // Filter out user's own contact record
              if (
                this.isUserOwnContact(
                  contact,
                  userEmail,
                  userLinkedInUrl,
                  linkedinProfileUrl
                )
              ) {
                continue;
              }

              allContacts.push({
                ...contact,
                source: "linkedin_connections",
              });
              connectionContacts++;
            }
          }

          processingLog.Connections = {
            processed: connectionContacts,
            total: connectionRows.length,
          };
          this.logger.log(
            `Processed ${connectionContacts} contacts from Connections.csv`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.logger.error(
            `Failed to process Connections.csv: ${errorMessage}`
          );
          extractionLog.Connections = {
            found: true,
            rowCount: 0,
            error: errorMessage,
          };
        }
      } else {
        extractionLog.Connections = { found: false };
        this.logger.warn("Connections.csv not found in zip file");
      }

      await job.updateProgress(30);

      // Process ImportedContacts.csv
      const importedContactsFile = this.findCsvFile(
        extractedFiles,
        "ImportedContacts.csv"
      );
      if (importedContactsFile) {
        try {
          const importedContactRows =
            await this.csvProcessor.parseCSVFile(importedContactsFile);
          extractionLog.ImportedContacts = {
            found: true,
            rowCount: importedContactRows.length,
          };

          let importedContactCount = 0;
          for (const row of importedContactRows) {
            const contact = this.csvProcessor.transformImportedContactsRow(row);
            if (contact) {
              allContacts.push({
                ...contact,
                source: "linkedin_imported",
              });
              importedContactCount++;
            }
          }

          processingLog.ImportedContacts = {
            processed: importedContactCount,
            total: importedContactRows.length,
          };
          this.logger.log(
            `Processed ${importedContactCount} contacts from ImportedContacts.csv`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.logger.error(
            `Failed to process ImportedContacts.csv: ${errorMessage}`
          );
          extractionLog.ImportedContacts = {
            found: true,
            rowCount: 0,
            error: errorMessage,
          };
        }
      } else {
        extractionLog.ImportedContacts = { found: false };
        this.logger.warn("ImportedContacts.csv not found in zip file");
      }

      await job.updateProgress(35);

      // Update linkedin_imports with extraction and initial processing logs
      await this.db
        .update(schema.linkedinImports)
        .set({
          linkedinProfileUrl,
          profileData,
          extractionLog,
          processingLog,
          updatedAt: toUTC(),
        })
        .where(eq(schema.linkedinImports.id, linkedinImportId));

      // Update profile's linkedin_url if not already set
      await this.updateProfileLinkedInUrl(userId, linkedinProfileUrl);

      if (allContacts.length === 0) {
        this.logger.warn("No contacts found in any CSV files");
      }

      // Update progress: 30-50% - Contact transformation complete
      await job.updateProgress(50);

      // Filter out contacts with disposable emails before importing
      const { filtered: validContacts, filteredCount } =
        await filterDisposableEmails(allContacts);

      if (filteredCount > 0) {
        this.logger.log(
          `Filtered out ${filteredCount} contacts with disposable email addresses`
        );
      }

      // Update progress: 50-90% - Contact import
      await job.updateProgress(50);

      // Import all contacts using centralized import service
      // The import service will handle deduplication and batching
      const finalResult = await importContacts(validContacts, {
        userId,
        source: "linkedin_import",
      });

      // Update progress: 90-100% - Finalization
      await job.updateProgress(90);

      // Update processing log with final counts
      processingLog.final = {
        totalFound: allContacts.length,
        validAfterFiltering: validContacts.length,
        filteredDisposable: filteredCount,
        imported: finalResult.imported,
        duplicates: finalResult.duplicates,
        errors: finalResult.errors,
      };

      // Update linkedin_imports with final processing log
      await this.db
        .update(schema.linkedinImports)
        .set({
          processingLog,
          updatedAt: toUTC(),
        })
        .where(eq(schema.linkedinImports.id, linkedinImportId));

      // Update import record with results
      await this.contactsImportService.updateContactsImport(importRecordId, {
        status: IMPORT_STATUS.COMPLETED,
        imported: finalResult.imported,
        failed: finalResult.errors,
        duplicates: finalResult.duplicates,
        totalFetched: validContacts.length,
        completedAt: toUTC(),
      });

      await job.updateProgress(100);

      this.logger.log(
        `LinkedIn Contacts import completed: ${finalResult.imported} imported, ${finalResult.duplicates} duplicates, ${finalResult.errors} errors`
      );

      try {
        await this.creditImportAllocationQueueService?.enqueueAfterImportCompleted(
          importRecordId
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue credit allocation for LinkedIn import: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }

      // Trigger trust score calculation for successful import (including duplicates)
      // Duplicates also create contact_import_snapshots which count toward credits
      if (finalResult.imported > 0 || finalResult.duplicates > 0) {
        try {
          await this.trustScoreQueueService.enqueueTrustScoreEvent(
            userId,
            "linkedin_zip_import",
            { contactCount: finalResult.imported + finalResult.duplicates }
          );
        } catch (error) {
          this.logger.error(
            `Failed to queue trust score event for LinkedIn contact import: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // Sync imported + updated contacts to Typesense for search
      const allContactIdsToSync = [
        ...finalResult.importedContactIds,
        ...finalResult.updatedContactIds,
      ];
      if (allContactIdsToSync.length > 0) {
        try {
          await this.typesenseSyncQueueService?.enqueueSyncJob(
            allContactIdsToSync.map(String),
            userId,
            "linkedin_import"
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
        importRecordId,
        imported: finalResult.imported,
        failed: finalResult.errors,
        duplicates: finalResult.duplicates,
        totalFetched: validContacts.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `LinkedIn Contacts import job ${id} failed: ${errorMessage}`
      );

      // Update import record with error
      if (importRecordId) {
        await this.contactsImportService.updateContactsImport(importRecordId, {
          status: IMPORT_STATUS.FAILED,
          errorMessage,
          completedAt: toUTC(),
        });
      }

      // Update linkedin_imports with error in processing log
      if (linkedinImportId) {
        try {
          const currentImport = await this.db.query.linkedinImports.findFirst({
            where: eq(schema.linkedinImports.id, linkedinImportId),
          });

          if (currentImport) {
            const processingLog =
              (currentImport.processingLog as Record<string, AnyType>) || {};
            processingLog.error = errorMessage;

            await this.db
              .update(schema.linkedinImports)
              .set({
                processingLog,
                updatedAt: toUTC(),
              })
              .where(eq(schema.linkedinImports.id, linkedinImportId));
          }
        } catch (updateError) {
          this.logger.error(
            `Failed to update linkedin_imports with error: ${updateError instanceof Error ? updateError.message : "Unknown error"}`
          );
        }
      }

      throw error;
    }
  }

  /**
   * Find CSV file in extracted files map (case-insensitive)
   */
  private findCsvFile(
    extractedFiles: Map<string, Buffer>,
    fileName: string
  ): Buffer | null {
    for (const [key, value] of extractedFiles.entries()) {
      if (key.toLowerCase() === fileName.toLowerCase()) {
        return value;
      }
    }
    return null;
  }

  /**
   * Update profile's linkedin_url if not already set
   * Only updates if the profile's linkedinUrl is null or empty
   */
  private async updateProfileLinkedInUrl(
    userId: string,
    linkedinProfileUrl: string | null
  ): Promise<void> {
    if (!linkedinProfileUrl) {
      return;
    }

    try {
      const profile = await this.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (
        profile &&
        (!profile.linkedinUrl || profile.linkedinUrl.trim() === "")
      ) {
        await this.db
          .update(schema.users)
          .set({
            linkedinUrl: linkedinProfileUrl,
            updatedAt: toUTC(),
          })
          .where(eq(schema.users.id, userId));
        this.logger.log(
          `Updated profile linkedin_url for user ${userId} with LinkedIn profile URL`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(
        `Failed to update profile linkedin_url for user ${userId}: ${errorMessage}`
      );
      // Don't throw - this is a non-critical update
    }
  }

  /**
   * Check if a contact matches the user's own profile
   * Returns true if the contact should be filtered out (is the user's own record)
   */
  private isUserOwnContact(
    contact: {
      email?: string;
      linkedin?: string;
    },
    userEmail: string | null,
    userLinkedInUrl: string | null,
    linkedinProfileUrl: string | null
  ): boolean {
    // Normalize LinkedIn URL for comparison (remove trailing slashes, convert to lowercase)
    const normalizeLinkedInUrl = (
      url: string | null | undefined
    ): string | null => {
      if (!url) return null;
      return url.toLowerCase().trim().replace(/\/+$/, "");
    };

    const contactLinkedIn = normalizeLinkedInUrl(contact.linkedin);
    const userLinkedIn = normalizeLinkedInUrl(
      userLinkedInUrl || linkedinProfileUrl
    );
    const contactEmail = contact.email?.toLowerCase().trim();

    // Check LinkedIn URL match
    if (contactLinkedIn && userLinkedIn && contactLinkedIn === userLinkedIn) {
      return true;
    }

    // Check email match
    if (contactEmail && userEmail && contactEmail === userEmail) {
      return true;
    }

    return false;
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<LinkedInContactsImportJobData>) {
    this.logger.log(
      `LinkedIn Contacts import job ${job.id} completed successfully`
    );
    // Disabled: job matching on contact import to avoid unnecessary Gemini API calls
    // this.jobPoolMatchQueueService
    //   ?.queueContactMatchCompute(job.data.userId)
    //   .catch((error) => {
    //     this.logger.error(
    //       `Failed to queue job pool match compute after LinkedIn import: ${error instanceof Error ? error.message : "Unknown error"}`
    //     );
    //   });
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<LinkedInContactsImportJobData>, error: Error) {
    this.logger.error(
      `LinkedIn Contacts import job ${job.id} failed: ${error.message}`
    );
  }
}
