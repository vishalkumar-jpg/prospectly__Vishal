import { eq, and } from "drizzle-orm";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { FinancesService } from "modules/finances/finances.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { CalendarService } from "modules/calendar/calendar.service";
import { IntroductionPotentialConnectorsService } from "modules/introduction-potential-connectors/introduction-potential-connectors.service";
import { maskEmail } from "utils/maskingUtils";
import {
  getRequesterMilestoneAmounts,
  mergeRequesterFeeFields,
  toIntroductionFeeRow,
} from "utils/introduction-request-fees.util";
import {
  resolveRequesterPipelineStage,
  isRequesterArchiveEligiblePipelineStage,
} from "./requester-pipeline-stage.helpers";
import { hasEligibleConnectorsForRepublish } from "../workflow/unfulfillment.helpers";
import { IntroductionStatus } from "../introductions.constants";

export type FormatPipelineRequestArchiveOptions = {
  requesterArchiveBlockedByClaim: boolean;
};

export async function formatPipelineRequest(
  req: AnyType,
  userId: string,
  stageOrderMap: Record<string, number>,
  db: PostgresJsDatabase<typeof schema>,
  profilesService: ProfilesService,
  calendarService: CalendarService,
  financesService: FinancesService,
  potentialConnectorsService: IntroductionPotentialConnectorsService,
  requesterArchiveOptions?: FormatPipelineRequestArchiveOptions
) {
  const pipelineDisplayStage = resolveRequesterPipelineStage(req.status);
  const stage = pipelineDisplayStage;
  let stageOrder = stageOrderMap[req.status] || 999;
  if (pipelineDisplayStage === "awaiting_connector") {
    stageOrder = -2;
  } else if (pipelineDisplayStage === "awaiting_intro") {
    stageOrder = -1;
  }

  const isPendingOrDeclined =
    req.status === IntroductionStatus.PENDING ||
    req.status === IntroductionStatus.DECLINED;
  const isAccepted = req.status === IntroductionStatus.ACCEPTED;

  let prospectName = "Unknown";
  if (req.contact) {
    if (req.contact.firstName && req.contact.lastName) {
      prospectName = `${req.contact.firstName} ${req.contact.lastName}`;
    } else {
      prospectName = req.contact.email?.split("@")[0] || "Unknown";
    }
  } else if (req.contactId) {
    prospectName = "User's Account deleted";
  }

  // For pending/declined, resolve connector via potential_connectors
  let connectorName: string | null = null;
  let connectorPhotoUrl: string | null = null;
  let connectorId: string | null =
    req.contactOwner?.id || req.acceptedBy || null;
  let connectorCompany = req.contactOwner
    ? req.contactOwner.company || "Unknown Company"
    : req.acceptedBy
      ? "Deleted"
      : "";
  let connectorTitle = req.contactOwner?.jobTitle || null;
  let connectorIndustry = req.contactOwner?.industry || null;
  let connectorLinkedinUrl = req.contactOwner?.linkedinUrl || null;
  let connectorLocation = req.contactOwner?.location || null;
  let connectorTrustScore = req.contactOwner?.trustScore || 0;
  let connectorEmail = req.contactOwner?.email
    ? maskEmail(req.contactOwner.email)
    : null;
  let connectorWebsiteUrl = req.contactOwner?.websiteUrl || null;
  let connectorBio = req.contactOwner?.bio || null;

  // Potential connectors data for awaiting_connector stage
  let potentialConnectors = null;
  let canMoveToMarketplace = false;
  const isMarketplaceVisible = req.isMarketplaceVisible || false;

  if (isPendingOrDeclined || isAccepted) {
    const entries = await potentialConnectorsService.getEntriesByRequestId(
      req.id
    );
    const pendingEntries = entries.filter(
      (e: AnyType) => e.status === IntroductionStatus.PENDING
    );
    const acceptedEntry = entries.find(
      (e: AnyType) => e.status === IntroductionStatus.ACCEPTED
    );
    const declinedEntries = entries.filter(
      (e: AnyType) => e.status === IntroductionStatus.DECLINED
    );

    potentialConnectors = {
      totalCount: entries.filter(
        (e: AnyType) => e.status !== "failed" && e.status !== "archived"
      ).length,
      pendingCount: pendingEntries.length,
      declinedCount: declinedEntries.length,
      hasAccepted: !!acceptedEntry,
    };

    const [fulfillmentAttempt] = await db
      .select({ id: schema.introductionFulfillmentAttempts.id })
      .from(schema.introductionFulfillmentAttempts)
      .where(
        eq(schema.introductionFulfillmentAttempts.introductionRequestId, req.id)
      )
      .limit(1);

    const eligibleForRepublish = await hasEligibleConnectorsForRepublish(
      db,
      req.id
    );
    const hasRemainingPrivateConnectors =
      pendingEntries.length > 0 || eligibleForRepublish;

    canMoveToMarketplace =
      !req.isMarketplaceVisible &&
      (req.status === IntroductionStatus.DECLINED ||
        declinedEntries.length === entries.length ||
        (req.autoExpired && req.expiredAt !== null) ||
        (req.status === IntroductionStatus.PENDING &&
          Boolean(fulfillmentAttempt) &&
          !req.needsRepublish &&
          !hasRemainingPrivateConnectors));

    if (acceptedEntry) {
      const profile = await profilesService.getProfileById(
        acceptedEntry.potentialConnectorId
      );
      if (profile) {
        await profilesService.convertProfilePhotoUrlToFullUrl(profile);
        connectorName =
          `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
          "Unknown Connector";
        connectorPhotoUrl = profile.profilePhotoUrl || null;
        connectorId = profile.id;
        connectorCompany = profile.company || "";
        connectorTitle = profile.jobTitle || null;
        connectorIndustry = profile.industry || null;
        connectorLinkedinUrl = profile.linkedinUrl || null;
        connectorLocation = profile.location || null;
        connectorTrustScore = (profile as AnyType).trustScore || 0;
        connectorEmail = maskEmail(profile.email);
        connectorWebsiteUrl = profile.websiteUrl || null;
        connectorBio = profile.bio || null;
      } else {
        connectorName = "User's Account deleted";
        connectorCompany = "Deleted";
      }
    }
  }

  if (!connectorName && req.contactOwner) {
    connectorName =
      req.contactOwner.fullName ||
      `${req.contactOwner.firstName || ""} ${req.contactOwner.lastName || ""}`.trim() ||
      req.contactOwner.email?.split("@")[0] ||
      "Unknown Connector";
  } else if (!connectorName && req.acceptedBy) {
    connectorName = "User's Account deleted";
    connectorCompany = "Deleted";
  }

  // Meeting details only for later stages
  let meetingStartTime: string | null = null;
  let meetingTimezone: string | null = null;
  let meetingLink: string | null = null;
  if (
    [
      IntroductionStatus.MEETING_BOOKED,
      IntroductionStatus.MEETING_RESCHEDULED,
      IntroductionStatus.MEETING_COMPLETED,
      IntroductionStatus.PEER_FEEDBACK,
    ].includes(req.status)
  ) {
    const scheduledMeeting =
      await calendarService.getScheduledMeetingByIntroductionRequestId(req.id);
    if (scheduledMeeting) {
      meetingStartTime = scheduledMeeting.meetingDate?.toISOString() || null;
      const metadata = scheduledMeeting.metadata as
        | { timezone?: string }
        | AnyType;
      meetingTimezone = metadata?.timezone || "UTC";
      meetingLink = scheduledMeeting.meetingLink || null;
    }
  }

  // Transaction data only for stages that have payments
  let initialStage = null;
  let remainingStage = null;
  if (!isPendingOrDeclined && !isAccepted) {
    const transaction =
      await financesService.getIntroductionTransactionByRequestId(req.id);
    if (transaction) {
      const transactionId = transaction.id as string;
      const paymentStages =
        await financesService.getPaymentStagesByTransactionId(transactionId);
      initialStage = paymentStages.find(
        (s) => s.stageName === "intro_email_sent"
      );
      remainingStage = paymentStages.find(
        (s) => s.stageName === "meeting_booked"
      );
    }
  }

  if (req.contact) {
    await profilesService.convertProfilePhotoUrlToFullUrl(req.contact);
  }
  const prospectPhotoUrl = req.contact?.profilePhotoUrl || null;

  if (!connectorPhotoUrl && req.contactOwner) {
    const contactOwnerCopy = { ...req.contactOwner };
    await profilesService.convertProfilePhotoUrlToFullUrl(contactOwnerCopy);
    connectorPhotoUrl = contactOwnerCopy.profilePhotoUrl || null;
  }

  const feedback = await db.query.introductionFeedback.findFirst({
    where: and(
      eq(schema.introductionFeedback.introductionId, req.id),
      eq(schema.introductionFeedback.feedbackFromUserId, userId)
    ),
  });

  const blockedByClaim =
    requesterArchiveOptions?.requesterArchiveBlockedByClaim ?? false;
  const requesterArchived = !!req.requesterArchived;
  const canRequesterArchive =
    isRequesterArchiveEligiblePipelineStage(stage) &&
    !requesterArchived &&
    !blockedByClaim;

  const feeFields = mergeRequesterFeeFields(req, req.pricing);
  const milestoneAmounts = getRequesterMilestoneAmounts(
    toIntroductionFeeRow(req, req.pricing),
    {
      initialStageAmount: initialStage?.amount,
      remainingStageAmount: remainingStage?.amount,
    }
  );

  return {
    id: req.id,
    prospectName,
    prospectCompany: req.contact
      ? req.contact.company || "Unknown Company"
      : "",
    prospectPhotoUrl,
    connectorName,
    connectorCompany,
    connectorPhotoUrl,
    prospectTitle: req.contact?.title || null,
    prospectIndustry: req.contact?.industry || null,
    prospectLinkedinUrl: req.contact?.linkedin || null,
    prospectLocation: req.contact?.location || null,
    prospectEmployees: req.contact?.employees || null,
    prospectCompanyIndustry: req.contact?.companyIndustry || null,
    prospectCompanyDescription: req.contact?.companyDescription || null,
    prospectLinkedinConnections: req.contact?.linkedinConnections || null,
    prospectEmail: req.contact?.email ? maskEmail(req.contact.email) : null,
    prospectWebsiteUrl: req.contact?.website || req.contact?.websiteUrl || null,
    prospectCompanyLinkedinUrl: req.contact?.companyLinkedinUrl || null,
    connectorId,
    connectorTitle,
    connectorIndustry,
    connectorLinkedinUrl,
    connectorLocation,
    connectorTrustScore,
    connectorEmail,
    connectorWebsiteUrl,
    connectorBio,
    connectorProducts: req.contactOwner?.products || null,
    connectorUniqueSellingProposition:
      req.contactOwner?.uniqueSellingProposition || null,
    connectorTargetMarket: req.contactOwner?.targetMarket || null,
    connectorCompanySize: req.contactOwner?.companySize || null,
    connectorRevenueRange: req.contactOwner?.revenueRange || null,
    connectorKeyCredentials: req.contactOwner?.keyCredentials || null,

    prospectBio: null,
    bountyAmount: req.bountyAmount || "0",
    providerFee: feeFields.providerFee,
    processingFee: feeFields.processingFee,
    totalAmount: feeFields.totalAmount,
    stage,
    originalStatus: req.status,
    stageOrder,
    lastActivity: req.updatedAt || req.createdAt,
    meetingDate: req.proposedMeetingDate || null,
    meetingStartTime,
    meetingTimezone,
    meetingLink,
    purpose: req.meetingDescription || "",
    meetingTitle: req.meetingTitle || null,
    meetingDescription: req.meetingDescription || null,
    additionalContext: req.additionalContext || null,
    rating: feedback ? Number(feedback.rating) : null,
    feedbackComments: feedback?.feedbackText || null,
    potentialConnectors,
    needsRepublish: req.needsRepublish ?? false,
    canMoveToMarketplace,
    isMarketplaceVisible,
    canRequesterArchive,
    requesterArchiveBlockedByClaim: blockedByClaim,
    initialChargeAmount: milestoneAmounts.initialChargeAmount,
    initialChargeCaptured: !!initialStage?.capturedAt,
    initialChargeCapturedAt: initialStage?.capturedAt?.toISOString() || null,
    remainingChargeAmount: milestoneAmounts.remainingChargeAmount,
    remainingChargeCaptured: !!remainingStage?.capturedAt,
    remainingChargeCapturedAt:
      remainingStage?.capturedAt?.toISOString() || null,
    totalChargedAmount:
      (initialStage?.capturedAt
        ? Number(initialStage.chargeAmount || initialStage.amount || 0)
        : 0) +
      (remainingStage?.capturedAt
        ? Number(remainingStage.chargeAmount || remainingStage.amount || 0)
        : 0),
    initialPaymentStatus: initialStage?.status || null,
    remainingPaymentStatus: remainingStage?.status || null,
  };
}
