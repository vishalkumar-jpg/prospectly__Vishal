import { Card, CardContent } from "@/components/ui/card";
import {
  isIntroductionRequesterWithdrawn,
  shouldShowConnectorPool,
  type PotentialConnectorsSummary,
} from "./introductionHelpers";
import { ArchiveCardHeader } from "./ArchiveCardHeader";
import { ArchiveCardConnector } from "./ArchiveCardConnector";
import { ArchiveCardProspect } from "./ArchiveCardProspect";
import { ArchiveCardContent } from "./ArchiveCardContent";
import { ArchiveCardActions } from "./ArchiveCardActions";

export interface CompletedIntroduction {
  id: string;
  prospectName: string;
  prospectCompany: string;
  prospectPhotoUrl?: string | null;
  prospectTitle?: string | null;
  prospectIndustry?: string | null;
  prospectLinkedinUrl?: string | null;
  prospectLocation?: string | null;
  prospectEmployees?: string | null;
  prospectLinkedinConnections?: string | null;
  prospectCompanyIndustry?: string | null;
  prospectCompanyDescription?: string | null;
  connectorName: string | null;
  potentialConnectors?: PotentialConnectorsSummary | null;
  connectorCompany: string;
  connectorPhotoUrl?: string | null;
  connectorId?: string;
  connectorTitle?: string | null;
  connectorIndustry?: string | null;
  connectorLinkedinUrl?: string | null;
  connectorLocation?: string | null;
  connectorTrustScore?: number;
  connectorEmail?: string | null;
  connectorWebsiteUrl?: string | null;
  connectorBio?: string | null;
  connectorProducts?: string | null;
  connectorUniqueSellingProposition?: string | null;
  connectorTargetMarket?: string | null;
  connectorCompanySize?: string | null;
  connectorRevenueRange?: string | null;
  connectorKeyCredentials?: string | null;
  prospectEmail?: string | null;
  prospectWebsiteUrl?: string | null;
  prospectCompanyLinkedinUrl?: string | null;
  prospectBio?: string | null;
  bountyAmount: number;
  providerFee?: string | number;
  processingFee?: string | number;
  totalAmount?: string | number;
  completedDate: string;
  rating?: number;
  feedbackComments?: string;
  purpose: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  additionalContext?: string | null;
  requesterMeetingUrl?: string | null;
  requesterMeetingPlatform?: string | null;
  requesterDefaultDuration?: string | null;
  requesterAvailability?: string | null;
  preferredDuration?: string | null;
  preferredTimeSlots?: string[] | null;
  timeZone?: string | null;
  schedulingLink?: string | null;
  meetingType?: string | null;
  meetingPreferences?: {
    duration?: string;
    format?: string;
    timeframe?: string;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** From API: matches DB status (e.g. completed, archived). */
  stage?: string;
  status?: string;
  requesterArchiveReason?: string | null;
  requesterArchiveNotes?: string | null;
  requesterArchivedAt?: string | null;
  requesterArchived?: boolean;
}

interface ArchiveCardProps {
  intro: CompletedIntroduction;
  onOpenFinance: (intro: CompletedIntroduction) => void;
  onOpenDetails: (intro: CompletedIntroduction, withdrawn: boolean) => void;
  onViewReviews: (connector: {
    id?: string;
    name?: string;
    trustScore?: number;
  }) => void;
}

export function ArchiveCard({
  intro,
  onOpenFinance,
  onOpenDetails,
  onViewReviews,
}: ArchiveCardProps) {
  const withdrawn = isIntroductionRequesterWithdrawn(intro);
  const showConnectorPool = shouldShowConnectorPool({
    withdrawn,
    connectorId: intro.connectorId,
    connectorName: intro.connectorName,
    potentialConnectors: intro.potentialConnectors,
  });
  const archiveEventDate =
    withdrawn && intro.requesterArchivedAt
      ? intro.requesterArchivedAt
      : intro.completedDate;

  return (
    <Card className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-brand-card transition-all hover:border-brand-amethyst/20 hover:shadow-lg max-sm:overflow-x-hidden">
      <ArchiveCardHeader
        withdrawn={withdrawn}
        archiveEventDate={archiveEventDate}
        rating={intro.rating}
        bountyAmount={intro.bountyAmount}
        meetingTitle={intro.meetingTitle}
        meetingDescription={intro.meetingDescription}
      />

      <div className="px-4 pb-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-4 lg:gap-6 items-start mt-3">
          <ArchiveCardConnector
            connectorId={intro.connectorId}
            connectorName={intro.connectorName}
            connectorPhotoUrl={intro.connectorPhotoUrl}
            connectorTitle={intro.connectorTitle}
            connectorIndustry={intro.connectorIndustry}
            connectorCompany={intro.connectorCompany}
            connectorLocation={intro.connectorLocation}
            connectorTrustScore={intro.connectorTrustScore}
            connectorEmail={intro.connectorEmail}
            connectorLinkedinUrl={intro.connectorLinkedinUrl}
            connectorWebsiteUrl={intro.connectorWebsiteUrl}
            showConnectorPool={showConnectorPool}
            potentialConnectors={intro.potentialConnectors}
            onViewReviews={onViewReviews}
          />

          <ArchiveCardProspect
            prospectName={intro.prospectName}
            prospectPhotoUrl={intro.prospectPhotoUrl}
            prospectTitle={intro.prospectTitle}
            prospectIndustry={intro.prospectIndustry}
            prospectCompany={intro.prospectCompany}
            prospectEmployees={intro.prospectEmployees}
            prospectLocation={intro.prospectLocation}
            prospectLinkedinConnections={intro.prospectLinkedinConnections}
            prospectEmail={intro.prospectEmail}
            prospectLinkedinUrl={intro.prospectLinkedinUrl}
            prospectWebsiteUrl={intro.prospectWebsiteUrl}
            prospectCompanyLinkedinUrl={intro.prospectCompanyLinkedinUrl}
          />
        </div>
      </div>

      <CardContent className="pt-0 flex-1 flex flex-col justify-between px-4">
        <ArchiveCardContent
          withdrawn={withdrawn}
          additionalContext={intro.additionalContext}
          purpose={intro.purpose}
          requesterArchiveReason={intro.requesterArchiveReason}
          requesterArchiveNotes={intro.requesterArchiveNotes}
        />

        <ArchiveCardActions
          onOpenFinance={() => onOpenFinance(intro)}
          onOpenDetails={() => onOpenDetails(intro, withdrawn)}
        />
      </CardContent>
    </Card>
  );
}
