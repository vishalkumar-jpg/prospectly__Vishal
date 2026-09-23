import { Injectable, Logger } from "@nestjs/common";
import { UnrecoverableError } from "bullmq";
import { toCanonicalLinkedInProfileUrl } from "utils/linkedin-profile.utils";
import type { ConnectorReplaceResumeJobPayload } from "../connector-upload-queue.service";
import { ConnectorUploadEvaluationService } from "./connector-upload-evaluation.service";
import { ConnectorUploadMatchResultsService } from "./connector-upload-match-results.service";
import { ConnectorUploadReplacePostAcceptService } from "./connector-upload-replace-post-accept.service";
import {
  CONNECTOR_UPLOAD_AUTO_CONSENT_MIN_SCORE,
  CONNECTOR_UPLOAD_MESSAGES,
} from "../connector-upload.constants";
import { ResumeExtractionMutationService } from "../../resume-extraction/services/resume-extraction-mutation.service";
import { ConsentSendService } from "../../consent/services/consent-send.service";
import { ConsentResendService } from "../../consent/services/consent-resend.service";
import { ResumeIndexingQueueService } from "../../resume-indexing/resume-indexing-queue.service";
import { JOB_POOL_MATCH_STATUS } from "../../job-pool-matches/job-pool-matches.constants";

@Injectable()
export class ConnectorUploadReplaceMovementService {
  private readonly logger = new Logger(
    ConnectorUploadReplaceMovementService.name
  );

  constructor(
    private readonly matchResults: ConnectorUploadMatchResultsService,
    private readonly postAcceptService: ConnectorUploadReplacePostAcceptService,
    private readonly resumeMutation: ResumeExtractionMutationService,
    private readonly consentSendService: ConsentSendService,
    private readonly consentResendService: ConsentResendService,
    private readonly resumeIndexingQueue: ResumeIndexingQueueService
  ) {}

  async applyMovement(
    payload: ConnectorReplaceResumeJobPayload,
    evalResult: Awaited<
      ReturnType<ConnectorUploadEvaluationService["evaluateForJob"]>
    >,
    logPrefix: string
  ): Promise<void> {
    const qualifies =
      evalResult.matchPercentage >= CONNECTOR_UPLOAD_AUTO_CONSENT_MIN_SCORE;

    if (
      payload.preReplacePoolStatus === JOB_POOL_MATCH_STATUS.CONSENT_ACCEPTED
    ) {
      if (!payload.candidateId) {
        throw new UnrecoverableError(
          CONNECTOR_UPLOAD_MESSAGES.ERROR.CANDIDATE_NOT_FOUND
        );
      }
      await this.postAcceptService.apply({
        matchId: payload.matchId,
        candidateId: payload.candidateId,
        connectorUserId: payload.connectorUserId,
        evalResult,
      });
      return;
    }

    if (
      payload.preReplacePoolStatus === JOB_POOL_MATCH_STATUS.CONSENT_PENDING
    ) {
      if (qualifies) {
        await this.matchResults.updateMatchWithResults(
          payload.matchId,
          evalResult,
          { forceStatus: JOB_POOL_MATCH_STATUS.CONSENT_PENDING }
        );
        await this.safeResendConsent(
          payload.connectorUserId,
          payload.matchId,
          logPrefix
        );
      } else {
        await this.matchResults.demoteConsentPending(
          payload.matchId,
          evalResult
        );
      }
      return;
    }

    await this.matchResults.updateMatchWithResults(payload.matchId, evalResult);
    if (qualifies) {
      await this.safeSendConsent(
        payload.connectorUserId,
        payload.matchId,
        logPrefix
      );
    }
  }

  async persistExtraction(
    payload: ConnectorReplaceResumeJobPayload,
    extraction: Awaited<
      ReturnType<ConnectorUploadEvaluationService["extractFromPdf"]>
    >
  ): Promise<void> {
    const linkedin = extraction.contactInfo?.linkedinUrl?.trim() || null;
    const metadata =
      extraction.metadata &&
      typeof extraction.metadata === "object" &&
      !Array.isArray(extraction.metadata)
        ? { ...extraction.metadata }
        : {};
    if (linkedin) {
      metadata.extractedLinkedinUrl =
        toCanonicalLinkedInProfileUrl(linkedin) || linkedin;
    }

    await this.resumeMutation.saveExtraction({
      ...extraction,
      metadata,
      mediaId: payload.mediaId,
      contactId: payload.contactId,
      candidateId: payload.candidateId ?? undefined,
      userId: payload.connectorUserId,
    });

    try {
      await this.resumeIndexingQueue.queueIndexing({
        mediaId: payload.mediaId,
        reason: "reupload",
        userId: payload.connectorUserId,
      });
    } catch (error) {
      this.logger.error(
        `CONNECTOR_UPLOAD_REPLACE_MOVEMENT :: queueIndexing : ERROR : ${error}`
      );
    }
  }

  private async safeSendConsent(
    connectorUserId: string,
    matchId: string,
    logPrefix: string
  ): Promise<void> {
    try {
      await this.consentSendService.sendConsent(connectorUserId, matchId);
    } catch (error) {
      this.logger.error(`${logPrefix} :: sendConsent : ERROR : ${error}`);
    }
  }

  private async safeResendConsent(
    connectorUserId: string,
    matchId: string,
    logPrefix: string
  ): Promise<void> {
    try {
      await this.consentResendService.resendConsent(connectorUserId, matchId);
    } catch (error) {
      this.logger.error(`${logPrefix} :: resendConsent : ERROR : ${error}`);
    }
  }
}
