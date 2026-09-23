import { CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/shared/StarRating";
import { formatDateTime } from "@/utils/dateFormatter";
import { Archive, Calendar, CheckCircle2, DollarSign } from "lucide-react";

interface ArchiveCardHeaderProps {
  withdrawn: boolean;
  archiveEventDate?: string | null;
  rating?: number | null;
  bountyAmount: number;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
}

const STATUS_LABEL = (withdrawn: boolean) =>
  withdrawn ? "Archived" : "Completed";

function StatusBadge({ withdrawn }: { withdrawn: boolean }) {
  if (withdrawn) {
    return (
      <Badge
        variant="outline"
        className="gap-1 font-bold text-[11.5px] bg-muted text-muted-foreground border-border hover:bg-muted/80"
      >
        <Archive className="h-3 w-3" />
        Archived
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 font-bold text-[11.5px] bg-brand-success/10 text-brand-success border-brand-success/30 hover:bg-brand-success/20"
    >
      <CheckCircle2 className="h-3 w-3" />
      Completed
    </Badge>
  );
}

function PayoutPill({ bountyAmount }: { bountyAmount: number }) {
  return (
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
  );
}

export function ArchiveCardHeader({
  withdrawn,
  archiveEventDate,
  rating,
  bountyAmount,
  meetingTitle,
  meetingDescription,
}: ArchiveCardHeaderProps) {
  const statusLabel = STATUS_LABEL(withdrawn);

  return (
    <CardHeader className="relative pb-4 pt-4 px-4 bg-transparent transition-colors duration-200 overflow-hidden max-lg:overflow-x-hidden">
      {/* Desktop layout */}
      <div className="hidden lg:flex items-center justify-between mb-4 mt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge withdrawn={withdrawn} />
          {archiveEventDate && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {statusLabel} {formatDateTime(archiveEventDate)}
              </span>
            </div>
          )}
          {rating ? (
            <StarRating
              rating={rating}
              size="sm"
              showValue
              colorScheme="yellow"
            />
          ) : null}
        </div>

        <PayoutPill bountyAmount={bountyAmount} />
      </div>

      {/* Mobile/Tablet: 2x2 grid */}
      <div className="grid lg:hidden grid-cols-2 gap-x-4 gap-y-2 mb-4 mt-2">
        <div>
          <StatusBadge withdrawn={withdrawn} />
        </div>
        <div className="flex justify-end items-start">
          <PayoutPill bountyAmount={bountyAmount} />
        </div>
        {archiveEventDate && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground col-span-2">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {statusLabel} {formatDateTime(archiveEventDate)}
            </span>
          </div>
        )}
        {rating ? (
          <div className="col-span-2">
            <StarRating
              rating={rating}
              size="sm"
              showValue
              colorScheme="yellow"
            />
          </div>
        ) : null}
      </div>

      {/* Meeting Title */}
      {meetingTitle && (
        <div className="mb-3 max-lg:mt-4 min-w-0">
          <div
            className="text-[16px] font-extrabold text-foreground leading-tight line-clamp-2 break-words"
            title={meetingTitle}
          >
            {meetingTitle}
          </div>
        </div>
      )}

      {/* Meeting Description */}
      {meetingDescription && (
        <div className="mb-4 max-lg:mb-6 min-w-0">
          <div className="text-[12.5px] text-muted-foreground leading-relaxed break-words">
            {meetingDescription}
          </div>
        </div>
      )}
    </CardHeader>
  );
}
