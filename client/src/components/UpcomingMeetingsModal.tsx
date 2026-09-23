import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpcomingMeetings } from "@/hooks/useUpcomingMeetings";
import { formatMeetingDateWithTimezone } from "@/utils/dateFormatting";
import {
  Calendar,
  Clock,
  Video,
  Loader2,
  DollarSign,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";

interface UpcomingMeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpcomingMeetingsModal({
  isOpen,
  onClose,
}: UpcomingMeetingsModalProps) {
  const { meetings, loading, error, refetch } = useUpcomingMeetings(isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] sm:max-h-[85vh] overflow-hidden flex flex-col" mobileFullscreen>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>
                Upcoming Meetings
                {!loading && !error && meetings.length > 0 && (
                  <span className="ml-2 text-muted-foreground font-normal">
                    ({meetings.length}{" "}
                    {meetings.length === 1 ? "meeting" : "meetings"})
                  </span>
                )}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 -mx-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading meetings...
              </span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-destructive mb-2">
                Failed to load meetings
              </p>
              <p className="text-xs text-muted-foreground">
                Please try again later
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && meetings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No upcoming meetings
              </p>
              <p className="text-xs text-muted-foreground">
                You don't have any scheduled meetings at this time
              </p>
            </div>
          )}

          {!loading && !error && meetings.length > 0 && (
            <div className="space-y-4 pb-4 px-1">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="border rounded-lg bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 hover:shadow-md transition-all duration-200 overflow-hidden relative"
                >
                  {/* Referral Payout - Top Right Corner */}
                  <div className="absolute top-4 right-4 z-20">
                    <div className="px-4 py-2 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-900/50 dark:to-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 text-center">
                        REFERRAL PAYOUT
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
                          {meeting.bountyAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header with Title */}
                  <div className="p-5 pb-4 pr-44">
                    {/* Title */}
                    {meeting.title && (
                      <h3 className="font-semibold text-base mb-3 text-foreground line-clamp-2 hover:line-clamp-none transition-all break-words">
                        {meeting.title}
                      </h3>
                    )}

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3 hover:line-clamp-none transition-all break-words">
                      {meeting.description}
                    </p>

                    {/* Date and Time */}
                    <div className="flex items-center gap-2 text-sm mb-4">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground font-medium">
                        {formatMeetingDateWithTimezone(meeting.meetingDate)}
                      </span>
                    </div>
                  </div>

                  {/* Participants Section - Three Column Layout with Handshake */}
                  <div className="px-5 pb-4">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                      {/* First Participant - You (if requester) or Requester (if connector) */}
                      {meeting.isRequester
                        ? // Requester view: Show "You"
                          meeting.requesterName && (
                            <div className="bg-gradient-to-br from-blue-50/60 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3 flex flex-col items-center">
                              <PremiumAvatar
                                name={meeting.requesterName}
                                size="sm"
                                imageUrl={meeting.requesterPhotoUrl || null}
                                className="mb-2"
                              />
                              <div className="font-semibold text-sm text-center text-foreground truncate w-full">
                                {meeting.requesterName}
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs mt-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 text-blue-700 hover:bg-blue-700 hover:text-blue-50 dark:text-blue-300"
                              >
                                You
                              </Badge>
                            </div>
                          )
                        : // Connector view: Show "Requester"
                          meeting.requesterName && (
                            <div className="bg-gradient-to-br from-blue-50/60 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3 flex flex-col items-center">
                              <PremiumAvatar
                                name={meeting.requesterName}
                                size="sm"
                                imageUrl={meeting.requesterPhotoUrl || null}
                                className="mb-2"
                              />
                              <div className="font-semibold text-sm text-center text-foreground truncate w-full">
                                {meeting.requesterName}
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs mt-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 text-blue-700 hover:bg-blue-700 hover:text-blue-50 dark:text-blue-300"
                              >
                                Requester
                              </Badge>
                            </div>
                          )}

                      {/* Handshake Icon */}
                      <div className="flex items-center justify-center">
                        <div className="p-2 rounded-full bg-transparent hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-200 cursor-pointer">
                          <Handshake className="h-6 w-6 text-primary flex-shrink-0 hover:scale-110 transition-all duration-200" />
                        </div>
                      </div>

                      {/* Second Participant - Prospect */}
                      {meeting.prospectName && (
                        <div className="bg-gradient-to-br from-purple-50/60 to-purple-50/30 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-lg p-3 flex flex-col items-center">
                          <PremiumAvatar
                            name={meeting.prospectName}
                            size="sm"
                            imageUrl={meeting.prospectPhotoUrl || null}
                            className="mb-2"
                          />
                          <div className="font-semibold text-sm text-center text-foreground truncate w-full">
                            {meeting.prospectName}
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs mt-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 text-purple-700 hover:bg-purple-700 hover:text-purple-50 dark:text-purple-300"
                          >
                            Prospect
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Join Meeting Button - Only show for requesters */}
                  {meeting.isRequester && meeting.meetingLink && (
                    <div className="px-5 pb-5 pt-0">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        aria-label={`Join meeting: ${meeting.title || "Meeting"}`}
                        onClick={() => {
                          window.open(meeting.meetingLink, "_blank");
                        }}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Join Meeting
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
