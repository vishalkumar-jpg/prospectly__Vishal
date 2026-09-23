import { Card, CardContent } from "@/components/ui/card";
import { InboxRequest } from "./inboxUtils";
import { InboxCardHeader } from "./InboxCardHeader";
import { InboxCardRequester } from "./InboxCardRequester";
import { InboxCardProspect } from "./InboxCardProspect";
import { InboxCardContent } from "./InboxCardContent";
import { InboxCardActions } from "./InboxCardActions";
import { AnyType } from "@/types/common";

interface InboxCardProps {
  request: InboxRequest;
  setSelectedRequesterDetails: (details: AnyType) => void;
  setIsRequesterPopupOpen: (open: boolean) => void;
  handleViewReviews: (details: AnyType) => void;
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

export function InboxCard({
  request,
  setSelectedRequesterDetails,
  setIsRequesterPopupOpen,
  handleViewReviews,
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
}: InboxCardProps) {
  const requesterName =
    request.requesterName ||
    request.requester?.name ||
    `${request.requester?.first_name || ""} ${request.requester?.last_name || ""}`.trim() ||
    (request.requester?.email
      ? String(request.requester.email).split("@")[0]
      : "") ||
    "Unknown User";

  const contactFullName =
    `${request.contact?.first_name || ""} ${request.contact?.last_name || ""}`.trim();

  return (
    <Card className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-brand-card transition-all hover:border-brand-amethyst/20 hover:shadow-lg max-sm:overflow-x-hidden">
      {/* Header Section */}
      <InboxCardHeader request={request} />

      {/* Requester → Prospect Layout - stacked on mobile/tablet, side-by-side on desktop */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-sm:gap-4 md:gap-4 lg:gap-6 items-start mt-3">
          <InboxCardRequester
            request={request}
            requesterName={requesterName}
            setSelectedRequesterDetails={setSelectedRequesterDetails}
            setIsRequesterPopupOpen={setIsRequesterPopupOpen}
            handleViewReviews={handleViewReviews}
          />

          <InboxCardProspect
            request={request}
            contactFullName={contactFullName}
          />
        </div>
      </div>

      <CardContent className="pt-0 flex-1 flex flex-col justify-between px-4">
        <InboxCardContent request={request} />

        {/* Footer: Action Buttons */}
        <InboxCardActions
          request={request}
          setSelectedRequest={setSelectedRequest}
          setIsMakeIntroDialogOpen={setIsMakeIntroDialogOpen}
          handleOpenBountyRevision={handleOpenBountyRevision}
          setRequestToDecline={setRequestToDecline}
          setIsDeclineDialogOpen={setIsDeclineDialogOpen}
          isDeclineDialogOpen={isDeclineDialogOpen}
          isDeclining={isDeclining}
          requestToDecline={requestToDecline}
          setSelectedRequestForEmail={setSelectedRequestForEmail}
          setEmailTrackingModalOpen={setEmailTrackingModalOpen}
        />
      </CardContent>
    </Card>
  );
}
