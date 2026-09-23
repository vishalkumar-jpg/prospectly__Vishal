import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  Video,
  Link as LinkIcon,
  Mail,
  UserPlus,
} from "lucide-react";
import { useCalendarIntegration } from "@/hooks/useCalendarIntegration";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AnyType } from "@/types/common";
import { toUTC, utcDayjs } from "@/lib/dayjs";

interface MeetingSchedulingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requesterName: string;
  targetName: string;
  onSchedule: (meetingDetails: AnyType) => void;
}

export function MeetingSchedulingDialog({
  isOpen,
  onClose,
  requesterName,
  targetName,
  onSchedule,
}: MeetingSchedulingDialogProps) {
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [duration, setDuration] = useState("30min");
  const [platform, setPlatform] = useState("zoom");
  const [meetingLink, setMeetingLink] = useState("");
  const [agenda, setAgenda] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [contacts, setContacts] = useState<AnyType[]>([]);
  const [openContactSelect, setOpenContactSelect] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const { toast } = useToast();
  const { integrations, createMeeting } = useCalendarIntegration();

  // Load contacts when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    // TODO: Add Express API endpoint GET /api/contacts to fetch user's contacts
    // For now, contacts selection is disabled until endpoint is implemented
    setContacts([]);
  };

  const handleSchedule = async () => {
    if (!attendeeEmail) {
      toast({
        title: "Missing Contact",
        description: "Please select a contact to invite to the meeting",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingEvent(true);

    try {
      // Get the first active calendar integration
      const activeIntegration = integrations.find((i) => i.isActive);

      if (!activeIntegration) {
        toast({
          title: "No Calendar Connected",
          description: "Please connect a calendar integration first",
          variant: "destructive",
        });
        setIsCreatingEvent(false);
        return;
      }

      // Create datetime in ISO format
      const startDateTime = `${meetingDate}T${meetingTime}:00`;
      const durationMinutes = parseInt(duration.replace("min", ""));
      const endDateTime = utcDayjs(startDateTime)
        .add(durationMinutes, "minute")
        .toISOString();

      // Create the calendar event
      const result = await createMeeting(
        activeIntegration.provider as AnyType,
        {
          title: `Meeting: ${requesterName} & ${targetName}`,
          description:
            agenda || `Meeting between ${requesterName} and ${targetName}`,
          startTime: toUTC(startDateTime).toISOString(),
          endTime: endDateTime,
          attendees: [attendeeEmail],
          location: meetingLink || undefined,
        }
      );

      if (result.success) {
        const meetingDetails = {
          date: meetingDate,
          time: meetingTime,
          duration,
          platform,
          meetingLink: result.data?.meeting_link || meetingLink,
          agenda,
          attendeeEmail,
          confirmedAt: toUTC().toISOString(),
          remindersSent: 0,
          calendarEventId: result.data?.event_id,
        };

        onSchedule(meetingDetails);

        toast({
          title: "Meeting Scheduled!",
          description: `Calendar event created and invitation sent to ${attendeeEmail}`,
        });

        onClose();
      } else {
        throw new Error(result.error || "Failed to create calendar event");
      }
    } catch (error: AnyType) {
      toast({
        title: "Failed to Create Event",
        description:
          error.message || "Could not create calendar event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Meeting
          </DialogTitle>
          <DialogDescription>
            Coordinate a meeting between {requesterName} and {targetName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meeting participants */}
          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-blue-50 border-blue-200"
              >
                Requester: {requesterName}
              </Badge>
              <span className="text-muted-foreground">↔</span>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 hover:bg-green-700 hover:text-green-50 border-green-200"
              >
                Target: {targetName}
              </Badge>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Meeting Date
              </Label>
              <Input
                id="meeting-date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                min={toUTC().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Meeting Time
              </Label>
              <Input
                id="meeting-time"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration and Platform */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15min">15 minutes</SelectItem>
                  <SelectItem value="30min">30 minutes</SelectItem>
                  <SelectItem value="45min">45 minutes</SelectItem>
                  <SelectItem value="60min">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Platform
              </Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="google-meet">Google Meet</SelectItem>
                  <SelectItem value="in-person">In Person</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Select Contact Email <span className="text-destructive">*</span>
            </Label>
            <Popover
              open={openContactSelect}
              onOpenChange={setOpenContactSelect}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openContactSelect}
                  className="w-full justify-between"
                >
                  {attendeeEmail || "Select contact email..."}
                  <UserPlus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search contacts..." />
                  <CommandEmpty>No contact found.</CommandEmpty>
                  <CommandGroup>
                    {contacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={contact.email}
                        onSelect={(currentValue) => {
                          setAttendeeEmail(currentValue);
                          setOpenContactSelect(false);
                        }}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>
                            {contact.first_name} {contact.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {contact.email}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Meeting Link */}
          {platform !== "in-person" && (
            <div className="space-y-2">
              <Label htmlFor="meeting-link" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Meeting Link (Optional)
              </Label>
              <Input
                id="meeting-link"
                placeholder="https://zoom.us/j/... or meeting room link"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
          )}

          {/* Agenda */}
          <div className="space-y-2">
            <Label htmlFor="agenda">Meeting Agenda (Optional)</Label>
            <Textarea
              id="agenda"
              placeholder="Brief agenda or talking points for the meeting..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreatingEvent}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={
                !meetingDate ||
                !meetingTime ||
                !attendeeEmail ||
                isCreatingEvent
              }
              className="bg-green-600 hover:bg-green-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {isCreatingEvent ? "Creating Event..." : "Create Calendar Event"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
