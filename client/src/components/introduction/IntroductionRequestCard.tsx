import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RequestCardHeader } from "./RequestCardHeader";
import { RequestCardContent } from "./RequestCardContent";

// Types extracted from RequestPipelineTab
export interface RequestedIntroduction {
  id: string;
  prospectName: string;
  prospectCompany: string;
  prospectPhotoUrl?: string | null;
  connectorName: string | null;
  connectorCompany: string;
  connectorPhotoUrl?: string | null;
  connectorId?: string;
  requesterPhotoUrl?: string | null;
  prospectTitle?: string | null;
  prospectIndustry?: string | null;
  prospectLinkedinUrl?: string | null;
  prospectLocation?: string | null;
  prospectEmployees?: string | null;
  prospectCompanyIndustry?: string | null;
  prospectCompanyDescription?: string | null;
  prospectLinkedinConnections?: string | null;
  connectorTitle?: string | null;
  connectorIndustry?: string | null;
  connectorLinkedinUrl?: string | null;
  connectorLocation?: string | null;
  connectorTrustScore?: number;
  connectorEmail?: string | null;
  connectorWebsiteUrl?: string | null;
  connectorPhone?: string | null;
  connectorBio?: string | null;
  prospectEmail?: string | null;
  prospectWebsiteUrl?: string | null;
  prospectCompanyLinkedinUrl?: string | null;
  prospectPhone?: string | null;
  prospectBio?: string | null;
  bountyAmount: number;
  totalAmount?: number;
  stage: string;
  originalStatus?: string;
  lastActivity: string;
  lastActivityTimestamp?: string;
  nextAction: string;
  progress: number;
  meetingDate?: string;
  meetingStartTime?: string;
  meetingTimezone?: string;
  meetingLink?: string | null;
  rating?: number;
  feedbackComments?: string;
  purpose: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  additionalContext?: string | null;
  initialChargeAmount?: number | null;
  initialChargeCaptured?: boolean;
  initialChargeCapturedAt?: string | null;
  remainingChargeAmount?: number | null;
  remainingChargeCaptured?: boolean;
  remainingChargeCapturedAt?: string | null;
  platformCommissionAmount?: number | null;
  initialPaymentStatus?: string | null;
  remainingPaymentStatus?: string | null;
  potentialConnectors?: {
    totalCount: number;
    pendingCount: number;
    declinedCount: number;
    hasAccepted: boolean;
  } | null;
  canMoveToMarketplace?: boolean;
  isMarketplaceVisible?: boolean;
  needsRepublish?: boolean;
}

interface IntroductionRequestCardProps {
  intro: RequestedIntroduction;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpansion: (e: React.MouseEvent) => void;
  onCardClick: () => void;
  onViewTransactions: (e: React.MouseEvent) => void;
  onMoveToMarketplace: (e: React.MouseEvent) => void;
  onRepublish?: (e: React.MouseEvent) => void;
  onViewReviews: () => void;
  onLeaveFeedback: (e: React.MouseEvent) => void;
  onAcknowledgeMeeting: (e: React.MouseEvent) => void;
  onUpdateStage: () => void;
  acknowledgeDialogOpen: boolean;
  onAcknowledgeDialogOpenChange: (open: boolean) => void;
  getProgressColor: (progress: number) => string;
}

export const IntroductionRequestCard: React.FC<
  IntroductionRequestCardProps
> = ({
  intro,
  isExpanded,
  isSelected,
  onCardClick,
  onViewTransactions,
  onMoveToMarketplace,
  onRepublish,
  onLeaveFeedback,
  onAcknowledgeMeeting,
  onUpdateStage,
  acknowledgeDialogOpen,
  onAcknowledgeDialogOpenChange,
  getProgressColor,
}) => {
  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-200 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-none cursor-pointer hover:-translate-y-0.5 hover:border-[#D2D6E0] hover:shadow-[0_4px_14px_rgba(11,16,32,0.06)]",
        isSelected && "ring-1 ring-primary border-primary",
        isExpanded && "min-h-[360px]"
      )}
    >
      <RequestCardHeader
        intro={intro}
        onCardClick={onCardClick}
        onViewTransactions={onViewTransactions}
        onMoveToMarketplace={onMoveToMarketplace}
        onRepublish={onRepublish}
        onLeaveFeedback={onLeaveFeedback}
        onAcknowledgeMeeting={onAcknowledgeMeeting}
      />

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <RequestCardContent
          intro={intro}
          getProgressColor={getProgressColor}
          acknowledgeDialogOpen={acknowledgeDialogOpen}
          onAcknowledgeDialogOpenChange={onAcknowledgeDialogOpenChange}
          onUpdateStage={onUpdateStage}
        />
      </div>
    </Card>
  );
};
