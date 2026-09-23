import { CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/utils/dateFormatter";
import { getStageBadge, InboxRequest } from "./inboxUtils";
import { Calendar, DollarSign } from "lucide-react";

interface InboxCardHeaderProps {
  request: InboxRequest;
}

export function InboxCardHeader({ request }: InboxCardHeaderProps) {
  const bountyAmount = Number(request.bounty_amount) || 0;

  return (
    <CardHeader className="relative pb-4 pt-4 px-4 bg-transparent transition-colors duration-200 overflow-hidden max-lg:overflow-x-hidden">
      {/* Top Row: Status Badge + Date (left) + Bounty (right) */}
      {/* Desktop: single row; Mobile/Tablet: 2x2 grid for breathing space */}
      <div className="hidden lg:flex items-center justify-between mb-4 mt-2">
        {/* Status Badge + Received Date */}
        <div className="flex items-center gap-3">
          {getStageBadge(request)}
          <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Received {formatDateTime(request.createdAt || request.created_at)}
            </span>
          </div>
        </div>

        {/* Referral Payout - Top Right */}
        <div className="px-4 py-2 rounded-xl bg-brand-amethyst/10 border border-brand-amethyst/20 shadow-sm">
          <div className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1 text-center">
            REFERRAL PAYOUT
          </div>
          <div className="flex items-center justify-center gap-1">
            <DollarSign className="h-4 w-4 text-brand-amethyst" />
            <span className="text-[17px] font-extrabold tabular-nums text-brand-gradient">
              {bountyAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet: 2x2 grid - Status | Payout, Date | (empty) */}
      <div className="grid lg:hidden grid-cols-2 gap-x-4 gap-y-2 mb-4 mt-2">
        <div>{getStageBadge(request)}</div>
        <div className="flex justify-end items-start">
          <div className="px-4 py-2 rounded-xl bg-brand-amethyst/10 border border-brand-amethyst/20 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 text-center">
              REFERRAL PAYOUT
            </div>
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="h-4 w-4 text-brand-amethyst" />
              <span className="text-xl font-bold text-brand-amethyst">
                {bountyAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground col-span-2">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Received {formatDateTime(request.createdAt || request.created_at)}
          </span>
        </div>
      </div>

      {/* Meeting Title - breathing space on mobile/tablet */}
      {(request.meetingTitle || request.meeting_title) && (
        <div className="mb-3 max-lg:mt-4 min-w-0">
          <div
            className="text-[16px] font-extrabold text-foreground leading-tight line-clamp-2 break-words"
            title={request.meetingTitle || request.meeting_title || ""}
          >
            {request.meetingTitle || request.meeting_title}
          </div>
        </div>
      )}

      {/* Meeting Description - breathing space before requester card on mobile/tablet */}
      {request.meeting_description && (
        <div className="mb-4 max-lg:mb-6 min-w-0">
          <div className="text-[12.5px] text-muted-foreground leading-relaxed break-words">
            {request.meeting_description}
          </div>
        </div>
      )}
    </CardHeader>
  );
}
