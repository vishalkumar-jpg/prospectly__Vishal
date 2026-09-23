import { Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { IntroductionPotentialConnectorsService } from "modules/introduction-potential-connectors/introduction-potential-connectors.service";
import {
  DEEP_LINK_STATUS,
  DeepLinkAction,
  DeepLinkStatusResponse,
} from "./deep-link-status.response";
import { IntroductionsService } from "../introductions.service";
import { IntroductionStatus } from "../introductions.constants";

@Injectable()
export class DeepLinkStatusService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(IntroductionPotentialConnectorsService)
    private readonly potentialConnectorsService: IntroductionPotentialConnectorsService,
    @Inject(IntroductionsService)
    private readonly introductionsService: IntroductionsService
  ) {}

  async getDeepLinkStatus(
    userId: string,
    requestId: string,
    action: DeepLinkAction
  ): Promise<DeepLinkStatusResponse> {
    switch (action) {
      case "review":
        return this.getConnectorReviewStatus(userId, requestId);
      case "acknowledge":
        return this.getRequesterAcknowledgeStatus(userId, requestId);
      case "feedback":
        return this.getConnectorFeedbackStatus(userId, requestId);
      default:
        return { status: DEEP_LINK_STATUS.NOT_FOUND };
    }
  }

  /**
   * Check if the connector can still review/accept the introduction request.
   * Previously: ConnectorReviewStatusService.getConnectorReviewStatus
   */
  private async getConnectorReviewStatus(
    userId: string,
    requestId: string
  ): Promise<DeepLinkStatusResponse> {
    const entry =
      await this.potentialConnectorsService.getEntryByRequestAndConnector(
        requestId,
        userId
      );

    if (!entry) {
      return { status: DEEP_LINK_STATUS.NOT_FOUND };
    }

    const request =
      await this.introductionsService.getIntroductionRequestByIdSlim(requestId);

    if (!request) {
      return { status: DEEP_LINK_STATUS.NOT_FOUND };
    }

    if (request.acceptedBy === userId) {
      return { status: DEEP_LINK_STATUS.ACCEPTED_BY_YOU };
    }

    if (request.status === IntroductionStatus.ACCEPTED || request.acceptedBy) {
      return { status: DEEP_LINK_STATUS.ALREADY_ACCEPTED };
    }

    if (
      entry.status === IntroductionStatus.PENDING &&
      request.status === IntroductionStatus.PENDING
    ) {
      return { status: DEEP_LINK_STATUS.AVAILABLE };
    }

    return { status: DEEP_LINK_STATUS.UNAVAILABLE };
  }

  /**
   * Check if the requester can still acknowledge meeting completion.
   * Previously: RequesterAcknowledgeStatusService.getRequesterAcknowledgeStatus
   */
  private async getRequesterAcknowledgeStatus(
    userId: string,
    requestId: string
  ): Promise<DeepLinkStatusResponse> {
    const [request] = await this.db
      .select({
        requesterId: schema.introductionRequests.requesterId,
        status: schema.introductionRequests.status,
        meetingCompletedByRequester:
          schema.introductionRequests.meetingCompletedByRequester,
      })
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.id, requestId))
      .limit(1);

    if (!request || request.requesterId !== userId) {
      return { status: DEEP_LINK_STATUS.NOT_FOUND };
    }

    if (
      request.meetingCompletedByRequester ||
      request.status === IntroductionStatus.PEER_FEEDBACK ||
      request.status === IntroductionStatus.COMPLETED
    ) {
      return { status: DEEP_LINK_STATUS.ALREADY_ACKNOWLEDGED };
    }

    if (request.status === IntroductionStatus.MEETING_COMPLETED) {
      return { status: DEEP_LINK_STATUS.READY };
    }

    return { status: DEEP_LINK_STATUS.NOT_READY };
  }

  /**
   * Check if the connector can still submit peer feedback.
   * New: checks if feedback has already been submitted by this user for this request.
   */
  private async getConnectorFeedbackStatus(
    userId: string,
    requestId: string
  ): Promise<DeepLinkStatusResponse> {
    const [request] = await this.db
      .select({
        acceptedBy: schema.introductionRequests.acceptedBy,
        status: schema.introductionRequests.status,
      })
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.id, requestId))
      .limit(1);

    if (!request || request.acceptedBy !== userId) {
      return { status: DEEP_LINK_STATUS.NOT_FOUND };
    }

    // Check if feedback already exists for this user on this request
    const existingFeedback = await this.db.query.introductionFeedback.findFirst(
      {
        where: and(
          eq(schema.introductionFeedback.introductionId, requestId),
          eq(schema.introductionFeedback.feedbackFromUserId, userId),
          eq(schema.introductionFeedback.feedbackType, "peer_feedback")
        ),
        columns: { id: true },
      }
    );

    if (existingFeedback) {
      return { status: DEEP_LINK_STATUS.ALREADY_FEEDBACK_GIVEN };
    }

    if (request.status === IntroductionStatus.PEER_FEEDBACK) {
      return { status: DEEP_LINK_STATUS.FEEDBACK_READY };
    }

    return { status: DEEP_LINK_STATUS.FEEDBACK_NOT_READY };
  }
}
