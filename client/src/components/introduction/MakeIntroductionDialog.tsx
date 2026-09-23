import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import { INTRODUCTION_MESSAGES } from "@/constants/introduction-messages";
import { isAlreadyAcceptedApiError } from "@/hooks/introduction/deep-link-api-errors";
import { ReviseBountyAmountDialog } from "./ReviseBountyAmountDialog";
import {
  CalendarIcon,
  DollarSign,
  Clock,
  Loader2,
  Video,
  MapPin,
  Phone,
  Mail,
  User,
  Building,
  Send,
  Lock,
  Handshake,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { formatLocalizedDate } from "@/utils/dateFormatter";
import { toUTC } from "@/lib/dayjs";

interface IntroductionRequest {
  id: string;
  status?: string;
  contactId?: string;
  contact_name?: string;
  requester?: {
    full_name?: string;
    company?: string;
  };
  requesterName?: string;
  targetName?: string;
  contactName?: string;
  contact?: {
    first_name?: string;
    last_name?: string;
    name?: string;
  };
  meeting_description?: string;
  meetingDescription?: string;
  meeting_title?: string;
  meetingTitle?: string;
  additional_context?: string;
  additionalContext?: string;
  meeting_duration?: string;
  meeting_platform?: string;
  proposed_meeting_date?: string;
  proposed_meeting_time?: string;
  bounty_amount?: number;
  // Bounty validation fields
  connectorBountyAmount?: number;
  requesterBountyAmount?: number;
  canAccept?: boolean;
}

interface MakeIntroductionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: IntroductionRequest | null;
  onSuccess?: () => void; // Callback for successful email send
  onAccepted?: (requestId: string) => void; // Callback when request is accepted
  onEmailSent?: (requestId: string) => void; // Callback when introduction email is sent
}

export function MakeIntroductionDialog({
  isOpen,
  onClose,
  request,
  onSuccess,
  onAccepted,
  onEmailSent,
}: MakeIntroductionDialogProps) {
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState<
    "review" | "reschedule" | "draft"
  >("review");

  // Mandatory Prospectly footer - cannot be edited
  const prospectlyFooter = `\n\nP.S. This introduction was facilitated through Prospectly, where professionals exchange warm introductions. ${currentUser?.full_name?.split(" ")[0] || "Your connector"} thought you'd be a great fit for the network.`;

  // Rescheduling state
  const [meetingDate] = useState<Date>();
  const [selectedSlot] = useState<string>("");
  const [duration] = useState(request?.meeting_duration || "30min");
  const [platform] = useState("virtual");

  // Email drafting state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  // const [ccRequester, setCcRequester] = useState(true);

  // Decision state
  const [decision, setDecision] = useState<"accept" | "decline" | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // Bounty revision state
  const [isBountyRevisionOpen, setIsBountyRevisionOpen] = useState(false);
  const [requestData, setRequestData] = useState<IntroductionRequest | null>(
    request
  );

  const getRequesterName = useCallback(() => {
    return (
      request?.requester?.full_name || request?.requesterName || "Requester"
    );
  }, [request]);

  const getContactName = useCallback(() => {
    // Check multiple possible property names for contact name
    return (
      request?.targetName ||
      request?.contactName ||
      `${request?.contact?.first_name || ""} ${request?.contact?.last_name || ""}`.trim() ||
      request?.contact?.name ||
      "Contact"
    );
  }, [request]);

  const generateEmailTemplate = useCallback(() => {
    const requesterName = getRequesterName();
    const contactName = getContactName();
    const purpose =
      request?.meeting_description ||
      request?.meetingDescription ||
      "discuss potential opportunities";

    // Extract first names for more personal greeting
    const requesterFirstName = requesterName.split(" ")[0];
    const contactFirstName = contactName.split(" ")[0];

    return `Hi ${contactFirstName},

I hope this email finds you well! I wanted to introduce you to ${requesterFirstName}, who I think you'd find interesting to connect with.

${requesterFirstName} is interested in ${purpose} and I thought you two would have great synergy given your respective expertise.

Would you be open to a ${duration === "30min" ? "30-minute" : duration === "45min" ? "45-minute" : "60-minute"} ${platform === "virtual" ? "virtual" : platform === "in-person" ? "in-person" : "phone"} meeting to explore potential opportunities?

${requesterFirstName}, meet ${contactFirstName}. ${contactFirstName}, meet ${requesterFirstName}.

I'll let you both take it from here!

Best regards,
${currentUser?.full_name || "Your Name"}`;
  }, [
    getRequesterName,
    getContactName,
    request,
    duration,
    platform,
    currentUser,
  ]);

  useEffect(() => {
    if (isOpen && request) {
      // Update request data state
      setRequestData(request);

      // Pre-fill email with template
      setEmailSubject(
        `Introduction: ${request.contact_name || getContactName()} <> ${getRequesterName()}`
      );
      setEmailBody(generateEmailTemplate());

      // If request is already accepted or email failed, skip to draft tab
      if (request.status === "accepted" || request.status === "email_failed") {
        setDecision("accept");
        setCurrentTab("draft");
      } else {
        setDecision(null);
        setCurrentTab("review");
      }
    }
  }, [
    isOpen,
    request,
    getRequesterName,
    getContactName,
    generateEmailTemplate,
  ]);

  const handleAccept = async () => {
    setIsSubmitting(true);

    try {
      // Call the API to accept the request
      await api.introductions.accept(request.id);

      toast({
        title: "Request Accepted Successfully!",
        description: "You can now draft the introduction email.",
      });

      // Notify parent component that request was accepted (for real-time UI update)
      if (onAccepted) {
        onAccepted(request.id);
      }

      setDecision("accept");
      setCurrentTab("draft");
    } catch (error: unknown) {
      // Extract error message - check for ApiError with status 400 (bounty validation)
      let errorMessage = "Failed to accept request. Please try again.";
      let errorTitle = "Error";

      if (error instanceof Error) {
        errorMessage = error.message;

        if (isAlreadyAcceptedApiError(error.message)) {
          errorTitle = INTRODUCTION_MESSAGES.requestAlreadyAccepted.title;
          errorMessage =
            INTRODUCTION_MESSAGES.requestAlreadyAccepted.description;
        } else if (
          /bounty|referral payout/i.test(error.message) ||
          error.message.includes("exceeds")
        ) {
          errorTitle = "Referral Payout Validation Failed";
          if (requestData?.canAccept === false) {
            setIsBountyRevisionOpen(true);
          }
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: isAlreadyAcceptedApiError(errorMessage)
          ? "default"
          : "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenBountyRevision = () => {
    setIsBountyRevisionOpen(true);
  };

  const handleBountyUpdateSuccess = () => {
    // Re-fetch request data to get updated canAccept status
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for declining this request.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Decline via Express API (no Supabase needed)
      await api.introductions.decline(request.id, declineReason);

      toast({
        title: "Request Declined",
        description: "The requester has been notified of your decision.",
      });

      // Call success callback to refresh the inbox
      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to decline request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendIntroduction = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in the email subject and body.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine email body with mandatory footer
      const fullEmailBody = emailBody + prospectlyFooter;

      // Get contact name from request object (no Supabase call needed)
      const targetContactName = getContactName();

      // Send introduction email via Express API
      // The backend API will handle all database updates including:
      // - Email subject, body, meeting details in introduction_requests
      // - Status updates
      // - Bounty stage progression
      await api.introductions.sendIntroduction(request.id, {
        emailSubject: emailSubject,
        emailBody: fullEmailBody,
        contactId: request.contactId,
        targetContactName: targetContactName,
        proposedMeetingDate: meetingDate
          ? format(meetingDate, "yyyy-MM-dd")
          : null,
        proposedMeetingTime: selectedSlot || null,
        meetingDuration: duration,
        meetingPlatform: platform,
      });

      toast({
        title: "Introduction Sent! 📧",
        description: `The introduction email with meeting booking link has been sent to ${targetContactName}.`,
      });

      // Notify parent component that email was sent (for real-time UI update)
      if (onEmailSent) {
        onEmailSent(request.id);
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send introduction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  const requesterName = getRequesterName();
  const contactName = getContactName();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?";

  const requesterInitials = getInitials(requesterName);
  const contactInitials = getInitials(contactName);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0"
        mobileFullscreen
        hideCloseButton
      >
        {/* Gradient hero header */}
        <section className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-5 py-6 text-white shadow-brand-card sm:px-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/20 backdrop-blur">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
                  Make Introduction
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] leading-snug text-white/85">
                  Review and facilitate the connection between {requesterName}{" "}
                  and {contactName}
                </DialogDescription>
              </div>
            </div>
            <DialogClose className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-white/25 bg-white/15 text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              <X className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </section>

        <Tabs
          value={currentTab}
          onValueChange={(v) =>
            setCurrentTab(v as "review" | "reschedule" | "draft")
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 px-4 pt-4 sm:px-7">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-2xl bg-muted p-1.5">
              <TabsTrigger
                value="review"
                className="gap-2 rounded-xl py-2.5 text-sm font-bold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-brand-amethyst data-[state=active]:shadow-sm"
              >
                <User className="h-4 w-4" />
                Review Request
              </TabsTrigger>
              <TabsTrigger
                value="draft"
                disabled={decision !== "accept"}
                className="gap-2 rounded-xl py-2.5 text-sm font-bold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-brand-amethyst data-[state=active]:shadow-sm"
              >
                <Mail className="h-4 w-4" />
                Draft Email
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Review Tab */}
          <TabsContent
            value="review"
            className="m-0 flex min-h-0 flex-1 flex-col focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-7">
              {/* People */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Requester */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-brand-sky/20 bg-brand-sky/10 px-4 py-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-sky" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-sky">
                      Requester
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-brand-gradient text-base font-bold text-white">
                        {requesterInitials}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="break-words text-[14px] font-extrabold leading-tight">
                          {requesterName}
                        </p>
                        {request.requester?.company && (
                          <span className="mt-1 flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                            <Building className="h-3.5 w-3.5 flex-shrink-0 text-brand-sky" />
                            <span className="truncate text-foreground">
                              {request.requester.company}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Your Contact */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-brand-rose/20 bg-brand-rose/10 px-4 py-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-rose" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-rose">
                      Your Contact
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-brand-success text-base font-bold text-white">
                        {contactInitials}
                      </span>
                      <p className="min-w-0 break-words text-[14px] font-extrabold leading-tight">
                        {contactName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat strip */}
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
                <div className="flex items-center gap-3 bg-card p-3.5">
                  <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-success/10 text-brand-success">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Referral Payout Offered
                    </div>
                    <div className="truncate text-[15px] font-bold text-brand-success">
                      ${request.bounty_amount?.toLocaleString() || "0"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-card p-3.5">
                  <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-amethyst/10 text-brand-amethyst">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Proposed Duration
                    </div>
                    <div className="truncate text-[15px] font-bold">
                      {request.meeting_duration || "30min"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-card p-3.5">
                  <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-sky/10 text-brand-sky">
                    {request.meeting_platform === "in-person" ? (
                      <MapPin className="h-4 w-4" />
                    ) : request.meeting_platform === "phone" ? (
                      <Phone className="h-4 w-4" />
                    ) : (
                      <Video className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Meeting Type
                    </div>
                    <div className="truncate text-[15px] font-bold capitalize">
                      {request.meeting_platform || "Virtual"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Meeting Title (read-only) */}
              {(request.meeting_title || request.meetingTitle) && (
                <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-sky/10 text-brand-sky">
                      <CalendarIcon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold">Meeting Title</h3>
                  </div>
                  <p className="break-words text-sm font-medium leading-relaxed text-foreground">
                    {request.meeting_title || request.meetingTitle}
                  </p>
                </section>
              )}

              {/* Meeting Purpose (read-only) */}
              {(request.meeting_description || request.meetingDescription) && (
                <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-amethyst/10 text-brand-amethyst">
                      <Mail className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold">Meeting Purpose</h3>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                    {request.meeting_description || request.meetingDescription}
                  </p>
                </section>
              )}

              {/* Additional Context (read-only) */}
              {(request.additional_context || request.additionalContext) && (
                <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-amethyst/10 text-brand-amethyst">
                      <Mail className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold">
                      Additional Context
                    </h3>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                    {request.additional_context || request.additionalContext}
                  </p>
                </section>
              )}

              {/* Proposed Schedule */}
              {request.proposed_meeting_date &&
                request.proposed_meeting_time && (
                  <div className="flex items-start gap-3 rounded-2xl border border-brand-sky/20 bg-brand-sky/10 p-4">
                    <CalendarIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-sky" />
                    <p className="text-sm leading-relaxed text-foreground">
                      <strong className="font-semibold">
                        Proposed Schedule:
                      </strong>{" "}
                      {format(toUTC(request.proposed_meeting_date), "EEEE")},{" "}
                      {formatLocalizedDate(request.proposed_meeting_date)} at{" "}
                      {request.proposed_meeting_time}
                    </p>
                  </div>
                )}

              {/* Bounty Validation Message */}
              {!decision &&
                requestData?.canAccept === false &&
                requestData?.connectorBountyAmount !== undefined &&
                requestData?.requesterBountyAmount !== undefined && (
                  <div className="flex items-start gap-3 rounded-2xl border border-brand-warning/30 bg-brand-warning/10 p-4">
                    <DollarSign className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-warning" />
                    <p className="text-sm leading-relaxed text-foreground">
                      <strong className="font-semibold text-brand-warning">
                        Referral Payout Adjustment Required:
                      </strong>{" "}
                      Your current referral payout ($
                      {requestData.connectorBountyAmount.toLocaleString()}) is
                      higher than the requester's referral payout ($
                      {requestData.requesterBountyAmount.toLocaleString()}).
                      Please set your referral payout to $
                      {requestData.requesterBountyAmount.toLocaleString()} or
                      less to accept this request.
                    </p>
                  </div>
                )}

              {/* Decline Reason */}
              {decision === "decline" && (
                <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <Label htmlFor="decline-reason" className="font-semibold">
                    Reason for Declining
                  </Label>
                  <Textarea
                    id="decline-reason"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Please provide a brief explanation for declining this request..."
                    rows={4}
                  />
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setDecision(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDecline}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Declining...
                        </>
                      ) : (
                        "Confirm Decline"
                      )}
                    </Button>
                  </div>
                </section>
              )}
            </div>

            {/* Sticky footer (review) */}
            {!decision && (
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border bg-card px-4 py-4 sm:px-7">
                {requestData?.canAccept !== false ? (
                  <Button
                    className="flex-1 bg-brand-success text-white shadow-brand-cta hover:bg-brand-success/90"
                    onClick={handleAccept}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <Handshake className="h-4 w-4 mr-2" />
                        Accept Request
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-brand-warning text-white shadow-brand-cta hover:bg-brand-warning/90"
                    onClick={handleOpenBountyRevision}
                    disabled={isSubmitting}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Revise Referral Payout & Accept
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Draft Email Tab */}
          <TabsContent
            value="draft"
            className="m-0 flex min-h-0 flex-1 flex-col focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-7">
              <div className="space-y-2">
                <Label htmlFor="email-subject" className="font-semibold">
                  Email Subject
                </Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Introduction: [Contact] <> [Requester]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-body" className="font-semibold">
                  Email Body
                </Label>
                <Textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={14}
                  className="font-mono text-sm"
                />
                {/* Mandatory footer - shown but not editable */}
                <div className="mt-2 rounded-xl border border-border bg-muted/50 p-3.5">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Automatic footer (included in all emails)
                  </p>
                  <p className="text-[13px] italic leading-relaxed text-foreground/80">
                    {prospectlyFooter.trim()}
                  </p>
                </div>
              </div>

              {/* <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
                <input
                  type="checkbox"
                  id="cc-requester"
                  checked={ccRequester}
                  onChange={(e) => setCcRequester(e.target.checked)}
                  className="rounded"
                />
                <Label
                  htmlFor="cc-requester"
                  className="text-sm cursor-pointer"
                >
                  CC requester on this email
                </Label>
              </div> */}
            </div>

            {/* Sticky footer (draft) */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-card px-4 py-4 sm:px-7">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="bg-brand-gradient text-brand-foreground shadow-brand-cta hover:opacity-90"
                onClick={handleSendIntroduction}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Introduction
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Bounty Revision Dialog */}
      <ReviseBountyAmountDialog
        open={isBountyRevisionOpen}
        onOpenChange={setIsBountyRevisionOpen}
        connectorBountyAmount={requestData?.connectorBountyAmount}
        requesterBountyAmount={requestData?.requesterBountyAmount}
        contactId={requestData?.contactId}
        onSuccess={handleBountyUpdateSuccess}
      />
    </Dialog>
  );
}
