import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { eq, and, inArray } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { FinancesService } from "modules/finances/finances.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { CalendarService } from "modules/calendar/calendar.service";
import { BountyStagesService } from "modules/bounty-stages/bounty-stages.service";
import { IntroductionPotentialConnectorsService } from "modules/introduction-potential-connectors/introduction-potential-connectors.service";
import { maskEmail } from "utils/maskingUtils";
import { mergeRequesterFeeFields } from "utils/introduction-request-fees.util";
import { MARKETPLACE_CLAIM_BLOCKING_STATUSES } from "./requester-archive.constants";
import { formatPipelineRequest } from "./requester-pipeline.helpers";
import { IntroductionsService } from "../introductions.service";
import { IntroductionStatus } from "../introductions.constants";
import {
  filterByPipelineSearch,
  normalizePipelineSearch,
  requesterIntroductionSearchHaystack,
} from "../pipeline-search.utils";

@Injectable()
export class RequesterPipelineService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    public readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(forwardRef(() => IntroductionsService))
    private readonly introductionsService: IntroductionsService,
    private readonly financesService: FinancesService,
    private readonly profilesService: ProfilesService,
    private readonly calendarService: CalendarService,
    private readonly bountyStagesService: BountyStagesService,
    private readonly potentialConnectorsService: IntroductionPotentialConnectorsService
  ) {}

  async getMyRequestsStats(
    userId: string,
    options?: { search?: string; statsContext?: "active" | "completed" }
  ) {
    const requests =
      await this.introductionsService.getIntroductionRequestsByRequesterId(
        userId
      );

    const pipelineStatuses = [
      IntroductionStatus.PENDING,
      IntroductionStatus.ACCEPTED,
      IntroductionStatus.DECLINED,
      IntroductionStatus.INTRO_SENT,
      IntroductionStatus.MEETING_SCHEDULED,
      IntroductionStatus.MEETING_BOOKED,
      IntroductionStatus.MEETING_RESCHEDULED,
      IntroductionStatus.MEETING_COMPLETED,
      IntroductionStatus.PEER_FEEDBACK,
    ];

    const pipelineRequests = requests.filter(
      (r: AnyType) =>
        pipelineStatuses.includes(r.status) && !r.requesterArchived
    );
    const archivedRequests = requests.filter(
      (r: AnyType) => r.requesterArchived
    );

    const basePipelineCount = pipelineRequests.length;
    const baseArchivedCount = archivedRequests.length;

    const searchNeedle = normalizePipelineSearch(options?.search);
    const statsContext = options?.statsContext;

    let displayedPipelineCount = basePipelineCount;
    let displayedArchivedCount = baseArchivedCount;

    if (searchNeedle && statsContext === "active") {
      displayedPipelineCount = filterByPipelineSearch(
        pipelineRequests,
        options?.search,
        requesterIntroductionSearchHaystack
      ).length;
    } else if (searchNeedle && statsContext === "completed") {
      displayedArchivedCount = filterByPipelineSearch(
        archivedRequests,
        options?.search,
        requesterIntroductionSearchHaystack
      ).length;
    }

    const financialSummary =
      await this.financesService.getFinancialSummary(userId);
    const businessValue = financialSummary?.totalSpent || 0;

    let nonArchivedForRate = requests.filter(
      (r: AnyType) => !r.requesterArchived
    );
    if (searchNeedle && statsContext === "active") {
      nonArchivedForRate = filterByPipelineSearch(
        pipelineRequests,
        options?.search,
        requesterIntroductionSearchHaystack
      );
    }

    const respondedRequests = nonArchivedForRate.filter(
      (r: AnyType) => r.status !== IntroductionStatus.PENDING
    ).length;
    const responseRate =
      nonArchivedForRate.length > 0
        ? Math.round((respondedRequests / nonArchivedForRate.length) * 100)
        : 0;

    return {
      pendingRequests: 0,
      activeRequests:
        searchNeedle && statsContext === "completed"
          ? basePipelineCount
          : displayedPipelineCount,
      completedRequests:
        searchNeedle && statsContext === "active"
          ? baseArchivedCount
          : displayedArchivedCount,
      totalRequests: displayedPipelineCount,
      totalAllRequests:
        searchNeedle && statsContext === "active"
          ? displayedPipelineCount
          : searchNeedle && statsContext === "completed"
            ? displayedArchivedCount
            : requests.length,
      businessValue,
      responseRate,
    };
  }

  async getRequestPipeline(userId: string, searchRaw?: string) {
    // Get all introduction requests where user is the requester (their perspective)
    const requests =
      await this.introductionsService.getIntroductionRequestsByRequesterId(
        userId
      );

    // Include all non-archived pipeline statuses (pending/accepted/declined + active stages)
    const pipelineStatuses = [
      IntroductionStatus.PENDING,
      IntroductionStatus.ACCEPTED,
      IntroductionStatus.DECLINED,
      IntroductionStatus.INTRO_SENT,
      IntroductionStatus.MEETING_SCHEDULED,
      IntroductionStatus.MEETING_BOOKED,
      IntroductionStatus.MEETING_RESCHEDULED,
      IntroductionStatus.MEETING_COMPLETED,
      IntroductionStatus.PEER_FEEDBACK,
    ];
    let pipelineRequests = requests.filter(
      (r: AnyType) =>
        pipelineStatuses.includes(r.status) && !r.requesterArchived
    );

    pipelineRequests = filterByPipelineSearch(
      pipelineRequests,
      searchRaw,
      requesterIntroductionSearchHaystack
    );

    const requestIds = pipelineRequests.map((r: AnyType) => r.id);
    const blockingClaimByRequestId = new Set<string>();
    if (requestIds.length > 0) {
      const blockingRows = await this.db
        .select({
          requestId: schema.marketplaceClaims.introductionRequestId,
        })
        .from(schema.marketplaceClaims)
        .where(
          and(
            inArray(schema.marketplaceClaims.introductionRequestId, requestIds),
            inArray(schema.marketplaceClaims.status, [
              ...MARKETPLACE_CLAIM_BLOCKING_STATUSES,
            ] as string[])
          )
        );
      for (const row of blockingRows) {
        blockingClaimByRequestId.add(row.requestId);
      }
    }

    // Get bounty stages to map stage_id to stage_order
    const bountyStages = await this.bountyStagesService.getBountyStages();
    const stageOrderMap: Record<string, number> = {};
    bountyStages.forEach((stage: AnyType) => {
      stageOrderMap[stage.stageId] = stage.stageOrder;
    });

    const formattedRequests = await Promise.all(
      pipelineRequests.map((req: AnyType) =>
        formatPipelineRequest(
          req,
          userId,
          stageOrderMap,
          this.db,
          this.profilesService,
          this.calendarService,
          this.financesService,
          this.potentialConnectorsService,
          {
            requesterArchiveBlockedByClaim: blockingClaimByRequestId.has(
              req.id
            ),
          }
        )
      )
    );

    return formattedRequests.sort((a, b) => a.stageOrder - b.stageOrder);
  }

  async getArchivedRequests(userId: string, searchRaw?: string) {
    // Get all archived requests where user is the requester
    const requests =
      await this.introductionsService.getIntroductionRequestsByRequesterId(
        userId
      );

    // Filter to only archived requests
    let archivedRequests = requests.filter((r: AnyType) => r.requesterArchived);

    archivedRequests = filterByPipelineSearch(
      archivedRequests,
      searchRaw,
      requesterIntroductionSearchHaystack
    );

    // Format for frontend display
    return Promise.all(
      archivedRequests.map(async (req: AnyType) => {
        const prospectName = req.contact
          ? req.contact.firstName && req.contact.lastName
            ? `${req.contact.firstName} ${req.contact.lastName}`
            : req.contact.email?.split("@")[0] || "Unknown"
          : req.contactId
            ? "User's Account deleted"
            : "Unknown";

        let connectorName: string | null = null;
        let potentialConnectors: {
          totalCount: number;
          pendingCount: number;
          declinedCount: number;
          hasAccepted: boolean;
        } | null = null;

        if (req.contactOwner) {
          connectorName =
            req.contactOwner.fullName ||
            `${req.contactOwner.firstName || ""} ${req.contactOwner.lastName || ""}`.trim() ||
            req.contactOwner.email?.split("@")[0] ||
            "Unknown Connector";
        } else if (req.acceptedBy) {
          connectorName = "User's Account deleted";
        } else {
          const entries =
            await this.potentialConnectorsService.getEntriesByRequestId(req.id);
          const pendingEntries = entries.filter(
            (e: AnyType) => e.status === IntroductionStatus.PENDING
          );
          const acceptedEntry = entries.find(
            (e: AnyType) => e.status === IntroductionStatus.ACCEPTED
          );
          const declinedEntries = entries.filter(
            (e: AnyType) =>
              e.status === IntroductionStatus.DECLINED || e.status === "failed"
          );
          potentialConnectors = {
            totalCount: entries.filter(
              (e: AnyType) => e.status !== "failed" && e.status !== "archived"
            ).length,
            pendingCount: pendingEntries.length,
            declinedCount: declinedEntries.length,
            hasAccepted: !!acceptedEntry,
          };
        }

        // Convert profile photo URLs to full URLs using profile object conversion
        if (req.contact) {
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            req.contact
          );
        }
        const prospectPhotoUrl = req.contact?.profilePhotoUrl || null;

        // Convert connector (contactOwner) profile photo URL
        let connectorPhotoUrl = null;
        if (req.contactOwner) {
          const contactOwnerCopy = { ...req.contactOwner };
          await this.profilesService.convertProfilePhotoUrlToFullUrl(
            contactOwnerCopy
          );
          connectorPhotoUrl = contactOwnerCopy.profilePhotoUrl || null;
        }

        // Query user's own feedback for this introduction
        const feedback = await this.db.query.introductionFeedback.findFirst({
          where: and(
            eq(schema.introductionFeedback.introductionId, req.id),
            eq(schema.introductionFeedback.feedbackFromUserId, userId)
          ),
        });

        return {
          id: req.id,
          prospectName,
          prospectCompany: req.contact
            ? req.contact.company || "Unknown Company"
            : "",
          prospectPhotoUrl,
          // Prospect details
          prospectTitle: req.contact?.title || null,
          prospectIndustry: req.contact?.industry || null,
          prospectLinkedinUrl: req.contact?.linkedin || null,
          prospectLocation: req.contact?.location || null,
          prospectEmployees: req.contact?.employees || null,
          prospectLinkedinConnections: req.contact?.linkedinConnections || null,
          prospectCompanyIndustry: req.contact?.companyIndustry || null,
          prospectCompanyDescription: req.contact?.companyDescription || null,
          // Prospect contact fields - ensure all fields match my-requests API
          prospectEmail: req.contact?.email
            ? maskEmail(req.contact.email)
            : null,
          prospectWebsiteUrl:
            req.contact?.website || req.contact?.websiteUrl || null,
          prospectCompanyLinkedinUrl: req.contact?.companyLinkedinUrl || null,
          connectorName,
          connectorCompany: req.contactOwner
            ? req.contactOwner.company || "Unknown Company"
            : req.acceptedBy
              ? "Deleted"
              : "",
          connectorPhotoUrl,
          // Connector details
          connectorId: req.contactOwner?.id || null,
          connectorTitle: req.contactOwner?.jobTitle || null,
          connectorIndustry: req.contactOwner?.industry || null,
          connectorLinkedinUrl: req.contactOwner?.linkedinUrl || null,
          connectorLocation: req.contactOwner?.location || null,
          connectorTrustScore: req.contactOwner?.trustScore || 0,
          // Connector contact fields - ensure email and company are always included
          connectorEmail: req.contactOwner?.email
            ? maskEmail(req.contactOwner.email)
            : null,
          connectorWebsiteUrl: req.contactOwner?.websiteUrl || null,

          connectorBio: req.contactOwner?.bio || null,
          connectorProducts: req.contactOwner?.products || null,
          connectorUniqueSellingProposition:
            req.contactOwner?.uniqueSellingProposition || null,
          connectorTargetMarket: req.contactOwner?.targetMarket || null,
          connectorCompanySize: req.contactOwner?.companySize || null,
          connectorRevenueRange: req.contactOwner?.revenueRange || null,
          connectorKeyCredentials: req.contactOwner?.keyCredentials || null,
          // Prospect additional fields

          prospectBio: null, // Contacts don't have bio field
          bountyAmount: req.bountyAmount || "0",
          ...mergeRequesterFeeFields(req, req.pricing),
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
          requesterArchiveReason: req.requesterArchiveReason ?? null,
          requesterArchiveNotes: req.requesterArchiveNotes ?? null,
          requesterArchivedAt: req.requesterArchivedAt
            ? req.requesterArchivedAt.toISOString()
            : null,
          requesterArchived: !!req.requesterArchived,
          potentialConnectors,
        };
      })
    );
  }
}
