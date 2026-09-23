import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  extractUserDomains,
  normalizeDomain,
} from "utils/domain-extraction.util";
import { TrustScoreQueueService } from "modules/trust-score-queue/trust-score-queue.service";
import { IntroductionNotificationsDispatchService } from "modules/introductions/notifications/introduction-notifications-dispatch.service";
import { INTRODUCTION_NOTIFICATION_TYPE } from "modules/introductions/notifications/introduction-notifications.constants";
import { toUTC } from "utils/dayjs";
import { INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES } from "./introduction-potential-connectors.constants";
import {
  AcceptRequestParams,
  AcceptRequestResult,
  ConnectorRequestEntry,
  DeclineRequestResult,
} from "./introduction-potential-connectors.types";
import { PrivacyRule } from "./introduction-privacy.service";

@Injectable()
export class IntroductionPotentialConnectorsService {
  private readonly logger = new Logger(
    IntroductionPotentialConnectorsService.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(TrustScoreQueueService)
    private readonly trustScoreQueueService: TrustScoreQueueService,
    private readonly introductionNotificationsDispatch: IntroductionNotificationsDispatchService
  ) {}

  /**
   * Get all user IDs (connectors) associated with a contact.
   * Looks up the contact_relationships table.
   */
  async getConnectorIdsForContact(contactId: number): Promise<string[]> {
    const relationships = await this.db
      .select({
        userId: schema.contactRelationships.userId,
      })
      .from(schema.contactRelationships)
      .where(eq(schema.contactRelationships.contactId, contactId));

    return relationships.map((r) => r.userId);
  }

  /**
   * Get privacy rules by their IDs (verify they belong to the user and have hide_bounties = true)
   * @param userId - The requester's user ID
   * @param ruleIds - Array of privacy rule IDs to fetch
   * @returns Array of privacy rules
   */
  async getPrivacyRulesByIds(
    userId: string,
    ruleIds: string[]
  ): Promise<PrivacyRule[]> {
    if (ruleIds.length === 0) {
      return [];
    }

    const rules = await this.db
      .select({
        id: schema.privacy.id,
        domain: schema.privacy.domain,
        reason: schema.privacy.reason,
        hideBounties: schema.privacy.hideBounties,
      })
      .from(schema.privacy)
      .where(
        and(
          eq(schema.privacy.userId, userId),
          eq(schema.privacy.hideBounties, true),
          inArray(schema.privacy.id, ruleIds)
        )
      );

    return rules.map((rule) => ({
      id: rule.id,
      domain: rule.domain,
      reason: rule.reason,
      hideBounties: rule.hideBounties,
    }));
  }

  /**
   * Extract domains for each connector
   * @param connectorIds - Array of connector user IDs
   * @returns Map of connectorId -> array of domains
   */
  async extractConnectorDomains(
    connectorIds: string[]
  ): Promise<Map<string, string[]>> {
    if (connectorIds.length === 0) {
      return new Map();
    }

    const connectors = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        websiteUrl: schema.users.websiteUrl,
      })
      .from(schema.users)
      .where(inArray(schema.users.id, connectorIds));

    const domainMap = new Map<string, string[]>();

    for (const connector of connectors) {
      const domains = extractUserDomains(connector.email, connector.websiteUrl);
      // Deduplicate domains
      const uniqueDomains = Array.from(new Set(domains));
      domainMap.set(connector.id, uniqueDomains);
    }

    return domainMap;
  }

  /**
   * Check if a connector should be excluded based on privacy rules
   * @param connectorDomains - Array of domains for the connector
   * @param privacyDomains - Array of privacy rule domains
   * @returns true if connector should be excluded
   */
  shouldExcludeConnector(
    connectorDomains: string[],
    privacyDomains: string[]
  ): boolean {
    const normalizedConnectorDomains = connectorDomains
      .map((d) => normalizeDomain(d))
      .filter((d): d is string => d !== null);

    const normalizedPrivacyDomains = privacyDomains
      .map((d) => normalizeDomain(d))
      .filter((d): d is string => d !== null);

    // Check if any connector domain matches any privacy domain
    return normalizedConnectorDomains.some((connectorDomain) =>
      normalizedPrivacyDomains.includes(connectorDomain)
    );
  }

  /**
   * Filter connectors by privacy rules
   * @param connectorIds - Array of connector IDs to filter
   * @param privacyRules - Array of privacy rules
   * @returns Array of connector IDs that should be excluded
   */
  async filterConnectorsByPrivacy(
    connectorIds: string[],
    privacyRules: PrivacyRule[]
  ): Promise<string[]> {
    if (privacyRules.length === 0 || connectorIds.length === 0) {
      return [];
    }

    const privacyDomains = privacyRules.map((rule) => rule.domain);
    const connectorDomainsMap =
      await this.extractConnectorDomains(connectorIds);

    const excludedConnectorIds: string[] = [];

    for (const [connectorId, domains] of connectorDomainsMap.entries()) {
      if (this.shouldExcludeConnector(domains, privacyDomains)) {
        excludedConnectorIds.push(connectorId);
      }
    }

    return excludedConnectorIds;
  }

  /**
   * Automatically move an introduction request to the global marketplace.
   * Updates is_marketplace_visible to true and sets marketplace_moved_at timestamp.
   *
   * @param requestId - The introduction request ID
   * @param reason - Optional reason message for logging
   */
  private async moveRequestToMarketplace(
    requestId: string,
    reason?: string
  ): Promise<void> {
    if (reason) {
      this.logger.log(reason);
    }
    await this.db
      .update(schema.introductionRequests)
      .set({
        isMarketplaceVisible: true,
        marketplaceMovedAt: toUTC(),
        updatedAt: toUTC(),
      })
      .where(eq(schema.introductionRequests.id, requestId));
  }

  /**
   * Create potential connector entries for an introduction request.
   * Creates one entry per connector associated with the contact.
   * Optionally filters connectors based on privacy rules.
   *
   * @param requestId - The introduction request ID
   * @param contactId - The contact ID
   * @param requesterId - Optional requester ID for privacy filtering
   * @param selectedPrivacyRuleIds - Optional array of privacy rule IDs to use for filtering (if not provided, no filtering is applied)
   * @returns Object containing created connector entries and privacy rules used for filtering
   */
  async createPotentialConnectorEntries(
    requestId: string,
    contactId: number,
    requesterId?: string,
    selectedPrivacyRuleIds?: string[]
  ): Promise<{
    entries: schema.IntroductionPotentialConnector[];
    privacyRules: PrivacyRule[];
  }> {
    let connectorIds = await this.getConnectorIdsForContact(contactId);

    // If no connectors found initially, move request to marketplace and return
    if (connectorIds.length === 0) {
      await this.moveRequestToMarketplace(
        requestId,
        `No connectors found for introduction request ${requestId} (contactId: ${contactId}), automatically moving to global marketplace`
      );
      return { entries: [], privacyRules: [] };
    }

    let privacyRules: PrivacyRule[] = [];

    // Apply privacy filtering if requesterId and selectedPrivacyRuleIds are provided
    if (
      requesterId &&
      selectedPrivacyRuleIds &&
      selectedPrivacyRuleIds.length > 0
    ) {
      // Fetch privacy rules by their IDs internally
      privacyRules = await this.getPrivacyRulesByIds(
        requesterId,
        selectedPrivacyRuleIds
      );

      if (privacyRules.length > 0) {
        const excludedIds = await this.filterConnectorsByPrivacy(
          connectorIds,
          privacyRules
        );

        // Filter out excluded connectors
        connectorIds = connectorIds.filter((id) => !excludedIds.includes(id));
      }
    }

    // If all connectors were filtered out by privacy rules, move request to marketplace and return
    if (connectorIds.length === 0) {
      await this.moveRequestToMarketplace(
        requestId,
        `All connectors filtered out by privacy rules for introduction request ${requestId} (contactId: ${contactId}), automatically moving to global marketplace`
      );
      return { entries: [], privacyRules };
    }

    const entries = connectorIds.map((connectorId) => ({
      requestId,
      potentialConnectorId: connectorId,
      status: IntroductionStatus.PENDING,
    }));

    const created = await this.db
      .insert(schema.introductionPotentialConnectors)
      .values(entries)
      .returning();

    return {
      entries: created,
      privacyRules,
    };
  }

  /**
   * Get all pending potential connector entries for a connector (user).
   * Returns entries where the user is a potential connector and status is pending.
   */
  async getPendingEntriesForConnector(
    connectorId: string
  ): Promise<schema.IntroductionPotentialConnector[]> {
    return await this.db
      .select()
      .from(schema.introductionPotentialConnectors)
      .where(
        and(
          eq(
            schema.introductionPotentialConnectors.potentialConnectorId,
            connectorId
          ),
          eq(
            schema.introductionPotentialConnectors.status,
            IntroductionStatus.PENDING
          )
        )
      );
  }

  /**
   * Get a potential connector entry by ID.
   */
  async getEntryById(
    entryId: string
  ): Promise<schema.IntroductionPotentialConnector | undefined> {
    const result =
      await this.db.query.introductionPotentialConnectors.findFirst({
        where: eq(schema.introductionPotentialConnectors.id, entryId),
      });
    return result;
  }

  /**
   * Get a potential connector entry by request ID and connector ID.
   */
  async getEntryByRequestAndConnector(
    requestId: string,
    connectorId: string
  ): Promise<schema.IntroductionPotentialConnector | undefined> {
    const result =
      await this.db.query.introductionPotentialConnectors.findFirst({
        where: and(
          eq(schema.introductionPotentialConnectors.requestId, requestId),
          eq(
            schema.introductionPotentialConnectors.potentialConnectorId,
            connectorId
          )
        ),
      });
    return result;
  }

  /**
   * Get all potential connector entries for a request.
   */
  async getEntriesByRequestId(
    requestId: string
  ): Promise<schema.IntroductionPotentialConnector[]> {
    return await this.db
      .select()
      .from(schema.introductionPotentialConnectors)
      .where(eq(schema.introductionPotentialConnectors.requestId, requestId));
  }

  /**
   * Get all potential connector entries for multiple requests.
   */
  async getEntriesByRequestIds(
    requestIds: string[]
  ): Promise<schema.IntroductionPotentialConnector[]> {
    if (requestIds.length === 0) return [];

    return await this.db
      .select()
      .from(schema.introductionPotentialConnectors)
      .where(
        inArray(schema.introductionPotentialConnectors.requestId, requestIds)
      );
  }

  /**
   * Accept an introduction request atomically.
   * Only one connector can accept; others are archived.
   * Uses a database transaction with row-level locking.
   */
  async acceptRequest(
    requestId: string,
    connectorId: string,
    _params?: AcceptRequestParams
  ): Promise<AcceptRequestResult> {
    const result = await this.db.transaction(async (tx) => {
      // Lock the introduction_requests row for update to prevent race conditions
      const [request] = await tx
        .select()
        .from(schema.introductionRequests)
        .where(eq(schema.introductionRequests.id, requestId))
        .for("update");

      if (!request) {
        throw new NotFoundException(
          INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR
            .INTRODUCTION_REQUEST_NOT_FOUND
        );
      }

      // Check if request is already accepted
      if (
        request.status === IntroductionStatus.ACCEPTED ||
        request.acceptedBy
      ) {
        throw new ConflictException(
          INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR.ALREADY_ACCEPTED
        );
      }

      // Check if status allows acceptance (only pending requests can be accepted)
      if (request.status !== IntroductionStatus.PENDING) {
        throw new ConflictException(
          INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR.CANNOT_ACCEPT_STATUS(
            request.status
          )
        );
      }

      // Verify the connector has a pending entry for this request
      const [connectorEntry] = await tx
        .select()
        .from(schema.introductionPotentialConnectors)
        .where(
          and(
            eq(schema.introductionPotentialConnectors.requestId, requestId),
            eq(
              schema.introductionPotentialConnectors.potentialConnectorId,
              connectorId
            )
          )
        )
        .for("update");

      if (!connectorEntry) {
        throw new ForbiddenException(
          INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR
            .NOT_AUTHORIZED_TO_ACCEPT
        );
      }

      if (connectorEntry.status !== IntroductionStatus.PENDING) {
        throw new ConflictException(
          INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR.ENTRY_STATUS_INVALID(
            connectorEntry.status
          )
        );
      }

      const [priorFailure] = await tx
        .select({ id: schema.introductionFulfillmentAttempts.id })
        .from(schema.introductionFulfillmentAttempts)
        .where(
          and(
            eq(
              schema.introductionFulfillmentAttempts.introductionRequestId,
              requestId
            ),
            eq(schema.introductionFulfillmentAttempts.connectorId, connectorId)
          )
        )
        .limit(1);

      if (priorFailure) {
        throw new ForbiddenException(
          INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR
            .PRIOR_UNSUCCESSFUL_ATTEMPT
        );
      }

      const now = toUTC();

      // Update the introduction request with acceptance details
      const [updatedRequest] = await tx
        .update(schema.introductionRequests)
        .set({
          status: "accepted",
          acceptedBy: connectorId,
          acceptedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.introductionRequests.id, requestId))
        .returning();

      // Update the accepting connector's entry to 'accepted'
      await tx
        .update(schema.introductionPotentialConnectors)
        .set({
          status: IntroductionStatus.ACCEPTED,
          updatedAt: now,
        })
        .where(
          eq(schema.introductionPotentialConnectors.id, connectorEntry.id)
        );

      // Archive pending potential connector entries for this request
      await tx
        .update(schema.introductionPotentialConnectors)
        .set({
          status: "archived",
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.introductionPotentialConnectors.requestId, requestId),
            eq(
              schema.introductionPotentialConnectors.status,
              IntroductionStatus.PENDING
            ),
            sql`${schema.introductionPotentialConnectors.potentialConnectorId} != ${connectorId}`
          )
        );

      // Trigger trust score calculation for successful introduction
      await this.calculateTrustScore(updatedRequest, connectorId, requestId);

      // Queue response rate recovery check in background
      await this.queueResponseRateRecoveryCheck(
        connectorId,
        requestId,
        "connector_accepted"
      );

      return {
        success: true,
        request: updatedRequest,
      };
    });

    void this.introductionNotificationsDispatch.dispatch({
      requestId,
      type: INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_CONNECTOR_ACCEPTED,
    });

    return result;
  }

  private async calculateTrustScore(
    request: schema.IntroductionRequest,
    connectorId: string,
    requestId: string
  ): Promise<void> {
    // Always enqueue a job to check average response rate
    // The job processor will calculate the connector's average response rate
    // across all requests and toggle points accordingly
    try {
      await this.trustScoreQueueService.enqueueTrustScoreEvent(
        connectorId,
        "check_response_rate_average",
        {
          requestId,
          action: "accept",
          triggeredBy: "introduction_accepted",
          acceptedAt: request.acceptedAt?.toISOString(),
        }
      );

      this.logger.log(
        `Queued response rate average check for connector ${connectorId} after accepting request ${requestId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue response rate average check: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Queue response rate recovery check in background
   * This checks if a penalized connector has improved their response rate
   * and should have their points restored
   */
  private async queueResponseRateRecoveryCheck(
    connectorId: string,
    requestId: string,
    triggerReason: "connector_accepted" | "connector_declined"
  ): Promise<void> {
    try {
      await this.trustScoreQueueService.enqueueResponseRateRecoveryCheck(
        connectorId,
        triggerReason,
        requestId
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue response rate recovery check: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Decline an introduction request for a specific connector.
   * Only updates the connector's entry; other entries remain unchanged.
   */
  async declineRequest(
    requestId: string,
    connectorId: string,
    declineReason: string,
    declineMessage?: string
  ): Promise<DeclineRequestResult> {
    // Get the connector's entry for this request
    const entry = await this.getEntryByRequestAndConnector(
      requestId,
      connectorId
    );

    if (!entry) {
      throw new ForbiddenException(
        INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR
          .NOT_AUTHORIZED_TO_DECLINE
      );
    }

    if (entry.status !== IntroductionStatus.PENDING) {
      throw new ConflictException(
        INTRODUCTION_POTENTIAL_CONNECTORS_MESSAGES.ERROR.CANNOT_DECLINE_STATUS(
          entry.status
        )
      );
    }

    // Update only this connector's entry to 'declined' with reason and message
    const [updatedEntry] = await this.db
      .update(schema.introductionPotentialConnectors)
      .set({
        status: IntroductionStatus.DECLINED,
        declineReason,
        declineMessage: declineMessage || null,
        updatedAt: toUTC(),
      })
      .where(eq(schema.introductionPotentialConnectors.id, entry.id))
      .returning();

    // Check if all connectors have declined
    // await this.checkAllConnectorsDeclined(requestId);

    // Queue response rate recovery check in background
    await this.queueResponseRateRecoveryCheck(
      connectorId,
      requestId,
      "connector_declined"
    );

    return {
      success: true,
      entry: updatedEntry,
    };
  }

  /**
   * Get introduction requests where the user is a potential connector.
   * Includes request details and the connector's entry status.
   */
  async getRequestsForConnector(
    connectorId: string
  ): Promise<ConnectorRequestEntry[]> {
    const entries = await this.db
      .select({
        entryId: schema.introductionPotentialConnectors.id,
        entryStatus: schema.introductionPotentialConnectors.status,
        requestId: schema.introductionPotentialConnectors.requestId,
        createdAt: schema.introductionPotentialConnectors.createdAt,
      })
      .from(schema.introductionPotentialConnectors)
      .where(
        eq(
          schema.introductionPotentialConnectors.potentialConnectorId,
          connectorId
        )
      )
      .orderBy(desc(schema.introductionPotentialConnectors.createdAt));

    if (entries.length === 0) {
      return [];
    }

    // Fetch request details for each entry
    const requestIds = entries.map((e) => e.requestId);
    const requests = await this.db
      .select({
        id: schema.introductionRequests.id,
        requesterId: schema.introductionRequests.requesterId,
        contactName: schema.introductionRequests.contactName,
        bountyAmount: schema.introductionRequests.bountyAmount,
        meetingTitle: schema.introductionRequests.meetingTitle,
        meetingDescription: schema.introductionRequests.meetingDescription,
        status: schema.introductionRequests.status,
        contactId: schema.introductionRequests.contactId,
        acceptedBy: schema.introductionRequests.acceptedBy,
        acceptedAt: schema.introductionRequests.acceptedAt,
        createdAt: schema.introductionRequests.createdAt,
        updatedAt: schema.introductionRequests.updatedAt,
      })
      .from(schema.introductionRequests)
      .where(inArray(schema.introductionRequests.id, requestIds))
      .orderBy(desc(schema.introductionRequests.createdAt));

    // Create a map of request details
    const requestMap = new Map(requests.map((r) => [r.id, r]));

    // Get contact IDs for bounty lookup
    const contactIds = requests
      .map((r) => r.contactId)
      .filter((id): id is number => id !== null);

    // Fetch connector bounties for all contacts in one query
    const connectorBounties = new Map<string, number>();
    if (contactIds.length > 0) {
      const relationships = await this.db
        .select({
          contactId: schema.contactRelationships.contactId,
          bountyAmount: schema.contactRelationships.bountyAmount,
        })
        .from(schema.contactRelationships)
        .where(
          and(
            inArray(schema.contactRelationships.contactId, contactIds),
            eq(schema.contactRelationships.userId, connectorId)
          )
        );

      relationships.forEach((rel) => {
        const key = `${rel.contactId}`;
        connectorBounties.set(
          key,
          rel.bountyAmount ? Number(rel.bountyAmount) : 0
        );
      });
    }

    // Combine entries with request details and bounty information
    return entries.map((entry) => {
      const request = requestMap.get(entry.requestId);
      if (!request) {
        return {
          ...entry,
          request: null,
        };
      }

      const requesterBountyAmount = request.bountyAmount
        ? Number(request.bountyAmount)
        : 0;
      const connectorBountyAmount = request.contactId
        ? (connectorBounties.get(`${request.contactId}`) ?? 0)
        : 0;
      const canAccept = connectorBountyAmount <= requesterBountyAmount;

      return {
        ...entry,
        request: request
          ? {
              ...request,
              requesterBountyAmount,
              connectorBountyAmount,
              canAccept,
            }
          : null,
      };
    });
  }
}
