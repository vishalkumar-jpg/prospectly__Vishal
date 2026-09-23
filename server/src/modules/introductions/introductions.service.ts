import {
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { toUTC } from "utils/dayjs";
import { ContactsService } from "modules/contacts/contacts.service";
import { CalendarService } from "modules/calendar/calendar.service";
import { EmailsService } from "modules/emails/emails.service";
import { BountyStagesService } from "modules/bounty-stages/bounty-stages.service";
import { IntroductionPotentialConnectorsService } from "modules/introduction-potential-connectors/introduction-potential-connectors.service";
import { PaymentsService } from "modules/payments/payments.service";
import { StripeService } from "modules/stripe/stripe.service";
import { FinancesService } from "modules/finances/finances.service";
import * as schema from "database/schema";
import { ProfilesService } from "modules/profiles/profiles.service";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { PayoutQueueService } from "modules/payout-queue";
import { SuccessRateTrustScoreService } from "modules/trust-score-queue/success-rate-trust-score.service";
import { maskEmail } from "utils/maskingUtils";
import { mergeRequesterFeeFields } from "utils/introduction-request-fees.util";
import { isPendingRequesterFeedback } from "utils/pending-requester-feedback.util";
import {
  INTRODUCTIONS_MESSAGES,
  IntroductionStatus,
} from "./introductions.constants";
import {
  connectorIntroductionSearchHaystack,
  filterByPipelineSearch,
  normalizePipelineSearch,
  unfulfilledIntroductionSearchHaystack,
} from "./pipeline-search.utils";
import { ContactOrganizationEnricherService } from "./services/contact-organization-enricher.service";

export type ConnectorPipelineStatsOptions = {
  search?: string;
  statsContext?: "inbox" | "pipeline" | "archive" | "unfulfilled";
};

const DELETED_ACCOUNT_PLACEHOLDER = "User's Account deleted";

@Injectable()
export class IntroductionsService {
  private readonly logger = new Logger(IntroductionsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stripeService: StripeService,
    private readonly emailsService: EmailsService,
    private readonly calendarService: CalendarService,
    private readonly paymentsService: PaymentsService,
    private readonly potentialConnectorsService: IntroductionPotentialConnectorsService,
    private readonly bountyStagesService: BountyStagesService,
    private readonly financesService: FinancesService,
    private readonly contactsService: ContactsService,
    private readonly configService: ConfigService,
    private readonly profilesService: ProfilesService,
    private readonly successRateTrustScoreService: SuccessRateTrustScoreService,
    private readonly contactOrganizationEnricher: ContactOrganizationEnricherService,
    @Optional()
    private readonly payoutQueueService: PayoutQueueService
  ) {}

  async getIntroductionRequestsByContactOwner(contactOwnerId: string) {
    return this.getIntroductionRequestsByContactOwnerId(contactOwnerId);
  }

  /**
   * Inbox rows with the same shape as {@link getInboxRequests} but without
   * photo URL conversion, org fetch, or calendar enrichment (for stats/counts).
   */
  private async getInboxRequestRowsUnenriched(
    userId: string,
    searchRaw?: string
  ): Promise<AnyType[]> {
    const contactOwnerRequests =
      await this.getIntroductionRequestsByContactOwnerId(userId, {
        lightweight: true,
      });

    const potentialConnectorEntries =
      await this.potentialConnectorsService.getRequestsForConnector(userId);

    const contactOwnerRequestIds = new Set(
      contactOwnerRequests.map((r: AnyType) => r.id)
    );

    const additionalRequests: AnyType[] = [];
    for (const entry of potentialConnectorEntries) {
      if (
        entry.entryStatus === IntroductionStatus.PENDING &&
        !contactOwnerRequestIds.has(entry.requestId)
      ) {
        const request = await this.getIntroductionRequest(
          entry.requestId,
          false
        );
        if (request && request.status === IntroductionStatus.PENDING) {
          const requesterBountyAmount = request.bountyAmount
            ? Number(request.bountyAmount)
            : 0;

          let connectorBountyAmount = 0;
          if (request.contactId) {
            const connectorRelationship =
              await this.db.query.contactRelationships.findFirst({
                where: and(
                  eq(schema.contactRelationships.contactId, request.contactId),
                  eq(schema.contactRelationships.userId, userId)
                ),
              });
            connectorBountyAmount = connectorRelationship?.bountyAmount
              ? Number(connectorRelationship.bountyAmount)
              : 0;
          }

          const canAccept = connectorBountyAmount <= requesterBountyAmount;

          additionalRequests.push({
            ...request,
            isPotentialConnector: true,
            potentialConnectorEntryId: entry.entryId,
            entryStatus: entry.entryStatus,
            requesterBountyAmount,
            connectorBountyAmount,
            canAccept,
          });
        }
      }
    }

    const allRequests = [
      ...contactOwnerRequests.map((r: AnyType) => ({
        ...r,
        isPotentialConnector: false,
      })),
      ...additionalRequests,
    ];

    const filteredRequests = allRequests.filter(
      (r: AnyType) =>
        !r.connectorArchived &&
        !r.requesterArchived &&
        r.status !== IntroductionStatus.ARCHIVED
    );

    return filterByPipelineSearch(
      filteredRequests,
      searchRaw,
      connectorIntroductionSearchHaystack
    );
  }

  async getInboxRequests(userId: string, searchRaw?: string) {
    const searchFilteredRequests = await this.getInboxRequestRowsUnenriched(
      userId,
      searchRaw
    );

    // Resolve prospect user ids via stored email hashes (for org enrichment)
    const contactIds = [
      ...new Set(
        searchFilteredRequests
          .map((r: AnyType) => r.contactId)
          .filter((id): id is number => !!id)
      ),
    ];

    // Batch-load contact orgs via hash → registered user → organizations
    const { contactIdToRegisteredUserId, orgsByUserId: prospectOrgsByUserId } =
      await this.contactOrganizationEnricher.getContactOrganizationsMap(
        contactIds
      );

    // Convert profile photo URLs to full URLs for all requests and add organization data
    const requestsWithPhotoUrls = await Promise.all(
      searchFilteredRequests.map(async (req: AnyType) => {
        // Convert requester profile photo URL
        if (req.requester) {
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            req.requester
          );
          // Organizations are already included from getProfileForInbox
        }
        // Convert contact profile photo URL
        if (req.contact) {
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            req.contact
          );
        }

        // Prospect organizations when contact email matches a registered user (hash match)
        const prospectUserId = req.contactId
          ? contactIdToRegisteredUserId.get(req.contactId)
          : undefined;
        const contactOrganizations = prospectUserId
          ? (prospectOrgsByUserId.get(prospectUserId) ?? [])
          : [];
        // Get scheduled meeting details for meeting-related statuses
        let meetingDate: string | null = null;
        let meetingStartTime: string | null = null;
        if (
          [
            IntroductionStatus.MEETING_BOOKED,
            IntroductionStatus.MEETING_RESCHEDULED,
            IntroductionStatus.MEETING_COMPLETED,
            IntroductionStatus.PEER_FEEDBACK,
          ].includes(req.status)
        ) {
          const scheduledMeeting =
            await this.calendarService.getScheduledMeetingByIntroductionRequestId(
              req.id
            );
          if (scheduledMeeting) {
            meetingStartTime =
              scheduledMeeting.meetingDate?.toISOString() || null;
            meetingDate = meetingStartTime;
          }
        }

        return {
          ...req,
          // Photo URLs are now in req.requester.profilePhotoUrl and req.contact.profilePhotoUrl
          requester: req.requester
            ? {
                id: req.requester.id,
                fullName: req.requester.fullName,
                firstName: req.requester.firstName,
                lastName: req.requester.lastName,
                email: maskEmail(req.requester.email),
                company: req.requester.company,
                jobTitle: req.requester.jobTitle,
                industry: req.requester.industry,
                bio: req.requester.bio,
                websiteUrl: req.requester.websiteUrl,
                linkedinUrl: req.requester.linkedinUrl,
                profilePhotoUrl: req.requester.profilePhotoUrl,
                trustScore: req.requester.trustScore,
                location: req.requester.location,
                products: req.requester.products,
                uniqueSellingProposition:
                  req.requester.uniqueSellingProposition,
                targetMarket: req.requester.targetMarket,
                companySize: req.requester.companySize,
                revenueRange: req.requester.revenueRange,
                keyCredentials: req.requester.keyCredentials,
                organizations: req.requester.organizations,
              }
            : req.requesterId
              ? {
                  id: req.requesterId,
                  fullName: DELETED_ACCOUNT_PLACEHOLDER,
                  firstName: "User's Account",
                  lastName: "deleted",
                  email: "Deleted",
                  company: "Deleted",
                  organizations: [],
                }
              : null,
          contact: req.contact
            ? {
                ...req.contact,
                email: maskEmail(req.contact.email),
                organizations: contactOrganizations,
              }
            : req.contactId
              ? {
                  id: req.contactId,
                  firstName: "User's Account",
                  lastName: "deleted",
                  fullName: DELETED_ACCOUNT_PLACEHOLDER,
                  email: "Deleted",
                  company: "Deleted",
                  organizations: [],
                }
              : null,
          // Include meeting date information
          meetingDate,
          meetingStartTime,
        };
      })
    );

    // Sort by createdAt DESC to show latest created records first
    return requestsWithPhotoUrls.sort((a: AnyType, b: AnyType) => {
      const dateA = a.createdAt ? toUTC(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? toUTC(b.createdAt).getTime() : 0;
      return dateB - dateA; // DESC order (newest first)
    });
  }

  async getIntroductionRequestById(userId: string, requestId: string) {
    const request = await this.getIntroductionRequestByIdSlim(requestId);

    if (!request) {
      throw new NotFoundException(
        INTRODUCTIONS_MESSAGES.ERROR.REQUEST_NOT_FOUND
      );
    }

    // Check access: requester, contactOwner, or potential connector
    const isRequester = request.requesterId === userId;
    const isContactOwner = request.contactOwnerId === userId;
    const isAcceptedBy = request.acceptedBy === userId;

    // Check if user is a potential connector for this request
    let isPotentialConnector = false;
    if (!isRequester && !isContactOwner && !isAcceptedBy) {
      const entry =
        await this.potentialConnectorsService.getEntryByRequestAndConnector(
          requestId,
          userId
        );
      isPotentialConnector = !!entry;
    }

    if (
      !isRequester &&
      !isContactOwner &&
      !isAcceptedBy &&
      !isPotentialConnector
    ) {
      throw new ForbiddenException(INTRODUCTIONS_MESSAGES.ERROR.ACCESS_DENIED);
    }

    // Return a minimal, payment-free payload to keep the response lean
    return {
      id: request.id,
      requesterId: request.requesterId,
      contactOwnerId: request.contactOwnerId,
      acceptedBy: request.acceptedBy,
      contactId: request.contactId,
      status: request.status,
      meetingDescription: request.meetingDescription,
      meetingTitle: request.meetingTitle,
      bountyAmount: request.bountyAmount,
      adjustedBountyAmount: request.adjustedBountyAmount,
      additionalContext: request.additionalContext,
      contactName: request.contactName || DELETED_ACCOUNT_PLACEHOLDER,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  async updateIntroductionRequest(
    userId: string,
    requestId: string,
    updateData: AnyType
  ) {
    await this.getIntroductionRequestById(userId, requestId);

    const updated = await this.updateIntroductionRequestInDb(
      requestId,
      updateData
    );

    return updated;
  }

  async getIntroductionPipeline(userId: string, searchRaw?: string) {
    // Get all introduction requests where user is connector (not pending or declined)
    const requests = await this.getIntroductionRequestsByContactOwnerId(userId);

    // Filter to only active introductions (accepted, intro_sent, meeting stages) AND not archived
    let activeRequests = requests.filter(
      (r: AnyType) =>
        [
          IntroductionStatus.INTRO_SENT,
          IntroductionStatus.MEETING_SCHEDULED,
          IntroductionStatus.MEETING_BOOKED,
          IntroductionStatus.MEETING_RESCHEDULED,
          IntroductionStatus.MEETING_COMPLETED,
          IntroductionStatus.PEER_FEEDBACK,
        ].includes(r.status) &&
        !r.connectorArchived &&
        !r.requesterArchived &&
        r.status !== IntroductionStatus.ARCHIVED
    );

    activeRequests = filterByPipelineSearch(
      activeRequests,
      searchRaw,
      connectorIntroductionSearchHaystack
    );

    const pipelineRequesterIds = [
      ...new Set(
        activeRequests
          .map((r: AnyType) => r.requester?.id)
          .filter(Boolean) as string[]
      ),
    ];
    const pipelineOrgsByUser =
      await this.profilesService.getOrganizationsForUserIds(
        pipelineRequesterIds
      );

    // Resolve prospect user ids via email hashes for organization data
    const prospectContactIds = [
      ...new Set(
        activeRequests
          .map((r: AnyType) => r.contactId)
          .filter((id): id is number => !!id)
      ),
    ];

    // Batch-load contact orgs via hash → registered user → organizations
    const { contactIdToRegisteredUserId, orgsByUserId: prospectOrgsByUserId } =
      await this.contactOrganizationEnricher.getContactOrganizationsMap(
        prospectContactIds
      );

    // Format for pipeline display with scheduled meeting data and transaction data
    const formattedRequests = await Promise.all(
      activeRequests.map(async (req: AnyType) => {
        const requesterName = req.requester
          ? req.requester.fullName ||
            `${req.requester.firstName || ""} ${req.requester.lastName || ""}`.trim() ||
            req.requester.email?.split("@")[0] ||
            "Unknown"
          : req.requesterId
            ? DELETED_ACCOUNT_PLACEHOLDER
            : "Unknown";

        const targetName = req.contact
          ? req.contact.firstName && req.contact.lastName
            ? `${req.contact.firstName} ${req.contact.lastName}`
            : req.contact.email?.split("@")[0] || "Unknown"
          : req.contactId
            ? DELETED_ACCOUNT_PLACEHOLDER
            : "Unknown";

        // Get scheduled meeting details for full datetime with timezone
        let meetingStartTime: string | null = null;
        let meetingTimezone: string | null = null;
        let scheduledMeeting: AnyType = null;

        if (
          [
            IntroductionStatus.MEETING_BOOKED,
            IntroductionStatus.MEETING_RESCHEDULED,
            IntroductionStatus.MEETING_COMPLETED,
            IntroductionStatus.PEER_FEEDBACK,
          ].includes(req.status)
        ) {
          scheduledMeeting =
            await this.calendarService.getScheduledMeetingByIntroductionRequestId(
              req.id
            );
          if (scheduledMeeting) {
            meetingStartTime =
              scheduledMeeting.meetingDate?.toISOString() || null;
            const metadata = scheduledMeeting.metadata as
              | { timezone?: string }
              | AnyType;
            const { timezone } = metadata || {};
            meetingTimezone = timezone || "UTC";
          }
        }

        // Get transaction data for actual payment amounts (5%/95% split model)
        const transactionData =
          await this.financesService.getIntroductionTransactionByRequestId(
            req.id
          );

        // Get payment stages for backward compatibility
        let initialStage = null;
        let remainingStage = null;
        if (transactionData) {
          const transactionId = transactionData.id as string;
          const paymentStages =
            await this.financesService.getPaymentStagesByTransactionId(
              transactionId
            );
          initialStage = paymentStages.find(
            (s) => s.stageName === "intro_email_sent"
          );
          remainingStage = paymentStages.find(
            (s) => s.stageName === "meeting_booked"
          );
        }

        const transaction = transactionData as AnyType;

        const meetingDate = meetingStartTime
          ? toUTC(meetingStartTime).toISOString()
          : null;

        // Convert profile photo URLs to full URLs using profile object conversion
        if (req.requester) {
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            req.requester
          );
        }
        if (req.contact) {
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            req.contact
          );
        }
        const requesterPhotoUrl = req.requester?.profilePhotoUrl || null;
        const targetPhotoUrl = req.contact?.profilePhotoUrl || null;

        // Get prospect organizations
        const prospectUserId = req.contactId
          ? contactIdToRegisteredUserId.get(req.contactId)
          : undefined;
        const targetOrganizations = prospectUserId
          ? (prospectOrgsByUserId.get(prospectUserId) ?? [])
          : [];

        // Query user's own feedback for this introduction
        const feedback = await this.db.query.introductionFeedback.findFirst({
          where: and(
            eq(schema.introductionFeedback.introductionId, req.id),
            eq(schema.introductionFeedback.feedbackFromUserId, userId)
          ),
        });

        return {
          id: req.id,
          requesterName,
          requesterCompany: req.requester
            ? req.requester.company || "Unknown Company"
            : req.requesterId
              ? "Deleted"
              : "Unknown Company",
          requesterPhotoUrl,
          targetName,
          targetCompany: req.contact
            ? req.contact.company || "Unknown Company"
            : req.contactId
              ? "Deleted"
              : "Unknown Company",
          targetPhotoUrl,
          // Prospect details
          targetTitle: req.contact?.title || null,
          targetIndustry: req.contact?.industry || null,
          targetLinkedinUrl: req.contact?.linkedin || null,
          targetLocation: req.contact?.location || null,
          targetEmployees: req.contact?.employees || null,
          targetCompanyIndustry: req.contact?.companyIndustry || null,
          targetCompanyDescription: req.contact?.companyDescription || null,
          targetLinkedinConnections: req.contact?.linkedinConnections || null,
          // Target/Prospect contact fields - ensure all fields match inbox API
          targetEmail: req.contact?.email ? maskEmail(req.contact.email) : null,
          targetWebsiteUrl:
            req.contact?.website || req.contact?.websiteUrl || null,
          targetCompanyLinkedinUrl: req.contact?.companyLinkedinUrl || null,
          // Requester details
          requesterId: req.requester?.id || req.requesterId || null,
          requesterTitle: req.requester?.jobTitle || null,
          requesterIndustry: req.requester?.industry || null,
          requesterLinkedinUrl: req.requester?.linkedinUrl || null,
          requesterLocation: req.requester?.location || null,
          requesterWebsiteUrl: req.requester?.websiteUrl || null,
          requesterTrustScore: req.requester?.trustScore || 0,
          requesterBio: req.requester?.bio || null,
          // Requester contact fields - ensure email is always included
          requesterEmail: req.requester?.email
            ? maskEmail(req.requester.email)
            : null,
          requesterProducts: req.requester?.products || null,
          requesterUniqueSellingProposition:
            req.requester?.uniqueSellingProposition || null,
          requesterTargetMarket: req.requester?.targetMarket || null,
          requesterCompanySize: req.requester?.companySize || null,
          requesterRevenueRange: req.requester?.revenueRange || null,
          requesterKeyCredentials: req.requester?.keyCredentials || null,
          // Target/Prospect additional fields
          targetBio: null, // Contacts don't have bio field
          bountyAmount: req.bountyAmount || "0",
          stage: req.status,
          lastActivity: req.updatedAt || req.createdAt,
          createdAt: req.createdAt ? req.createdAt.toISOString() : null,
          meetingDate,
          meetingStartTime,
          meetingTimezone,
          requesterMeetingUrl: req.requesterMeetingUrl || null,
          meetingTitle: req.meetingTitle || null,
          meetingDescription: req.meetingDescription || null,
          additionalContext: req.additionalContext || null,
          payoutReleased: req.payoutReleased === true,
          payoutTriggeredBy: req.payoutTriggeredBy || null,
          // User's submitted feedback
          rating: feedback ? Number(feedback.rating) : null,
          feedbackComments: feedback?.feedbackText || null,
          // Transaction data for 5%/95% payment split display (from payment_stages)
          initialChargeAmount: initialStage?.amount
            ? Number(initialStage.amount)
            : null,
          initialChargeCaptured: !!initialStage?.capturedAt,
          initialChargeCapturedAt:
            initialStage?.capturedAt?.toISOString() || null,
          remainingChargeAmount: remainingStage?.amount
            ? Number(remainingStage.amount)
            : null,
          remainingChargeCaptured: !!remainingStage?.capturedAt,
          remainingChargeCapturedAt:
            remainingStage?.capturedAt?.toISOString() || null,
          platformCommissionAmount: transaction?.platformCommissionAmount
            ? Number(transaction.platformCommissionAmount)
            : null,
          connectorPayoutAmount: transaction?.connectorPayoutAmount
            ? Number(transaction.connectorPayoutAmount)
            : null,
          requesterOrganizations: req.requester?.id
            ? (pipelineOrgsByUser.get(req.requester.id) ?? [])
            : [],
          targetOrganizations,
        };
      })
    );

    return formattedRequests;
  }

  async getArchivedIntroductions(userId: string, searchRaw?: string) {
    // Get all archived requests where user is the connector
    const requests = await this.getIntroductionRequestsByContactOwnerId(userId);

    // Filter: connector-archived OR requester-withdrawn (still linked via acceptedBy)
    let archivedRequests = requests.filter(
      (r: AnyType) => r.connectorArchived || r.requesterArchived
    );

    archivedRequests = filterByPipelineSearch(
      archivedRequests,
      searchRaw,
      connectorIntroductionSearchHaystack
    );

    const archiveRequesterIds = [
      ...new Set(
        archivedRequests
          .map((r: AnyType) => r.requester?.id)
          .filter(Boolean) as string[]
      ),
    ];
    const archiveOrgsByUser =
      await this.profilesService.getOrganizationsForUserIds(
        archiveRequesterIds
      );

    // Resolve prospect user ids via email hashes for organization data
    const prospectContactIds = [
      ...new Set(
        archivedRequests
          .map((r: AnyType) => r.contactId)
          .filter((id): id is number => !!id)
      ),
    ];

    // Batch-load contact orgs via hash → registered user → organizations
    const { contactIdToRegisteredUserId, orgsByUserId: prospectOrgsByUserId } =
      await this.contactOrganizationEnricher.getContactOrganizationsMap(
        prospectContactIds
      );

    // Format for pipeline display
    return Promise.all(
      archivedRequests.map(async (req: AnyType) => {
        const requesterName = req.requester
          ? req.requester.fullName ||
            `${req.requester.firstName || ""} ${req.requester.lastName || ""}`.trim() ||
            req.requester.email?.split("@")[0] ||
            "Unknown"
          : req.requesterId
            ? DELETED_ACCOUNT_PLACEHOLDER
            : "Unknown";

        const targetName = req.contact
          ? req.contact.firstName && req.contact.lastName
            ? `${req.contact.firstName} ${req.contact.lastName}`
            : req.contact.email?.split("@")[0] || "Unknown"
          : req.contactId
            ? DELETED_ACCOUNT_PLACEHOLDER
            : "Unknown";

        // Convert profile photo URLs to full URLs using profile object conversion
        if (req.requester) {
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            req.requester
          );
        }
        if (req.contact) {
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            req.contact
          );
        }
        const requesterPhotoUrl = req.requester?.profilePhotoUrl || null;
        const targetPhotoUrl = req.contact?.profilePhotoUrl || null;

        // Get prospect organizations
        const prospectUserId = req.contactId
          ? contactIdToRegisteredUserId.get(req.contactId)
          : undefined;
        const targetOrganizations = prospectUserId
          ? (prospectOrgsByUserId.get(prospectUserId) ?? [])
          : [];

        // Query user's own feedback for this introduction
        const feedback = await this.db.query.introductionFeedback.findFirst({
          where: and(
            eq(schema.introductionFeedback.introductionId, req.id),
            eq(schema.introductionFeedback.feedbackFromUserId, userId)
          ),
        });

        return {
          id: req.id,
          requesterName,
          requesterCompany: req.requester
            ? req.requester.company || "Unknown Company"
            : req.requesterId
              ? "Deleted"
              : "Unknown Company",
          requesterPhotoUrl,
          // Requester details
          requesterId: req.requester?.id || null,
          requesterTitle: req.requester?.jobTitle || null,
          requesterIndustry: req.requester?.industry || null,
          requesterLinkedinUrl: req.requester?.linkedinUrl || null,
          requesterLocation: req.requester?.location || null,
          requesterTrustScore: req.requester?.trustScore || 0,
          requesterBio: req.requester?.bio || null,
          requesterProducts: req.requester?.products || null,
          requesterUniqueSellingProposition:
            req.requester?.uniqueSellingProposition || null,
          requesterTargetMarket: req.requester?.targetMarket || null,
          requesterCompanySize: req.requester?.companySize || null,
          requesterRevenueRange: req.requester?.revenueRange || null,
          requesterKeyCredentials: req.requester?.keyCredentials || null,
          // Requester contact fields
          requesterEmail: req.requester?.email
            ? maskEmail(req.requester.email)
            : null,
          requesterWebsiteUrl: req.requester?.websiteUrl || null,
          targetName,
          targetCompany: req.contact
            ? req.contact.company || "Unknown Company"
            : req.contactId
              ? "Deleted"
              : "Unknown Company",
          targetPhotoUrl,
          // Target/Prospect details
          targetTitle: req.contact?.title || null,
          targetIndustry: req.contact?.industry || null,
          targetLinkedinUrl: req.contact?.linkedin || null,
          targetLocation: req.contact?.location || null,
          targetEmployees: req.contact?.employees || null,
          targetLinkedinConnections: req.contact?.linkedinConnections || null,
          targetCompanyIndustry: req.contact?.companyIndustry || null,
          targetCompanyDescription: req.contact?.companyDescription || null,
          // Target/Prospect contact fields - ensure all fields match inbox API
          targetEmail: req.contact?.email ? maskEmail(req.contact.email) : null,
          targetWebsiteUrl:
            req.contact?.website || req.contact?.websiteUrl || null,
          targetCompanyLinkedinUrl: req.contact?.companyLinkedinUrl || null,
          targetBio: null, // Contacts don't have bio field
          bountyAmount: req.bountyAmount || "0",
          stage: req.status,
          lastActivity: req.updatedAt || req.createdAt,
          meetingDate: null,
          completedDate:
            req.meetingCompletedAt || req.updatedAt || req.createdAt,
          purpose: req.meetingDescription || "",
          meetingTitle: req.meetingTitle || null,
          meetingDescription: req.meetingDescription || null,
          additionalContext: req.additionalContext || null,
          requesterMeetingUrl: req.requesterMeetingUrl || null,
          requesterMeetingPlatform: req.requesterMeetingPlatform || null,
          requesterDefaultDuration: req.requesterDefaultDuration || null,
          requesterAvailability: req.requesterAvailability || null,
          preferredDuration: req.preferredDuration || null,
          preferredTimeSlots: req.preferredTimeSlots || null,
          timeZone: req.timeZone || null,
          schedulingLink: req.schedulingLink || null,
          meetingType: req.meetingType || null,
          meetingPreferences: req.meetingPreferences || null,
          createdAt: req.createdAt ? req.createdAt.toISOString() : null,
          updatedAt: req.updatedAt ? req.updatedAt.toISOString() : null,
          rating: feedback ? Number(feedback.rating) : null,
          feedbackComments: feedback?.feedbackText || null,
          requesterArchiveReason: req.requesterArchiveReason || null,
          requesterArchiveNotes: req.requesterArchiveNotes || null,
          requesterArchivedAt: req.requesterArchivedAt
            ? req.requesterArchivedAt.toISOString()
            : null,
          requesterOrganizations: req.requester?.id
            ? (archiveOrgsByUser.get(req.requester.id) ?? [])
            : [],
          targetOrganizations,
        };
      })
    );
  }

  /**
   * Get introduction pipeline statistics for a connector.
   * Includes requests where user is contactOwnerId or a potential connector.
   */
  async getConnectorPipelineStats(
    userId: string,
    options?: ConnectorPipelineStatsOptions
  ) {
    const searchNeedle = normalizePipelineSearch(options?.search);
    const statsContext = options?.statsContext;

    const inboxSearchRaw =
      statsContext === "inbox" ? options?.search : undefined;
    const allInboxRequests = await this.getInboxRequestRowsUnenriched(
      userId,
      inboxSearchRaw
    );

    // Get requests where user is already the contactOwnerId (for archived/active counts)
    // Use lightweight mode for stats - we only need status and archived flags
    const contactOwnerRequests =
      await this.getIntroductionRequestsByContactOwnerId(userId, {
        lightweight: true,
      });

    // Inbox Tab: ALL non-archived requests (from unenriched inbox rows)
    const inboxCount = allInboxRequests.length;

    // Calculate pending (unanswered) requests in inbox
    // This includes both contactOwnerId pending AND potential connector pending
    const pendingInbox = allInboxRequests.filter(
      (r: AnyType) => r.status === IntroductionStatus.PENDING
    ).length;

    // Pipeline Tab: Only active (in-progress) non-archived requests
    const activeStatuses = [
      IntroductionStatus.INTRO_SENT,
      IntroductionStatus.MEETING_SCHEDULED,
      IntroductionStatus.MEETING_BOOKED,
      IntroductionStatus.MEETING_RESCHEDULED,
      IntroductionStatus.MEETING_COMPLETED,
      IntroductionStatus.PEER_FEEDBACK,
    ];
    let activePipelineCount = contactOwnerRequests.filter(
      (r: AnyType) =>
        activeStatuses.includes(r.status) &&
        !r.connectorArchived &&
        !r.requesterArchived &&
        r.status !== IntroductionStatus.ARCHIVED
    ).length;

    // Archive Tab: connector-archived OR requester-withdrawn intros
    let archivedCount = contactOwnerRequests.filter(
      (r: AnyType) => r.connectorArchived || r.requesterArchived
    ).length;

    // Calculate success rate stats using the centralized Trust Score service
    // This ensures consistency across the whole platform
    const successRateStats =
      await this.successRateTrustScoreService.calculateSuccessRateStats(userId);

    const successRate = Number(successRateStats?.successRate ?? 0);
    let unfulfilledCount = Number(successRateStats?.failedCount ?? 0);

    if (searchNeedle && statsContext === "pipeline") {
      activePipelineCount = filterByPipelineSearch(
        contactOwnerRequests.filter(
          (r: AnyType) =>
            activeStatuses.includes(r.status) &&
            !r.connectorArchived &&
            !r.requesterArchived &&
            r.status !== IntroductionStatus.ARCHIVED
        ),
        options?.search,
        connectorIntroductionSearchHaystack
      ).length;
    } else if (searchNeedle && statsContext === "archive") {
      archivedCount = filterByPipelineSearch(
        contactOwnerRequests.filter(
          (r: AnyType) => r.connectorArchived || r.requesterArchived
        ),
        options?.search,
        connectorIntroductionSearchHaystack
      ).length;
    } else if (searchNeedle && statsContext === "unfulfilled") {
      const list = await this.getUnfulfilledIntroductions(
        userId,
        options?.search
      );
      unfulfilledCount = list.length;
    }

    // Use net earnings (released payouts) for consistency with payouts tab
    const financialSummary =
      await this.financesService.getFinancialSummary(userId);
    const potentialEarnings = Number(financialSummary?.availableBalance ?? 0);

    return {
      inbox: {
        total: inboxCount,
        pending: pendingInbox,
      },
      pipeline: {
        active: activePipelineCount,
        archived: archivedCount,
        unfulfilled: unfulfilledCount,
      },
      potentialEarnings,
      successRate,
    };
  }

  /**
   * Check requester eligibility to make new introduction requests
   * Consolidated API that checks:
   * 1. Calendar connection status
   * 2. Pending feedback status
   * Returns only flags for optimal performance
   */
  async checkRequesterEligibility(userId: string) {
    // Check calendar integration status
    let hasCalendarConnected = false;
    let calendarProvider: string | null = null;

    try {
      const calendarIntegrations =
        await this.calendarService.getUserCalendarIntegrations(userId);
      if (calendarIntegrations && calendarIntegrations.length > 0) {
        const activeIntegration = calendarIntegrations.find(
          (integration: AnyType) => integration.isActive === true
        );
        hasCalendarConnected = !!activeIntegration;
        calendarProvider = activeIntegration?.provider || null;
      }
    } catch (error) {
      this.logger.error("Error checking calendar integration:", error);
    }

    // Check pending feedback status
    let hasPendingFeedback = false;
    let pendingFeedbackCount = 0;

    try {
      const requests = await this.getIntroductionRequestsByRequesterId(userId);
      const pendingFeedbackRequests = requests.filter((req: AnyType) =>
        isPendingRequesterFeedback(req)
      );
      pendingFeedbackCount = pendingFeedbackRequests.length;
      hasPendingFeedback = pendingFeedbackCount > 0;
    } catch (error) {
      this.logger.error("Error checking pending feedback:", error);
    }

    // Determine if user can make new requests
    const canMakeRequest = hasCalendarConnected && !hasPendingFeedback;

    return {
      canMakeRequest,
      hasCalendarConnected,
      calendarProvider,
      hasPendingFeedback,
      pendingFeedbackCount,
    };
  }

  /**
   * Get the count of active introduction requests for a requester
   * Active requests are those with status in ['pending', 'accepted', 'intro_sent', 'meeting_booked']
   * AND meeting_completed_by_requester = false
   * @param userId - The requester's user ID
   * @returns The count of active introduction requests
   */
  async getActiveCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(schema.introductionRequests)
      .where(
        and(
          eq(schema.introductionRequests.requesterId, userId),
          inArray(schema.introductionRequests.status, [
            IntroductionStatus.PENDING,
            IntroductionStatus.ACCEPTED,
            IntroductionStatus.INTRO_SENT,
            IntroductionStatus.MEETING_BOOKED,
            IntroductionStatus.MEETING_RESCHEDULED,
            IntroductionStatus.MEETING_COMPLETED,
          ]),
          eq(schema.introductionRequests.meetingCompletedByRequester, false)
        )
      );
    return Number(result[0]?.count || 0);
  }

  async getIntroductionRequest(id: string, includeTransactionData = true) {
    const request = includeTransactionData
      ? await this.db.query.introductionRequests.findFirst({
          where: eq(schema.introductionRequests.id, id),
        })
      : await this.db
          .select({
            id: schema.introductionRequests.id,
            requesterId: schema.introductionRequests.requesterId,
            contactId: schema.introductionRequests.contactId,
            status: schema.introductionRequests.status,
            createdAt: schema.introductionRequests.createdAt,
            updatedAt: schema.introductionRequests.updatedAt,
            meetingDescription: schema.introductionRequests.meetingDescription,
            meetingTitle: schema.introductionRequests.meetingTitle,
            bountyAmount: schema.introductionRequests.bountyAmount,
            adjustedBountyAmount:
              schema.introductionRequests.adjustedBountyAmount,
            connectorArchived: schema.introductionRequests.connectorArchived,
            requesterArchived: schema.introductionRequests.requesterArchived,
            additionalContext: schema.introductionRequests.additionalContext,
            contactName: schema.introductionRequests.contactName,
            acceptedBy: schema.introductionRequests.acceptedBy, // Added for lightweight path
            bookingToken: schema.introductionRequests.bookingToken, // Added for lightweight path
            bookingTokenExpiresAt:
              schema.introductionRequests.bookingTokenExpiresAt, // Added for lightweight path
          })
          .from(schema.introductionRequests)
          .where(eq(schema.introductionRequests.id, id))
          .then((results) => (results[0] as AnyType) || null);

    if (!request) return null;

    const contact = request.contactId
      ? await this.contactsService.getContactDetailsForRequest(
          request.contactId
        )
      : null;

    const requesterRaw = request.requesterId
      ? await this.profilesService.getProfileById(request.requesterId)
      : null;

    if (!includeTransactionData) {
      const requester = request.requesterId
        ? await this.getProfileForInbox(request.requesterId)
        : null;
      const contactForInbox = request.contactId
        ? await this.getContactForInbox(request.contactId)
        : null;

      return {
        id: request.id,
        requesterId: request.requesterId,
        contactId: request.contactId,
        bountyAmount: request.bountyAmount,
        meetingDescription: request.meetingDescription,
        meetingTitle: request.meetingTitle,
        additionalContext: request.additionalContext,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        connectorArchived: request.connectorArchived,
        requesterArchived: request.requesterArchived,
        requester,
        contact: contactForInbox,
      };
    }

    const requester = requesterRaw;
    const contactOwnerRaw = (request as AnyType).acceptedBy
      ? await this.profilesService.getProfileById(
          (request as AnyType).acceptedBy
        )
      : null;
    const contactOwner = contactOwnerRaw;

    const transaction = await this.db.query.introductionTransactions.findFirst({
      where: and(
        eq(schema.introductionTransactions.introductionRequestId, id),
        eq(schema.introductionTransactions.isActive, true)
      ),
    });

    const payout = await this.db.query.payoutHistory.findFirst({
      where: eq(schema.payoutHistory.introductionRequestId, id),
    });

    return {
      ...request,
      requester:
        requester ||
        (request.requesterId
          ? {
              fullName: DELETED_ACCOUNT_PLACEHOLDER,
              firstName: "User's Account",
              lastName: "deleted",
              email: "Deleted",
              company: "Deleted",
            }
          : null),
      contact:
        contact ||
        (request.contactId
          ? {
              firstName: "User's Account",
              lastName: "deleted",
              fullName: DELETED_ACCOUNT_PLACEHOLDER,
              email: "Deleted",
              company: "Deleted",
            }
          : null),
      contactOwner:
        contactOwner ||
        (request.acceptedBy
          ? {
              fullName: DELETED_ACCOUNT_PLACEHOLDER,
              firstName: "User's Account",
              lastName: "deleted",
              email: "Deleted",
              company: "Deleted",
            }
          : null),
      ...(await this.financesService.mergeTransactionData(transaction)),
      ...this.financesService.mergePayoutData(payout),
    };
  }

  async getIntroductionRequestByIdSlim(id: string) {
    const result = await this.db
      .select({
        id: schema.introductionRequests.id,
        requesterId: schema.introductionRequests.requesterId,
        contactOwnerId: schema.introductionRequests.acceptedBy,
        acceptedBy: schema.introductionRequests.acceptedBy,
        contactId: schema.introductionRequests.contactId,
        status: schema.introductionRequests.status,
        meetingDescription: schema.introductionRequests.meetingDescription,
        meetingTitle: schema.introductionRequests.meetingTitle,
        bountyAmount: schema.introductionRequests.bountyAmount,
        adjustedBountyAmount: schema.introductionRequests.adjustedBountyAmount,
        additionalContext: schema.introductionRequests.additionalContext,
        contactName: schema.introductionRequests.contactName,
        createdAt: schema.introductionRequests.createdAt,
        updatedAt: schema.introductionRequests.updatedAt,
      })
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.id, id))
      .limit(1);

    return result[0] || null;
  }

  async getIntroductionRequestsByRequesterId(requesterId: string) {
    const requests = await this.db.query.introductionRequests.findMany({
      where: eq(schema.introductionRequests.requesterId, requesterId),
      orderBy: desc(schema.introductionRequests.createdAt),
      with: {
        pricing: true,
      },
    });

    return Promise.all(
      requests.map(async (request) => {
        const contact = request.contactId
          ? await this.contactsService.getContactDetailsForRequest(
              request.contactId
            )
          : null;
        const requesterRaw = request.requesterId
          ? await this.profilesService.getProfileById(request.requesterId)
          : null;
        const contactOwnerRaw = request.acceptedBy
          ? await this.profilesService.getProfileById(request.acceptedBy)
          : null;
        const {
          meetingPlatform: _meetingPlatform,
          ...requestWithoutMeetingPlatform
        } = request as AnyType;

        const requester = requesterRaw;
        const contactOwner = contactOwnerRaw;

        const transaction =
          await this.db.query.introductionTransactions.findFirst({
            where: and(
              eq(
                schema.introductionTransactions.introductionRequestId,
                request.id
              ),
              eq(schema.introductionTransactions.isActive, true)
            ),
          });
        const payout = await this.db.query.payoutHistory.findFirst({
          where: eq(schema.payoutHistory.introductionRequestId, request.id),
        });
        return {
          ...requestWithoutMeetingPlatform,
          ...mergeRequesterFeeFields(request, request.pricing),
          requester,
          contact,
          contactOwner,
          ...(await this.financesService.mergeTransactionData(transaction)),
          ...this.financesService.mergePayoutData(payout),
        };
      })
    );
  }

  async getIntroductionRequestsByContactOwnerId(
    contactOwnerId: string,
    options?: { lightweight?: boolean }
  ) {
    const lightweight = options?.lightweight ?? false;

    const requests = await this.db
      .select({
        id: schema.introductionRequests.id,
        requesterId: schema.introductionRequests.requesterId,
        contactId: schema.introductionRequests.contactId,
        acceptedBy: schema.introductionRequests.acceptedBy,
        status: schema.introductionRequests.status,
        createdAt: schema.introductionRequests.createdAt,
        updatedAt: schema.introductionRequests.updatedAt,
        meetingDescription: schema.introductionRequests.meetingDescription,
        meetingTitle: schema.introductionRequests.meetingTitle,
        bountyAmount: schema.introductionRequests.bountyAmount,
        adjustedBountyAmount: schema.introductionRequests.adjustedBountyAmount,
        connectorArchived: schema.introductionRequests.connectorArchived,
        requesterArchived: schema.introductionRequests.requesterArchived,
        requesterArchiveReason:
          schema.introductionRequests.requesterArchiveReason,
        requesterArchiveNotes:
          schema.introductionRequests.requesterArchiveNotes,
        requesterArchivedAt: schema.introductionRequests.requesterArchivedAt,
        additionalContext: schema.introductionRequests.additionalContext,
        contactName: schema.introductionRequests.contactName,
      })
      .from(schema.introductionRequests)
      .where(eq(schema.introductionRequests.acceptedBy, contactOwnerId))
      .orderBy(desc(schema.introductionRequests.createdAt));

    if (lightweight) {
      return Promise.all(
        requests.map(async (request) => {
          const requester = request.requesterId
            ? await this.getProfileForInbox(request.requesterId)
            : null;
          const contact = request.contactId
            ? await this.getContactForInbox(request.contactId)
            : null;

          return {
            id: request.id,
            requesterId: request.requesterId,
            contactId: request.contactId,
            bountyAmount: request.bountyAmount,
            meetingTitle: request.meetingTitle,
            meetingDescription: request.meetingDescription,
            additionalContext: request.additionalContext,
            status: request.status,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            connectorArchived: request.connectorArchived,
            requesterArchived: request.requesterArchived,
            requesterArchiveReason: request.requesterArchiveReason,
            requesterArchiveNotes: request.requesterArchiveNotes,
            requesterArchivedAt: request.requesterArchivedAt,
            requester,
            contact,
          };
        })
      );
    }

    return Promise.all(
      requests.map(async (request) => {
        const contact = request.contactId
          ? await this.contactsService.getContactDetailsForRequest(
              request.contactId
            )
          : null;
        const requesterRaw = request.requesterId
          ? await this.profilesService.getProfileById(request.requesterId)
          : null;
        const contactOwnerRaw = request.acceptedBy
          ? await this.profilesService.getProfileById(request.acceptedBy)
          : null;

        // Convert profile photo URLs
        if (requesterRaw) {
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            requesterRaw
          );
        }
        if (contact) {
          await this.profilesService.convertProfilePhotoUrlToFullUrl(contact);
        }
        if (contactOwnerRaw) {
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            contactOwnerRaw
          );
        }

        const requester = requesterRaw;
        const contactOwner = contactOwnerRaw;

        return {
          ...request,
          requester:
            requester ||
            (request.requesterId
              ? {
                  fullName: DELETED_ACCOUNT_PLACEHOLDER,
                  firstName: "User's Account",
                  lastName: "deleted",
                  email: "Deleted",
                  company: "Deleted",
                }
              : null),
          contact:
            contact ||
            (request.contactId
              ? {
                  firstName: "User's Account",
                  lastName: "deleted",
                  fullName: DELETED_ACCOUNT_PLACEHOLDER,
                  email: "Deleted",
                  company: "Deleted",
                }
              : null),
          contactOwner:
            contactOwner ||
            (request.acceptedBy
              ? {
                  fullName: DELETED_ACCOUNT_PLACEHOLDER,
                  firstName: "User's Account",
                  lastName: "deleted",
                  email: "Deleted",
                  company: "Deleted",
                }
              : null),
        };
      })
    );
  }

  async updateIntroductionRequestInDb(id: string, data: AnyType) {
    const [request] = await this.db
      .update(schema.introductionRequests)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.introductionRequests.id, id))
      .returning();
    return request;
  }

  async getEmailLogByResendId(resendId: string) {
    return await this.db.query.introductionEmailLogs.findFirst({
      where: eq(schema.introductionEmailLogs.resendEmailId, resendId),
    });
  }

  async updateProfile(
    id: string,
    data: Partial<schema.User>
  ): Promise<schema.User | undefined> {
    const [profile] = await this.db
      .update(schema.users)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.users.id, id))
      .returning();
    return profile;
  }

  private async getProfileForInbox(profileId: string) {
    if (!profileId) return null;
    const result = await this.db
      .select({
        id: schema.users.id,
        fullName: schema.users.fullName,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        company: schema.users.company,
        jobTitle: schema.users.jobTitle,
        industry: schema.users.industry,
        bio: schema.users.bio,
        websiteUrl: schema.users.websiteUrl,
        linkedinUrl: schema.users.linkedinUrl,
        profilePhotoUrl: schema.users.profilePhotoUrl,
        trustScore: schema.users.trustScore,
        location: schema.users.location,
        products: schema.users.products,
        uniqueSellingProposition: schema.users.uniqueSellingProposition,
        targetMarket: schema.users.targetMarket,
        companySize: schema.users.companySize,
        revenueRange: schema.users.revenueRange,
        keyCredentials: schema.users.keyCredentials,
      })
      .from(schema.users)
      .where(eq(schema.users.id, profileId))
      .limit(1);
    const profile = result[0] || null;

    if (!profile) {
      return {
        id: profileId,
        fullName: DELETED_ACCOUNT_PLACEHOLDER,
        firstName: "User's Account",
        lastName: "deleted",
        email: "Deleted",
        company: "Deleted",
        organizations: [],
      } as AnyType;
    }

    await this.profilesService.convertProfilePhotoUrlToFullUrl(profile);

    // Fetch user's organizations
    const organizations =
      await this.profilesService.getUserOrganizations(profileId);

    return {
      ...profile,
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        isVerified: org.isVerified,
      })),
    };
  }

  private async getContactForInbox(contactId: number) {
    if (!contactId) return null;
    const contact =
      await this.contactsService.getContactDetailsForRequest(contactId);

    if (!contact) {
      return {
        id: contactId,
        firstName: "User's Account",
        lastName: "deleted",
        fullName: DELETED_ACCOUNT_PLACEHOLDER,
        email: "Deleted",
        company: "Deleted",
      } as AnyType;
    }

    // Convert contact photo URL if it exists
    const contactWithPhoto = {
      ...contact,
      profilePhotoUrl: contact.profilePhotoUrl || null,
    };
    if (contactWithPhoto.profilePhotoUrl) {
      await this.profilesService.convertProfilePhotoUrlToFullUrl(
        contactWithPhoto
      );
    }

    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      company: contact.company,
      jobTitle: contact.title,
      linkedinUrl: contact.linkedin,
      websiteUrl: contact.website,
      profilePhotoUrl: contactWithPhoto.profilePhotoUrl || null,
      industry: contact.industry,
      location: contact.location,
      employees: contact.employees,
      companyIndustry: contact.companyIndustry,
      companyDescription: contact.companyDescription,
      linkedinConnections: contact.linkedinConnections,
      companyLinkedinUrl: contact.companyLinkedinUrl,
    };
  }

  /**
   * Get unfulfilled introductions for a connector
   * Returns fulfillment attempts with joined introduction request data
   */
  async getUnfulfilledIntroductions(connectorId: string, searchRaw?: string) {
    const attempts = await this.db
      .select({
        id: schema.introductionFulfillmentAttempts.id,
        introductionRequestId:
          schema.introductionFulfillmentAttempts.introductionRequestId,
        connectorId: schema.introductionFulfillmentAttempts.connectorId,
        failureStage: schema.introductionFulfillmentAttempts.failureStage,
        failureReason: schema.introductionFulfillmentAttempts.failureReason,
        failureNotes: schema.introductionFulfillmentAttempts.failureNotes,
        createdAt: schema.introductionFulfillmentAttempts.createdAt,
        targetName: schema.introductionRequests.contactName,
        bountyAmount: schema.introductionRequests.bountyAmount,
        requesterId: schema.introductionRequests.requesterId,
        contactId: schema.introductionRequests.contactId,
        meetingTitle: schema.introductionRequests.meetingTitle,
        meetingDescription: schema.introductionRequests.meetingDescription,
        targetCompany: schema.contacts.company,
        targetPhotoUrl: schema.contacts.profilePhotoUrl,
      })
      .from(schema.introductionFulfillmentAttempts)
      .leftJoin(
        schema.introductionRequests,
        eq(
          schema.introductionFulfillmentAttempts.introductionRequestId,
          schema.introductionRequests.id
        )
      )
      .leftJoin(
        schema.contacts,
        eq(schema.introductionRequests.contactId, schema.contacts.id)
      )
      .where(
        eq(schema.introductionFulfillmentAttempts.connectorId, connectorId)
      )
      .orderBy(desc(schema.introductionFulfillmentAttempts.createdAt));

    // Get requester profiles with company and photo
    const requesterIds = [
      ...new Set(attempts.map((a) => a.requesterId).filter(Boolean)),
    ] as string[];

    const requesterProfiles =
      requesterIds.length > 0
        ? await this.db
            .select({
              id: schema.users.id,
              fullName: schema.users.fullName,
              company: schema.users.company,
              profilePhotoUrl: schema.users.profilePhotoUrl,
            })
            .from(schema.users)
            .where(inArray(schema.users.id, requesterIds))
        : [];

    const requesterMap = new Map(requesterProfiles.map((p) => [p.id, p]));

    const rowsForSearch = attempts.map((attempt) => {
      const requester = requesterMap.get(attempt.requesterId || "");
      return {
        ...attempt,
        requesterName:
          requester?.fullName ||
          (attempt.requesterId ? DELETED_ACCOUNT_PLACEHOLDER : null),
        requesterCompany:
          requester?.company || (attempt.requesterId ? "Deleted" : null),
        requesterPhotoUrl: requester?.profilePhotoUrl || null,
        targetPhotoUrl: attempt.targetPhotoUrl || null,
      };
    });

    const filteredAttempts = filterByPipelineSearch(
      rowsForSearch,
      searchRaw,
      unfulfilledIntroductionSearchHaystack
    );

    return Promise.all(
      filteredAttempts.map(async (row) => {
        let { requesterPhotoUrl } = row;
        if (requesterPhotoUrl) {
          const requesterProfile = { profilePhotoUrl: requesterPhotoUrl };
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            requesterProfile
          );
          requesterPhotoUrl = requesterProfile.profilePhotoUrl;
        }

        let { targetPhotoUrl } = row;
        if (targetPhotoUrl) {
          const targetProfile = { profilePhotoUrl: targetPhotoUrl };
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            targetProfile
          );
          targetPhotoUrl = targetProfile.profilePhotoUrl;
        }

        return {
          ...row,
          requesterPhotoUrl,
          targetPhotoUrl,
        };
      })
    );
  }
}
