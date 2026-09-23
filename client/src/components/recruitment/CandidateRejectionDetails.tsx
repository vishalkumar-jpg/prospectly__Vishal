import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsDown } from "lucide-react";
import { formatDateTime } from "@/utils/dateFormatter";
import type { CandidateDetailResponse } from "@/lib/api/recruitment";

type CandidateRejectionDetailsProps = {
  rejection: NonNullable<CandidateDetailResponse["rejection"]>;
};

export function CandidateRejectionDetails({
  rejection,
}: CandidateRejectionDetailsProps) {
  const initials = rejection.rejectedBy?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-xl border border-brand-destructive/20 bg-brand-destructive/5 p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-brand-destructive">
        <ThumbsDown className="h-3.5 w-3.5" /> Rejection Details
      </p>
      <div className="space-y-3 text-sm">
        {rejection.rejectedBy ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              {rejection.rejectedBy.avatar ? (
                <AvatarImage
                  src={rejection.rejectedBy.avatar}
                  alt={rejection.rejectedBy.name}
                />
              ) : null}
              <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                {initials || "R"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                {rejection.rejectedBy.name}
              </p>
              {rejection.rejectedBy.email ? (
                <p className="truncate text-muted-foreground">
                  {rejection.rejectedBy.email}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Rejected on</span>
          <span className="font-medium text-foreground">
            {formatDateTime(rejection.rejectedAt)}
          </span>
        </div>
        {rejection.category ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Rejection Reason</span>
            <span className="font-medium text-brand-destructive">
              {rejection.category}
            </span>
          </div>
        ) : null}
        {rejection.note ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">
              Rejection Notes
            </p>
            <p className="rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
              {rejection.note}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
