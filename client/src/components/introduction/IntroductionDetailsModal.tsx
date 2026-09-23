import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useBountyStages } from "@/hooks/useBountyStages";
import {
  formatMeetingDate,
  formatMeetingDateWithTimezone,
  formatLastActivity,
} from "@/utils/dateFormatting";
import {
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Star,
  Shield,
} from "lucide-react";
import { AnyType } from "@/types/common";
import { StarRating } from "@/components/shared/StarRating";
import { ReviewsDialog } from "./ReviewsDialog";
import { IntroPersonCard } from "./IntroPersonCard";
import { DrawerSection, PayoutHero, MetaStrip } from "./DrawerSections";

interface ActiveIntroduction {
  id: string;
  requesterName: string;
  requesterCompany: string;
  requesterPhotoUrl?: string | null;
  requesterId?: string; // For Reviews button
  targetName: string;
  targetCompany: string;
  targetPhotoUrl?: string | null;
  bountyAmount: number;
  stage:
    | "request_accepted"
    | "intro_sent"
    | "response_received"
    | "meeting_booked"
    | "meeting_rescheduled"
    | "meeting_completed"
    | "peer_feedback";
  lastActivity: string;
  lastActivityTimestamp?: string; // Raw timestamp for conditional formatting
  nextAction: string;
  progress: number;
  meetingDate?: string;
  meetingStartTime?: string; // Full ISO datetime from scheduled_meetings table
  meetingTimezone?: string; // Timezone from scheduled_meetings table
  rating?: number;
  feedbackComments?: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  additionalContext?: string | null;
  // Transaction data for 5%/95% payment split display
  initialChargeAmount?: number | null;
  initialChargeCaptured?: boolean;
  initialChargeCapturedAt?: string | null;
  remainingChargeAmount?: number | null;
  remainingChargeCaptured?: boolean;
  remainingChargeCapturedAt?: string | null;
  platformCommissionAmount?: number | null;
  connectorPayoutAmount?: number | null;
  // Prospect details
  targetTitle?: string | null;
  targetIndustry?: string | null;
  targetLinkedinUrl?: string | null;
  targetLocation?: string | null;
  targetEmployees?: string | null;
  targetCompanyIndustry?: string | null;
  targetCompanyDescription?: string | null;
  targetLinkedinConnections?: string | null;
  // Requester details
  requesterTitle?: string | null;
  requesterIndustry?: string | null;
  requesterLinkedinUrl?: string | null;
  requesterLocation?: string | null;
  requesterWebsiteUrl?: string | null;
  requesterTrustScore?: number;
  requesterBio?: string | null;
  requesterEmail?: string | null;
  requesterProducts?: string | null;
  requesterUniqueSellingProposition?: string | null;
  requesterTargetMarket?: string | null;
  requesterCompanySize?: string | null;
  requesterRevenueRange?: string | null;
  requesterKeyCredentials?: string | null;
  requesterOrganizations?: Array<{
    id: string;
    name: string;
    isVerified: boolean;
  }>;
  targetOrganizations?: Array<{
    id: string;
    name: string;
    isVerified: boolean;
  }>;
  // Prospect contact fields
  targetEmail?: string | null;
  targetWebsiteUrl?: string | null;
  targetCompanyLinkedinUrl?: string | null;
  targetBio?: string | null;
}

interface IntroductionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  introduction: ActiveIntroduction | null;
  stageInfo: AnyType;
  isUnfulfilled?: boolean;
  failureStage?: string;
  failureReason?: string;
}

// Utility functions moved to introductionHelpers.ts

export function IntroductionDetailsModal({
  isOpen,
  onClose,
  introduction,
  stageInfo,
  isUnfulfilled = false,
  failureStage,
  failureReason,
}: IntroductionDetailsModalProps) {
  const { stages: dbStages } = useBountyStages();
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [selectedRequesterForReview, setSelectedRequesterForReview] = useState<{
    id?: string;
    name?: string;
    trustScore?: number;
  } | null>(null);

  if (!introduction) return null;

  // Get cumulative percentage from start to current stage (inclusive)
  const getCumulativePercentage = (currentStage: string): number => {
    const orderedStages = dbStages
      .filter((stage) => stage.stageId !== "peer_feedback") // Include all stages except platform fee for pipeline
      .sort((a, b) => a.stageOrder - b.stageOrder);

    const effectiveStage =
      currentStage === "meeting_rescheduled" ? "meeting_booked" : currentStage;

    const currentIndex = orderedStages.findIndex(
      (stage) => stage.stageId === effectiveStage
    );

    if (currentIndex === -1) return 0;

    let cumulative = 0;
    for (let i = 0; i <= currentIndex; i++) {
      cumulative += orderedStages[i].percentage;
    }

    // If current stage is peer_feedback, add all non-platform-fee stages plus platform fee
    if (currentStage === "peer_feedback") {
      const platformFeeStage = dbStages.find(
        (stage) => stage.stageId === "peer_feedback"
      );
      if (platformFeeStage) {
        cumulative += platformFeeStage.percentage;
      }
    }

    if (currentStage === "meeting_rescheduled") {
      const bookedStage = dbStages.find(
        (stage) => stage.stageId === "meeting_booked"
      );
      if (bookedStage) {
        // Find intro_sent's percentage + meeting_booked's percentage
        const introSentStage = dbStages.find((s) => s.stageId === "intro_sent");
        cumulative =
          (introSentStage?.percentage || 0) + (bookedStage.percentage || 0);
      }
    }

    return cumulative;
  };

  // Use consistent calculations with main pipeline
  const getCommissionAmount = (bountyAmount: number) => {
    // Platform fee should be 20% (consistent with main pipeline)
    return (bountyAmount * 20) / 100;
  };

  const getFinalTotal = (bountyAmount: number) => {
    const platformFee = getCommissionAmount(bountyAmount);
    return bountyAmount - platformFee;
  };

  // Calculate actual earned amount based on what's been captured
  // If only intro_sent (5% captured): connector gets 5% of total bounty (not 80% of 5%)
  // If meeting_booked (both captured): connector gets 80% of total bounty
  const getActualEarnedAmount = (
    intro: ActiveIntroduction
  ): { earned: number; potential: number; percentage: string } => {
    const totalBounty = intro.bountyAmount;
    const potentialEarnings = Math.round(totalBounty * 0.8); // 80% of total bounty

    if (intro.remainingChargeCaptured) {
      // Both payments captured - full 80% earned
      return {
        earned: intro.connectorPayoutAmount ?? potentialEarnings,
        potential: potentialEarnings,
        percentage: "80%",
      };
    } else if (intro.initialChargeCaptured) {
      // Only intro sent (5% captured) - connector gets 5% of total bounty
      const earnedAmount = Math.round(totalBounty * 0.05);
      return {
        earned: earnedAmount,
        potential: potentialEarnings,
        percentage: "5%",
      };
    } else {
      // Nothing captured yet
      return {
        earned: 0,
        potential: potentialEarnings,
        percentage: "0%",
      };
    }
  };

  // Stage-based tint for the "Next action" chip (brand tokens).
  const getNextActionTint = (stage: string): string => {
    const tintMap: Record<string, string> = {
      request_accepted: "bg-brand-sky/10 text-brand-sky border-brand-sky/20",
      intro_sent:
        "bg-brand-amethyst/10 text-brand-amethyst border-brand-amethyst/20",
      response_received: "bg-brand-sky/10 text-brand-sky border-brand-sky/20",
      meeting_booked:
        "bg-brand-success/10 text-brand-success border-brand-success/20",
      meeting_completed:
        "bg-brand-warning/10 text-brand-warning border-brand-warning/20",
      peer_feedback:
        "bg-brand-success/10 text-brand-success border-brand-success/20",
      meeting_rescheduled:
        "bg-brand-warning/10 text-brand-warning border-brand-warning/20",
    };
    return tintMap[stage] || "bg-muted/50 text-muted-foreground border-border";
  };

  const handleViewReviews = (requester: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => {
    setSelectedRequesterForReview(requester);
    setReviewsDialogOpen(true);
  };

  // const platformFeeStage = dbStages.find(
  //   (stage) => stage.stageId === "peer_feedback"
  // );
  // const releasedAmount = Math.round(
  //   (introduction.bountyAmount * stageInfo.escrowPercentage) / 100
  // );
  // const cumulativeTotal =
  //   introduction.stage === "peer_feedback"
  //     ? getFinalTotal(introduction.bountyAmount)
  //     : Math.round(
  //         (introduction.bountyAmount *
  //           getCumulativePercentage(introduction.stage)) /
  //           100
  //       );
  // const escrowAmount =
  //   introduction.stage === "peer_feedback"
  //     ? getCommissionAmount(introduction.bountyAmount)
  //     : Math.round(
  //         (introduction.bountyAmount *
  //           (100 - getCumulativePercentage(introduction.stage))) /
  //           100
  //       );

  const earnings = getActualEarnedAmount(introduction);
  const getUnfulfilledProgress = (stage?: string): number => {
    switch (stage) {
      case "request_accepted":
        return 10;
      case "intro_sent":
        return 25;
      case "response_received":
        return 40;
      case "meeting_booked":
        return 60;
      case "meeting_completed":
        return 80;
      default:
        return 0;
    }
  };
  const displayProgress = isUnfulfilled
    ? getUnfulfilledProgress(failureStage)
    : introduction.progress;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl !ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=open]:!duration-500 data-[state=closed]:!duration-300 will-change-transform"
      >
        <div className="flex-1 overflow-y-auto bg-app [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
          <section className="relative overflow-hidden bg-brand-hero-gradient px-5 py-6 text-white shadow-brand-card sm:px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
            />
            <div className="relative pr-10">
              {stageInfo?.title && (
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge className="border border-white/25 bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur hover:bg-white/30">
                    {stageInfo.title}
                  </Badge>
                </div>
              )}
              <SheetTitle className="text-lg font-semibold leading-tight text-white">
                Introduction Details
              </SheetTitle>
              <SheetDescription className="mt-1 text-[13px] text-white/85">
                Review this introduction's people, earnings, and progress.
              </SheetDescription>
            </div>
          </section>
          <div className="space-y-4 p-4 sm:p-6">
            {/* Requester & Prospect */}
            <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
              <IntroPersonCard
                role="requester"
                handleViewReviews={handleViewReviews}
                person={{
                  id: introduction.requesterId,
                  name: introduction.requesterName,
                  trustScore: introduction.requesterTrustScore,
                  photoUrl: introduction.requesterPhotoUrl,
                  title: introduction.requesterTitle,
                  industry: introduction.requesterIndustry,
                  company: introduction.requesterCompany,
                  location: introduction.requesterLocation,
                  email: introduction.requesterEmail,
                  linkedinUrl: introduction.requesterLinkedinUrl,
                  websiteUrl: introduction.requesterWebsiteUrl,
                  organizations: introduction.requesterOrganizations,
                }}
              />

              <IntroPersonCard
                role="prospect"
                person={{
                  name: introduction.targetName,
                  photoUrl: introduction.targetPhotoUrl,
                  title: introduction.targetTitle,
                  industry: introduction.targetIndustry,
                  company: introduction.targetCompany,
                  employees: introduction.targetEmployees,
                  location: introduction.targetLocation,
                  linkedinConnections: introduction.targetLinkedinConnections,
                  email: introduction.targetEmail,
                  linkedinUrl: introduction.targetLinkedinUrl,
                  websiteUrl: introduction.targetWebsiteUrl,
                  companyLinkedinUrl: introduction.targetCompanyLinkedinUrl,
                  organizations: introduction.targetOrganizations,
                }}
              />
            </div>

            {/* Meeting Title */}
            {introduction.meetingTitle && (
              <DrawerSection
                icon={<Calendar className="h-4 w-4" />}
                iconTint="bg-brand-sky/10 text-brand-sky"
                title="Meeting Title"
              >
                <p className="break-words text-sm font-semibold leading-relaxed">
                  {introduction.meetingTitle}
                </p>
              </DrawerSection>
            )}

            {/* Meeting Description */}
            {introduction.meetingDescription && (
              <DrawerSection
                icon={<TrendingUp className="h-4 w-4" />}
                iconTint="bg-brand-amethyst/10 text-brand-amethyst"
                title="Meeting Description"
              >
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {introduction.meetingDescription}
                </p>
              </DrawerSection>
            )}

            {/* Additional Context */}
            {introduction.additionalContext && (
              <DrawerSection
                icon={<TrendingUp className="h-4 w-4" />}
                iconTint="bg-brand-amethyst/10 text-brand-amethyst"
                title="Additional Context"
              >
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {introduction.additionalContext}
                </p>
              </DrawerSection>
            )}

            {/* Your Submitted Review */}
            {introduction.rating && (
              <section className="rounded-2xl border border-brand-warning/30 bg-brand-warning/10 p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-warning/15 text-brand-warning">
                    <Star className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold">
                    Your Submitted Review
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StarRating
                      rating={introduction.rating}
                      size="lg"
                      colorScheme="amber"
                    />
                    <span className="ml-1 text-sm font-bold text-brand-warning">
                      {introduction.rating.toFixed(1)}
                    </span>
                  </div>
                  {introduction.feedbackComments && (
                    <p className="mt-2 rounded-lg border border-brand-warning/20 bg-card p-3 text-sm leading-relaxed text-foreground">
                      "{introduction.feedbackComments}"
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Payout hero + meta strip */}
            <PayoutHero
              label={
                earnings.earned === earnings.potential && earnings.earned > 0
                  ? "Your Total Earnings"
                  : earnings.earned > 0
                    ? "Earned So Far"
                    : "Potential Earnings"
              }
              value={`$${(earnings.earned > 0
                ? earnings.earned
                : earnings.potential
              ).toLocaleString()}`}
              note={
                earnings.earned > 0
                  ? `${earnings.percentage} of the $${introduction.bountyAmount.toLocaleString()} full referral payout earned so far on this introduction.`
                  : `Earn up to 80% ($${earnings.potential.toLocaleString()}) of the $${introduction.bountyAmount.toLocaleString()} full referral payout when this introduction completes.`
              }
            />
            <MetaStrip
              cells={[
                {
                  label: "Full Payout",
                  value: `$${introduction.bountyAmount.toLocaleString()}`,
                  icon: <DollarSign className="h-4 w-4" />,
                  tint: "bg-brand-success/10 text-brand-success",
                },
                {
                  label: isUnfulfilled
                    ? "Completion (at unfulfillment)"
                    : "Completion",
                  value: `${displayProgress}%`,
                  icon: <TrendingUp className="h-4 w-4" />,
                  tint: "bg-brand-amethyst/10 text-brand-amethyst",
                },
                {
                  label: "Trust Score",
                  value:
                    introduction.requesterTrustScore != null
                      ? introduction.requesterTrustScore
                      : "—",
                  icon: <Shield className="h-4 w-4" />,
                  tint: "bg-brand-sky/10 text-brand-sky",
                },
              ]}
            />

            {/* Activity */}
            <DrawerSection
              icon={<Clock className="h-4 w-4" />}
              iconTint="bg-brand-sky/10 text-brand-sky"
              title="Activity"
            >
              <div className="space-y-2">
                <div className="break-words text-sm">
                  <span className="text-muted-foreground">Last: </span>
                  <span className="font-medium">
                    {formatLastActivity(
                      introduction.lastActivityTimestamp,
                      introduction.lastActivity
                    )}
                  </span>
                </div>
                {isUnfulfilled ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex-shrink-0 text-muted-foreground">
                      Reason:
                    </span>
                    <div className="inline-flex min-h-[32px] min-w-0 items-center justify-center break-words rounded-lg border border-brand-destructive/20 bg-brand-destructive/10 px-3 py-2">
                      <span className="break-words text-center text-xs font-semibold leading-tight text-brand-destructive">
                        {failureReason || "Unknown"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex-shrink-0 text-muted-foreground">
                      Next:
                    </span>
                    <div
                      className={cn(
                        "inline-flex min-h-[32px] min-w-0 items-center justify-center break-words rounded-lg border px-3 py-2 sm:whitespace-nowrap",
                        getNextActionTint(introduction.stage)
                      )}
                    >
                      <span className="break-words text-center text-xs font-semibold leading-tight">
                        {introduction.nextAction}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </DrawerSection>

            {/* Meeting Details */}
            {(introduction.meetingStartTime || introduction.meetingDate) && (
              <DrawerSection
                icon={<Calendar className="h-4 w-4" />}
                iconTint="bg-brand-sky/10 text-brand-sky"
                title="Meeting Details"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {introduction.stage === "meeting_rescheduled"
                      ? "Rescheduled - Awaiting new time"
                      : introduction.meetingStartTime
                        ? formatMeetingDateWithTimezone(
                            introduction.meetingStartTime
                          )
                        : formatMeetingDate(introduction.meetingDate)}
                  </span>
                </div>
              </DrawerSection>
            )}
          </div>
        </div>

        {/* Reviews Dialog */}
        {selectedRequesterForReview && (
          <ReviewsDialog
            open={reviewsDialogOpen}
            onOpenChange={setReviewsDialogOpen}
            connectorName={selectedRequesterForReview.name || "Requester"}
            trustScore={selectedRequesterForReview.trustScore || 0}
            userId={selectedRequesterForReview.id}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
