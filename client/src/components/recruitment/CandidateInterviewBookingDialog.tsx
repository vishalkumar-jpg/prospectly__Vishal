import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  Video,
  Phone,
  Building,
  CheckCircle,
  Loader2,
  Briefcase,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateApplication } from "./ApplicationStatusCard";

interface CandidateInterviewBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: CandidateApplication | null;
  onBooked: (slotId: string) => void;
}

// Mock available time slots sent by recruiter
const AVAILABLE_SLOTS = [
  { id: "slot1", date: "2026-01-24", time: "09:00" },
  { id: "slot2", date: "2026-01-24", time: "14:00" },
  { id: "slot3", date: "2026-01-25", time: "10:00" },
  { id: "slot4", date: "2026-01-25", time: "15:30" },
  { id: "slot5", date: "2026-01-27", time: "11:00" },
];

export function CandidateInterviewBookingDialog({
  open,
  onOpenChange,
  application,
  onBooked,
}: CandidateInterviewBookingDialogProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  if (!application) return null;

  const handleBook = async () => {
    if (!selectedSlot) return;
    setIsBooking(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsBooking(false);
    onBooked(selectedSlot);
    setSelectedSlot(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Group slots by date
  const slotsByDate = AVAILABLE_SLOTS.reduce(
    (acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push(slot);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_SLOTS>
  );

  const getInterviewTypeIcon = () => {
    switch (application.interviewType) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "in_person":
        return <Building className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            Book Your Interview
          </DialogTitle>
          <DialogDescription>
            Select your preferred time slot for the interview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Job Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="h-5 w-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-800">
                  {application.jobTitle}
                </p>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {application.companyName}
                </p>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                {getInterviewTypeIcon()}
                <span>
                  {application.interviewType === "video"
                    ? "Video Call"
                    : application.interviewType === "phone"
                      ? "Phone Call"
                      : "In-Person"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="h-4 w-4" />
                <span>{application.interviewDuration || 45} minutes</span>
              </div>
            </div>
          </div>

          {/* Available Slots */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-700">Available Time Slots</h4>
            {Object.entries(slotsByDate).map(([date, slots]) => (
              <div key={date}>
                <p className="text-sm font-medium text-slate-600 mb-2">
                  {formatDate(date)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        selectedSlot === slot.id
                          ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "font-medium",
                            selectedSlot === slot.id
                              ? "text-teal-700"
                              : "text-slate-700"
                          )}
                        >
                          {formatTime(slot.time)}
                        </span>
                        {selectedSlot === slot.id && (
                          <CheckCircle className="h-4 w-4 text-teal-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* What to expect */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">What to expect</h4>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  You'll receive a confirmation email with meeting details
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Calendar invite will be sent to your email</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Reminder notification 24 hours before</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBook}
            disabled={!selectedSlot || isBooking}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isBooking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Confirm Booking
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CandidateInterviewBookingDialog;
