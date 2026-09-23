import { Button } from "@/components/ui/button";
import { Video, FileText } from "lucide-react";
import { CandidateApplication } from "@/lib/types/recruitment";
import { canJoinMeeting } from "@/utils/recruitmentDisplay";

interface ApplicationActionsProps {
  application: CandidateApplication;
  onViewDetails?: () => void;
}

export function ApplicationActions({
  application,
  onViewDetails,
}: ApplicationActionsProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {canJoinMeeting(application) && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-600 hover:text-white hover:border-teal-700"
          onClick={() => {
            window.open(
              application.meetingLink,
              "_blank",
              "noopener,noreferrer"
            );
          }}
        >
          <Video className="h-3 w-3 mr-1" />
          Join Meeting
        </Button>
      )}
      {onViewDetails && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs gap-1.5"
          onClick={onViewDetails}
        >
          <FileText className="h-3.5 w-3.5" />
          Job Details
        </Button>
      )}
    </div>
  );
}
