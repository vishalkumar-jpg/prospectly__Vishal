import { Handshake, DollarSign, X, Loader2, Mail, Eye } from "lucide-react";
import { InboxRequest } from "./inboxUtils";
import { AnyType } from "@/types/common";

interface InboxCardActionsProps {
  request: InboxRequest;
  setSelectedRequest: (request: AnyType) => void;
  setIsMakeIntroDialogOpen: (open: boolean) => void;
  handleOpenBountyRevision: (request: AnyType) => void;
  setRequestToDecline: (request: AnyType) => void;
  setIsDeclineDialogOpen: (open: boolean) => void;
  isDeclineDialogOpen: boolean;
  isDeclining: boolean;
  requestToDecline: InboxRequest | null;
  setSelectedRequestForEmail: (id: string) => void;
  setEmailTrackingModalOpen: (open: boolean) => void;
}

export function InboxCardActions({
  request,
  setSelectedRequest,
  setIsMakeIntroDialogOpen,
  handleOpenBountyRevision,
  setRequestToDecline,
  setIsDeclineDialogOpen,
  isDeclineDialogOpen,
  isDeclining,
  requestToDecline,
  setSelectedRequestForEmail,
  setEmailTrackingModalOpen,
}: InboxCardActionsProps) {
  return (
    <div
      className="mt-4 pt-4 border-t border-dashed border-border flex items-center justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Action Buttons - Right Side */}
      <div className="flex items-center gap-3">
        {request.status === "pending" && request.entryStatus !== "declined" && (
          <>
            {request.canAccept !== false ? (
              <button
                className="flex items-center justify-center gap-1.5 px-6 py-2.5 h-10 rounded-lg bg-brand-gradient text-brand-foreground border-0 shadow-brand-cta font-bold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-brand-cta"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRequest(request);
                  setIsMakeIntroDialogOpen(true);
                }}
                disabled={isDeclining}
              >
                <Handshake className="h-4 w-4 flex-shrink-0" />
                <span className="text-[13px]">Accept</span>
              </button>
            ) : (
              <button
                className="flex items-center justify-center gap-1.5 px-6 py-2.5 h-10 rounded-lg border border-brand-warning/30 bg-brand-warning/5 text-brand-warning font-bold cursor-pointer transition-colors hover:bg-brand-warning/10 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenBountyRevision(request);
                }}
                disabled={isDeclining}
              >
                <DollarSign className="h-4 w-4 flex-shrink-0" />
                <span className="text-[13px]">Revise Referral Payout</span>
              </button>
            )}
            <button
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 h-10 rounded-lg border border-brand-destructive/30 bg-brand-destructive/5 text-brand-destructive font-bold cursor-pointer transition-colors hover:bg-brand-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => {
                e.stopPropagation();
                setRequestToDecline(request);
                setIsDeclineDialogOpen(true);
              }}
              disabled={
                isDeclining ||
                (requestToDecline?.id === request.id && isDeclineDialogOpen)
              }
            >
              {isDeclining && requestToDecline?.id === request.id ? (
                <>
                  <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  <span className="text-[13px]">Declining...</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[13px]">Decline</span>
                </>
              )}
            </button>
          </>
        )}

        {(request.status === "accepted" ||
          request.status === "email_failed") && (
          <button
            className="flex items-center justify-center gap-1.5 px-6 py-2.5 h-10 rounded-lg border border-brand-sky/30 bg-brand-sky/5 text-brand-sky font-bold cursor-pointer transition-colors hover:bg-brand-sky/10"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRequest(request);
              setIsMakeIntroDialogOpen(true);
            }}
          >
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="text-[13px]">
              {request.status === "email_failed"
                ? "Retry Email"
                : "Draft Email"}
            </span>
          </button>
        )}

        {request.status === "intro_sent" && (
          <>
            <button
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 h-10 rounded-lg border border-border bg-muted/50 text-muted-foreground font-bold cursor-not-allowed"
              disabled
            >
              <Eye className="h-4 w-4 flex-shrink-0" />
              <span className="text-[13px]">Sent</span>
            </button>
            <button
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 h-10 rounded-lg border border-border bg-card text-foreground font-bold cursor-pointer transition-colors hover:border-brand-amethyst/40 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRequestForEmail(request.id);
                setEmailTrackingModalOpen(true);
              }}
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="text-[13px]">Track</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
