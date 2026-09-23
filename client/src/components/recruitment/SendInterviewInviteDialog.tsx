import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Send,
  User,
  Building2,
  Eye,
  CheckCircle,
  Video,
  MapPin,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectorCandidate } from "./ConnectorCandidateCard";

interface SendInterviewInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: ConnectorCandidate | null;
  onSent: () => void;
}

// Mock available slots from recruiter's calendar
const mockAvailableSlots = [
  { date: "2026-01-27", slots: ["09:00", "10:00", "14:00", "15:00", "16:00"] },
  { date: "2026-01-28", slots: ["09:00", "11:00", "13:00", "14:00"] },
  { date: "2026-01-29", slots: ["10:00", "11:00", "15:00", "16:00"] },
  { date: "2026-01-30", slots: ["09:00", "10:00", "13:00", "14:00", "15:00"] },
  { date: "2026-01-31", slots: ["11:00", "14:00", "16:00"] },
];

export function SendInterviewInviteDialog({
  open,
  onOpenChange,
  candidate,
  onSent,
}: SendInterviewInviteDialogProps) {
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");
  const [interviewType, setInterviewType] = useState<
    "video" | "phone" | "in_person"
  >("video");
  const [duration, setDuration] = useState("60");
  const [subject, setSubject] = useState(
    `Interview invitation: ${candidate?.jobTitle || "[Job Title]"} at ${candidate?.jobCompany || "[Company]"}`
  );
  const [message, setMessage] = useState(
    `Hi ${candidate?.candidateName.split(" ")[0] || "[Name]"},

Great news! The team at ${candidate?.jobCompany || "[Company]"} was impressed with your profile and would like to schedule an interview for the ${candidate?.jobTitle || "[Job Title]"} position.

**Interview Details:**
- Duration: ${duration} minutes
- Format: ${interviewType === "video" ? "Video Call" : interviewType === "phone" ? "Phone Call" : "In-Person"}

Please use the booking link below to select a time that works best for you. The recruiter's available slots are shown for your convenience.

Looking forward to the next step in your journey!

Best regards`
  );

  if (!candidate) return null;

  const handleSend = () => {
    onSent();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" mobileFullscreen>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Send Interview Invite
          </DialogTitle>
          <DialogDescription>
            Send a booking link to {candidate.candidateName} for an interview
            with {candidate.jobCompany}
          </DialogDescription>
        </DialogHeader>

        {/* Candidate & Job Summary */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <Card className="border-indigo-200 bg-indigo-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-indigo-600" />
                <span className="font-medium text-sm">Candidate</span>
              </div>
              <p className="font-semibold">{candidate.candidateName}</p>
              <p className="text-sm text-slate-600">
                {candidate.candidateEmail}
              </p>
              <Badge className="mt-2 bg-indigo-100 text-indigo-700">
                {candidate.matchScore}% Match
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-cyan-200 bg-cyan-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-cyan-600" />
                <span className="font-medium text-sm">Recruiter</span>
              </div>
              <p className="font-semibold">{candidate.jobCompany}</p>
              <p className="text-sm text-slate-600">{candidate.jobTitle}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-cyan-600">
                <CheckCircle className="h-3 w-3" />
                Calendar connected
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Interview Settings */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="space-y-2">
            <Label>Interview Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={interviewType === "video" ? "default" : "outline"}
                size="sm"
                onClick={() => setInterviewType("video")}
                className={cn(interviewType === "video" && "bg-indigo-600")}
              >
                <Video className="h-3 w-3 mr-1" />
                Video
              </Button>
              <Button
                type="button"
                variant={interviewType === "phone" ? "default" : "outline"}
                size="sm"
                onClick={() => setInterviewType("phone")}
                className={cn(interviewType === "phone" && "bg-indigo-600")}
              >
                Phone
              </Button>
              <Button
                type="button"
                variant={interviewType === "in_person" ? "default" : "outline"}
                size="sm"
                onClick={() => setInterviewType("in_person")}
                className={cn(interviewType === "in_person" && "bg-indigo-600")}
              >
                <MapPin className="h-3 w-3 mr-1" />
                In-Person
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex gap-2">
              {["30", "45", "60", "90"].map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={duration === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDuration(d)}
                  className={cn(duration === d && "bg-indigo-600")}
                >
                  {d}m
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Available Slots Preview */}
        <div className="py-4">
          <Label className="mb-3 block">
            Recruiter's Available Slots (Preview)
          </Label>
          <ScrollArea className="h-32">
            <div className="flex gap-4">
              {mockAvailableSlots.map((day) => (
                <Card key={day.date} className="min-w-[140px] border-slate-200">
                  <CardContent className="p-3">
                    <p className="font-medium text-sm mb-2">
                      {formatDate(day.date)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {day.slots.map((slot) => (
                        <Badge
                          key={slot}
                          variant="secondary"
                          className="text-xs"
                        >
                          {slot}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <p className="text-xs text-slate-500 mt-2">
            Candidate will see all available slots and pick one that works for
            them
          </p>
        </div>

        <Separator />

        {/* Email Composition */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose" className="gap-2">
              <Calendar className="h-4 w-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Message</Label>
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Assist
                </Button>
              </div>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <Card className="border-slate-200">
              <CardContent className="p-6">
                {/* Email Header */}
                <div className="border-b pb-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <span className="font-medium">To:</span>
                    <span>{candidate.candidateEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <span className="font-medium">Subject:</span>
                    <span>{subject}</span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm">{message}</div>
                </div>

                {/* Booking Link Section */}
                <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-lg border border-indigo-200">
                  <div className="text-center mb-4">
                    <p className="text-sm text-slate-600 mb-3">
                      Click below to schedule your interview
                    </p>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Interview Time
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>

                  {/* Interview Details Card */}
                  <Card className="bg-white/80 mt-4">
                    <CardContent className="p-3">
                      <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                          <p className="text-slate-500 text-xs">Role</p>
                          <p className="font-medium">{candidate.jobTitle}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Duration</p>
                          <p className="font-medium">{duration} minutes</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Format</p>
                          <p className="font-medium capitalize">
                            {interviewType.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Separator className="my-4" />
                  <div className="text-center text-xs text-slate-500">
                    <p>
                      Sent via{" "}
                      <span className="font-semibold text-indigo-600">
                        Prospectly
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Interview Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendInterviewInviteDialog;
