import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import { Job } from "bullmq";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  CLAIM_VERIFICATION_QUEUE_NAME,
  CLAIM_VERIFICATION_STATUS,
  ImportSource,
} from "./claim-verification.constants";
import {
  VerificationJobData,
  VerificationJobResult,
} from "./claim-verification.types";
import { ClaimVerificationService } from "./claim-verification.service";
import { ClaimContactMatcherService } from "./claim-contact-matcher.service";

@Processor(CLAIM_VERIFICATION_QUEUE_NAME)
export class ClaimVerificationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ClaimVerificationQueueProcessor.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly verificationService: ClaimVerificationService,
    private readonly contactMatcher: ClaimContactMatcherService
  ) {
    super();
  }

  async process(job: Job<VerificationJobData>): Promise<VerificationJobResult> {
    const { userId, introductionRequestId, source } = job.data;

    try {
      // Get the verification record
      const verification =
        await this.verificationService.getPendingVerification(userId);
      if (
        !verification ||
        verification.introductionRequestId !== introductionRequestId
      ) {
        return {
          success: false,
          matched: false,
          sourcesChecked: [],
          status: CLAIM_VERIFICATION_STATUS.NOT_CLAIMED_FAILED,
          message: "No pending verification found",
        };
      }

      // Mark as in progress
      await this.verificationService.markInProgress(
        userId,
        introductionRequestId
      );

      // Get prospect info from introduction request and related contact
      const [request] = await this.db
        .select({
          contactId: schema.introductionRequests.contactId,
          contactLinkedin: schema.contacts.linkedin,
        })
        .from(schema.introductionRequests)
        .leftJoin(
          schema.contacts,
          eq(schema.introductionRequests.contactId, schema.contacts.id)
        )
        .where(eq(schema.introductionRequests.id, introductionRequestId))
        .limit(1);

      // Get normalizedEmailHash from contact_sensitive_data if contact exists
      let contactEmailHash: string | null = null;
      if (request?.contactId) {
        const [sensitiveData] = await this.db
          .select({
            normalizedEmailHash:
              schema.contactSensitiveData.normalizedEmailHash,
          })
          .from(schema.contactSensitiveData)
          .where(eq(schema.contactSensitiveData.contactId, request.contactId))
          .limit(1);
        contactEmailHash = sensitiveData?.normalizedEmailHash || null;
      }

      if (!request) {
        return this.handleNoRequest(userId, introductionRequestId);
      }

      // Check if already claimed by someone else
      const [existingClaim] = await this.db
        .select()
        .from(schema.marketplaceClaims)
        .where(
          and(
            eq(
              schema.marketplaceClaims.introductionRequestId,
              introductionRequestId
            ),
            eq(schema.marketplaceClaims.status, "completed"),
            sql`${schema.marketplaceClaims.claimerId} != ${userId}`
          )
        )
        .limit(1);

      if (existingClaim) {
        return this.handleAlreadyClaimed(userId, introductionRequestId);
      }

      // Try to match contact using email hash and LinkedIn
      const matchResult = await this.contactMatcher.findProspectInUserContacts(
        userId,
        contactEmailHash,
        request.contactLinkedin
      );

      if (matchResult.matched && matchResult.contactId) {
        return this.handleMatchFound(
          userId,
          introductionRequestId,
          matchResult.contactId,
          matchResult.matchType === "linkedin" ? "linkedin" : source,
          verification.sourcesChecked as ImportSource[]
        );
      }

      // No match - add source to checked list
      return this.handleNoMatch(userId, introductionRequestId, source);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Verification job ${job.id} failed: ${errorMessage}`);
      throw error;
    }
  }

  private async handleNoRequest(
    userId: string,
    introductionRequestId: string
  ): Promise<VerificationJobResult> {
    await this.verificationService.markAsFailed(userId, introductionRequestId);
    return {
      success: false,
      matched: false,
      sourcesChecked: [],
      status: CLAIM_VERIFICATION_STATUS.NOT_CLAIMED_FAILED,
      message: "Introduction request not found",
    };
  }

  private async handleAlreadyClaimed(
    userId: string,
    introductionRequestId: string
  ): Promise<VerificationJobResult> {
    await this.verificationService.markAsFailed(userId, introductionRequestId);
    return {
      success: false,
      matched: false,
      sourcesChecked: [],
      status: CLAIM_VERIFICATION_STATUS.NOT_CLAIMED_FAILED,
      message: "Request already claimed by another user",
    };
  }

  private async handleMatchFound(
    userId: string,
    introductionRequestId: string,
    contactId: number,
    source: ImportSource,
    previousSources: ImportSource[]
  ): Promise<VerificationJobResult> {
    await this.verificationService.completeVerification(
      userId,
      introductionRequestId,
      contactId,
      source
    );

    this.logger.log(
      `Match found for user ${userId}, request ${introductionRequestId}, contact ${contactId}`
    );

    return {
      success: true,
      matched: true,
      matchedContactId: contactId,
      matchedSource: source,
      sourcesChecked: [...previousSources, source],
      status: CLAIM_VERIFICATION_STATUS.CLAIMED_COMPLETED,
      message: "Connection verified successfully",
    };
  }

  private async handleNoMatch(
    userId: string,
    introductionRequestId: string,
    source: ImportSource
  ): Promise<VerificationJobResult> {
    // Add source to checked list
    const updated = await this.verificationService.addSourceChecked(
      userId,
      introductionRequestId,
      source
    );

    const sourcesChecked = (updated?.sourcesChecked || [
      source,
    ]) as ImportSource[];

    // Check if all sources exhausted
    const allExhausted =
      await this.verificationService.checkAllSourcesExhausted(
        userId,
        introductionRequestId
      );

    if (allExhausted) {
      await this.verificationService.markAsFailed(
        userId,
        introductionRequestId
      );
      return {
        success: true,
        matched: false,
        sourcesChecked,
        status: CLAIM_VERIFICATION_STATUS.NOT_CLAIMED_FAILED,
        message: "Prospect not found in any imported contacts",
      };
    }

    return {
      success: true,
      matched: false,
      sourcesChecked,
      status: CLAIM_VERIFICATION_STATUS.IN_PROGRESS,
      message:
        "Prospect not found in this source, try importing from other sources",
    };
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<VerificationJobData>) {
    this.logger.log(`Verification job ${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<VerificationJobData>, error: Error) {
    this.logger.error(`Verification job ${job.id} failed: ${error.message}`);
  }
}
