import React from "react";
import { CardHeader } from "@/components/ui/card";
import {
  Building2,
  Eye,
  Globe,
  RefreshCw,
  Receipt,
  Video,
  MessageSquare,
  CheckCircle,
  Users,
  Handshake,
} from "lucide-react";
import { AccountDeletedInfo } from "./AccountDeletedInfo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { utcDayjs } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { RequestedIntroduction } from "./IntroductionRequestCard";
interface RequestCardHeaderProps {
  intro: RequestedIntroduction;
  onCardClick: () => void;
  onViewTransactions: (e: React.MouseEvent) => void;
  onMoveToMarketplace: (e: React.MouseEvent) => void;
  onRepublish?: (e: React.MouseEvent) => void;
  onLeaveFeedback: (e: React.MouseEvent) => void;
  onAcknowledgeMeeting: (e: React.MouseEvent) => void;
}

const CA_BASE =
  "flex items-center justify-center gap-1.5 h-auto py-[7px] px-2.5 rounded-[9px] text-xs font-bold cursor-pointer transition-all active:scale-[0.98]";
const CA_NEUTRAL = cn(
  CA_BASE,
  "border border-slate-200 bg-white text-foreground hover:border-brand-amethyst/30 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
);
const CA_PRIMARY = cn(
  CA_BASE,
  "border border-transparent bg-brand-gradient text-white shadow-brand-cta hover:-translate-y-px hover:text-white"
);

function isDeletedAccountName({ name }: { name: string }): boolean {
  return name === "User's Account deleted" || name === "Unknown";
}

function getRequestCardHeaderActionLayout({
  intro,
}: {
  intro: RequestedIntroduction;
}) {
  const showRepublish = !!intro.needsRepublish;
  const showMarket =
    intro.canMoveToMarketplace && !intro.isMarketplaceVisible && !showRepublish;
  const showFinance =
    intro.stage !== "awaiting_connector" && intro.stage !== "awaiting_intro";
  const showJoin =
    intro.stage === "meeting_booked" &&
    !!intro.meetingLink &&
    (!intro.meetingStartTime ||
      utcDayjs(intro.meetingStartTime).isAfter(utcDayjs()));
  const showFeedback = intro.stage === "peer_feedback";
  const showConfirm = intro.stage === "meeting_completed";
  const actionCount =
    1 +
    (showRepublish ? 1 : 0) +
    (showMarket ? 1 : 0) +
    (showFinance ? 1 : 0) +
    (showJoin ? 1 : 0) +
    (showFeedback ? 1 : 0) +
    (showConfirm ? 1 : 0);
  const useActionGrid = actionCount === 3 || actionCount === 4;

  return {
    showRepublish,
    showMarket,
    showFinance,
    showJoin,
    showFeedback,
    showConfirm,
    actionCount,
    actionRowClass: cn(
      "pt-1 gap-1.5",
      useActionGrid ? "grid grid-cols-2" : "flex flex-nowrap"
    ),
    actionSlotClass: useActionGrid
      ? cn("min-w-0 w-full", actionCount === 3 && "last:col-span-2")
      : "min-w-0 flex-1 basis-0",
    actionButtonStretch: "w-full min-w-0",
  };
}

function RequestCardHeaderPersonRow({
  name,
  title,
  photoUrl,
}: {
  name: string;
  title?: string | null;
  photoUrl?: string | null;
}) {
  if (isDeletedAccountName({ name })) {
    return <AccountDeletedInfo variant="purple" className="py-1" />;
  }
  return (
    <>
      <div className="font-medium text-[12px] leading-snug break-words flex items-center gap-1">
        {name}
      </div>
      {title && (
        <div
          className="text-[12px] text-muted-foreground mt-1 break-words line-clamp-2 font-medium"
          title={title}
        >
          {title}
        </div>
      )}
    </>
  );
}

function RequestCardHeaderConnectorTooltip({
  intro,
}: {
  intro: RequestedIntroduction;
}) {
  const connectorName = intro.connectorName || "";
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-pointer text-muted-foreground font-medium hover:text-foreground transition-colors leading-none truncate text-[12px] flex items-center gap-1">
            {connectorName}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="p-0 overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-800 shadow-2xl w-64 z-[100]"
        >
          <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <PremiumAvatar
                name={connectorName}
                size="xs"
                imageUrl={intro.connectorPhotoUrl}
              />
              <div className="min-w-0">
                <div className="font-bold text-[12px] text-foreground truncate">
                  {connectorName}
                </div>
                {intro.connectorTitle && (
                  <div
                    className="text-[12px] text-muted-foreground truncate leading-tight mt-0.5"
                    title={intro.connectorTitle}
                  >
                    {intro.connectorTitle}
                  </div>
                )}
              </div>
            </div>
            {(intro.connectorCompany || intro.connectorIndustry) && (
              <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                {intro.connectorCompany && (
                  <div className="flex items-center gap-2.5 text-[12px]">
                    <Building2 className="h-3.5 w-3.5 text-primary/60" />
                    <span className="font-semibold text-foreground truncate">
                      {intro.connectorCompany}
                    </span>
                  </div>
                )}
                {intro.connectorIndustry && (
                  <div className="flex items-center gap-2.5 text-[12px]">
                    <Globe className="h-3.5 w-3.5 text-primary/60" />
                    <span className="text-muted-foreground truncate">
                      {intro.connectorIndustry}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RequestCardHeaderPotentialConnectors({
  potentialConnectors,
}: {
  potentialConnectors: NonNullable<
    RequestedIntroduction["potentialConnectors"]
  >;
}) {
  const { pendingCount, declinedCount } = potentialConnectors;
  return (
    <div className="flex flex-row items-center gap-x-1 text-[12px] font-semibold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent flex-shrink-0">
      <Users className="h-3.5 w-3.5 text-primary/70" />
      {pendingCount > 0 && (
        <span>
          {pendingCount}
          {` Connector${pendingCount !== 1 ? "s" : ""}`}
          <span> Pending</span>
        </span>
      )}
      {pendingCount > 0 && declinedCount > 0 && (
        <span className="text-slate-300">•</span>
      )}
      {declinedCount > 0 && (
        <span className="text-[12px] font-semibold bg-gradient-to-r from-red-500 via-red-600 to-red-500 bg-clip-text text-transparent flex-shrink-0">
          {declinedCount}
          {` Connector${declinedCount !== 1 ? "s" : ""}`}
          <span> Declined</span>
        </span>
      )}
    </div>
  );
}

function RequestCardHeaderConnectorRow({
  intro,
}: {
  intro: RequestedIntroduction;
}) {
  if (intro.connectorName) {
    if (isDeletedAccountName({ name: intro.connectorName })) {
      return (
        <div className="flex flex-row items-center gap-x-1 text-[12px] flex-shrink-0 w-full">
          <div className="flex-1">
            <AccountDeletedInfo variant="blue" className="py-1" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-row items-center gap-x-1 text-[12px] flex-shrink-0 w-full">
        <Handshake className="h-3.5 w-3.5 text-primary/70" />
        <span className="leading-none font-semibold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
          Connector:
        </span>{" "}
        <RequestCardHeaderConnectorTooltip intro={intro} />
      </div>
    );
  }

  const potential = intro.potentialConnectors;
  const showPotential =
    intro.stage === "awaiting_connector" &&
    potential &&
    (potential.pendingCount > 0 || potential.declinedCount > 0);

  if (!showPotential || !potential) {
    return null;
  }

  return (
    <RequestCardHeaderPotentialConnectors potentialConnectors={potential} />
  );
}

function RequestCardHeaderActionButton({
  label,
  tooltip,
  icon: Icon,
  className,
  onClick,
  ariaLabel,
}: {
  label: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  onClick: (e: React.MouseEvent) => void;
  ariaLabel: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={onClick} className={className} aria-label={ariaLabel}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[12px]">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function stopPropagationAndCall({
  event,
  handler,
}: {
  event: React.MouseEvent;
  handler: (e: React.MouseEvent) => void;
}): void {
  event.stopPropagation();
  handler(event);
}

function RequestCardHeaderActions({
  intro,
  layout,
  onCardClick,
  onViewTransactions,
  onMoveToMarketplace,
  onRepublish,
  onLeaveFeedback,
  onAcknowledgeMeeting,
}: {
  intro: RequestedIntroduction;
  layout: ReturnType<typeof getRequestCardHeaderActionLayout>;
  onCardClick: () => void;
  onViewTransactions: (e: React.MouseEvent) => void;
  onMoveToMarketplace: (e: React.MouseEvent) => void;
  onRepublish?: (e: React.MouseEvent) => void;
  onLeaveFeedback: (e: React.MouseEvent) => void;
  onAcknowledgeMeeting: (e: React.MouseEvent) => void;
}) {
  const { actionRowClass, actionSlotClass, actionButtonStretch } = layout;
  const hasRating = intro.rating !== undefined && intro.rating !== null;
  const feedbackLabel = hasRating ? "Edit" : "Feedback";
  const feedbackTooltip = hasRating ? "Edit Feedback" : "Feedback";

  return (
    <TooltipProvider delayDuration={0}>
      <div className={actionRowClass}>
        <div className={actionSlotClass}>
          <RequestCardHeaderActionButton
            label="Details"
            tooltip="View details"
            icon={Eye}
            className={cn(actionButtonStretch, CA_NEUTRAL)}
            ariaLabel="View details"
            onClick={(e) => {
              e.stopPropagation();
              onCardClick();
            }}
          />
        </div>

        {layout.showRepublish && onRepublish && (
          <div className={actionSlotClass}>
            <RequestCardHeaderActionButton
              label="Re-publish"
              tooltip="Re-publish request"
              icon={RefreshCw}
              className={cn(actionButtonStretch, CA_PRIMARY)}
              ariaLabel="Re-publish request"
              onClick={(e) =>
                stopPropagationAndCall({ event: e, handler: onRepublish })
              }
            />
          </div>
        )}

        {layout.showMarket && (
          <div className={actionSlotClass}>
            <RequestCardHeaderActionButton
              label="Market"
              tooltip="Move to marketplace"
              icon={Globe}
              className={cn(actionButtonStretch, CA_NEUTRAL)}
              ariaLabel="Move to marketplace"
              onClick={(e) =>
                stopPropagationAndCall({
                  event: e,
                  handler: onMoveToMarketplace,
                })
              }
            />
          </div>
        )}

        {layout.showFinance && (
          <div className={actionSlotClass}>
            <RequestCardHeaderActionButton
              label="Finance"
              tooltip="View transactions"
              icon={Receipt}
              className={cn(actionButtonStretch, CA_NEUTRAL)}
              ariaLabel="View transactions"
              onClick={(e) =>
                stopPropagationAndCall({
                  event: e,
                  handler: onViewTransactions,
                })
              }
            />
          </div>
        )}

        {layout.showJoin && (
          <div className={actionSlotClass}>
            <RequestCardHeaderActionButton
              label="Join"
              tooltip="Join meeting"
              icon={Video}
              className={cn(actionButtonStretch, CA_PRIMARY)}
              ariaLabel="Join meeting"
              onClick={(e) => {
                e.stopPropagation();
                window.open(
                  intro.meetingLink || "",
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
            />
          </div>
        )}

        {layout.showFeedback && (
          <div className={actionSlotClass}>
            <RequestCardHeaderActionButton
              label={feedbackLabel}
              tooltip={feedbackTooltip}
              icon={MessageSquare}
              className={cn(actionButtonStretch, CA_PRIMARY)}
              ariaLabel="Feedback"
              onClick={(e) =>
                stopPropagationAndCall({ event: e, handler: onLeaveFeedback })
              }
            />
          </div>
        )}

        {layout.showConfirm && (
          <div className={actionSlotClass}>
            <RequestCardHeaderActionButton
              label="Confirm"
              tooltip="Acknowledge meeting"
              icon={CheckCircle}
              className={cn(actionButtonStretch, CA_PRIMARY)}
              ariaLabel="Acknowledge meeting"
              onClick={(e) =>
                stopPropagationAndCall({
                  event: e,
                  handler: onAcknowledgeMeeting,
                })
              }
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export const RequestCardHeader: React.FC<RequestCardHeaderProps> = ({
  intro,
  onCardClick,
  onViewTransactions,
  onMoveToMarketplace,
  onRepublish,
  onLeaveFeedback,
  onAcknowledgeMeeting,
}) => {
  const actionLayout = getRequestCardHeaderActionLayout({ intro });

  return (
    <CardHeader className="relative p-[15px] flex-shrink-0 bg-transparent transition-colors overflow-hidden space-y-3">
      <div className="flex justify-between items-start pl-0 pr-0">
        {intro.meetingTitle && (
          <div
            className="text-[13px] font-bold text-foreground leading-tight flex-1 text-wrap line-clamp-2"
            title={intro.meetingTitle}
          >
            {intro.meetingTitle}
          </div>
        )}
        <div className="text-[16px] font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent flex-shrink-0 ml-4">
          ${Number(intro.bountyAmount || 0).toLocaleString()}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3 w-full">
          <PremiumAvatar
            name={intro.prospectName}
            size="xs"
            qualityScore={8}
            imageUrl={intro.prospectPhotoUrl}
          />
          <div className="min-w-0 flex-1 flex flex-col justify-center min-h-[32px]">
            <RequestCardHeaderPersonRow
              name={intro.prospectName}
              title={intro.prospectTitle}
              photoUrl={intro.prospectPhotoUrl}
            />
          </div>
        </div>

        <div className="px-0">
          <RequestCardHeaderConnectorRow intro={intro} />
        </div>
      </div>

      <RequestCardHeaderActions
        intro={intro}
        layout={actionLayout}
        onCardClick={onCardClick}
        onViewTransactions={onViewTransactions}
        onMoveToMarketplace={onMoveToMarketplace}
        onRepublish={onRepublish}
        onLeaveFeedback={onLeaveFeedback}
        onAcknowledgeMeeting={onAcknowledgeMeeting}
      />
    </CardHeader>
  );
};
