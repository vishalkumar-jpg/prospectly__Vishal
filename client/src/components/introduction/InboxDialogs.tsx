import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Send, Wand2, ChevronDown, Info, Lock } from "lucide-react";
import { ReviewsDialog } from "./ReviewsDialog";
import { RequesterDetailsPopup } from "./RequesterDetailsPopup";
import { ReviseBountyAmountDialog } from "./ReviseBountyAmountDialog";
import { UserFeedbackModal } from "./UserFeedbackModal";
import { MakeIntroductionDialog } from "./MakeIntroductionDialog";
import { DeclineIntroductionDialog } from "./DeclineIntroductionDialog";
import { EmailTrackingModal } from "./EmailTrackingModal";
import { InboxRequest } from "./inboxUtils";
import { AnyType } from "@/types/common";

interface InboxDialogsProps {
  // Introduction Dialog
  isIntroDialogOpen: boolean;
  setIsIntroDialogOpen: (open: boolean) => void;
  selectedRequest: InboxRequest | null;
  introSubject: string;
  setIntroSubject: (subject: string) => void;
  introMessage: string;
  setIntroMessage: (message: string) => void;
  recommendedTemplate: AnyType;
  isLoadingRecommendation: boolean;
  isAiAssisting: boolean;
  handleAiAssist: (type: string) => void;
  handleSendIntroduction: () => void;
  prospectlyFooter: string;
  // Reviews
  selectedRequesterForReview: AnyType;
  reviewsDialogOpen: boolean;
  setReviewsDialogOpen: (open: boolean) => void;
  // Requester Details
  isRequesterPopupOpen: boolean;
  setIsRequesterPopupOpen: (open: boolean) => void;
  selectedRequesterDetails: {
    requester: AnyType;
    photoUrl: string | null;
  };
  // Bounty Revision
  isBountyRevisionOpen: boolean;
  setIsBountyRevisionOpen: (open: boolean) => void;
  selectedRequestForBountyRevision: InboxRequest | null;
  setSelectedRequestForBountyRevision: (request: InboxRequest | null) => void;
  handleBountyUpdateSuccess: () => void;
  // Feedback
  feedbackModalOpen: boolean;
  setFeedbackModalOpen: (open: boolean) => void;
  selectedFeedback: {
    feedback: AnyType;
    requesterName: string;
  };
  // Make Intro
  isMakeIntroDialogOpen: boolean;
  setIsMakeIntroDialogOpen: (open: boolean) => void;
  setSelectedRequest: (request: InboxRequest | null) => void;
  fetchRequests: () => Promise<void>;
  setRealRequests: (updater: (prev: InboxRequest[]) => InboxRequest[]) => void;
  queryClient: AnyType;
  // Decline
  isDeclineDialogOpen: boolean;
  setIsDeclineDialogOpen: (open: boolean) => void;
  handleDecline: (reason: string, message?: string) => Promise<void>;
  requestToDecline: InboxRequest | null;
  // Email Tracking
  emailTrackingModalOpen: boolean;
  setEmailTrackingModalOpen: (open: boolean) => void;
  selectedRequestForEmail: string | null;
  setSelectedRequestForEmail: (id: string | null) => void;
}

export function InboxDialogs({
  isIntroDialogOpen,
  setIsIntroDialogOpen,
  selectedRequest,
  introSubject,
  setIntroSubject,
  introMessage,
  setIntroMessage,
  recommendedTemplate,
  isLoadingRecommendation,
  isAiAssisting,
  handleAiAssist,
  handleSendIntroduction,
  prospectlyFooter,
  selectedRequesterForReview,
  reviewsDialogOpen,
  setReviewsDialogOpen,
  isRequesterPopupOpen,
  setIsRequesterPopupOpen,
  selectedRequesterDetails,
  isBountyRevisionOpen,
  setIsBountyRevisionOpen,
  selectedRequestForBountyRevision,
  setSelectedRequestForBountyRevision,
  handleBountyUpdateSuccess,
  feedbackModalOpen,
  setFeedbackModalOpen,
  selectedFeedback,
  isMakeIntroDialogOpen,
  setIsMakeIntroDialogOpen,
  setSelectedRequest,
  fetchRequests,
  setRealRequests,
  queryClient,
  isDeclineDialogOpen,
  setIsDeclineDialogOpen,
  handleDecline,
  requestToDecline,
  emailTrackingModalOpen,
  setEmailTrackingModalOpen,
  selectedRequestForEmail,
  setSelectedRequestForEmail,
}: InboxDialogsProps) {
  return (
    <>
      {/* Reviews Dialog */}
      {selectedRequesterForReview && (
        <ReviewsDialog
          open={reviewsDialogOpen}
          onOpenChange={setReviewsDialogOpen}
          connectorName={selectedRequesterForReview.name || "Requester"}
          trustScore={
            selectedRequesterForReview.trustScore ||
            selectedRequesterForReview.current_trust_score ||
            0
          }
          userId={selectedRequesterForReview.id}
        />
      )}

      {/* Requester Details Popup */}
      <RequesterDetailsPopup
        isOpen={isRequesterPopupOpen}
        onClose={() => setIsRequesterPopupOpen(false)}
        requester={selectedRequesterDetails.requester}
        photoUrl={selectedRequesterDetails.photoUrl}
      />

      {/* Introduction Dialog */}
      <Dialog open={isIntroDialogOpen} onOpenChange={setIsIntroDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[800px] lg:max-w-[900px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5" />
              Send Introduction Email
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Customize the introduction email below before sending to{" "}
              {selectedRequest?.contact?.name ||
                selectedRequest?.contact?.first_name ||
                "Prospect"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                Subject Line
              </Label>
              <Input
                id="subject"
                value={introSubject}
                onChange={(e) => setIntroSubject(e.target.value)}
                placeholder="Enter email subject"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              {/* Template Recommendation Indicator */}
              {recommendedTemplate && (
                <div className="mb-4 p-3 bg-brand-sky/5 rounded-md border border-brand-sky/20">
                  <div className="flex items-start gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-5 w-5 text-brand-sky cursor-help mt-0.5" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-sm">
                          <div className="space-y-2">
                            <p className="font-semibold">
                              AI-Optimized Template
                            </p>
                            <div className="text-sm space-y-1">
                              <p>
                                • Effectiveness Score:{" "}
                                {recommendedTemplate.effectivenessScore}/100
                              </p>
                              <p>
                                • Response Rate:{" "}
                                {
                                  recommendedTemplate.performanceStats
                                    .responseRate
                                }
                                %
                              </p>
                              <p>
                                • Meeting Completion:{" "}
                                {
                                  recommendedTemplate.performanceStats
                                    .meetingCompletionRate
                                }
                                %
                              </p>
                              <p>
                                • Avg Quality Rating:{" "}
                                {
                                  recommendedTemplate.performanceStats
                                    .avgQualityRating
                                }
                                /5
                              </p>
                              <p className="text-muted-foreground mt-2">
                                Based on {recommendedTemplate.sampleSize}{" "}
                                similar introductions
                              </p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-brand-sky">
                        🎯 AI-Optimized Template
                      </p>
                      <p className="text-xs text-brand-sky/80 mt-1">
                        This template has a{" "}
                        {recommendedTemplate.effectivenessScore}% effectiveness
                        score based on {recommendedTemplate.contextMatch}. You
                        can customize it while keeping the elements that work
                        best.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isLoadingRecommendation && (
                <div className="mb-4 p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    🔍 Finding best-performing template for this context...
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="message" className="text-sm font-medium">
                  Email Message
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 px-3 text-xs bg-primary/90 shadow-md border border-primary/20"
                      disabled={isAiAssisting}
                    >
                      <Wand2 className="h-3 w-3 mr-1" />
                      {isAiAssisting ? "AI Working..." : "✨ AI Assist"}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={() => handleAiAssist("rewrite_draft")}
                    >
                      Rewrite Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAiAssist("generate_new")}
                    >
                      Generate New
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAiAssist("make_shorter")}
                    >
                      Make Shorter
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAiAssist("make_friendlier")}
                    >
                      Make Friendlier
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Textarea
                id="message"
                value={introMessage}
                onChange={(e) => setIntroMessage(e.target.value)}
                placeholder="Customize your introduction message..."
                className="min-h-[200px] w-full resize-y"
              />
              {/* Mandatory footer - shown but not editable */}
              <div className="mt-2 p-3 bg-muted/50 rounded-md border border-muted">
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Automatic footer (included in all emails):
                </p>
                <p className="text-sm text-foreground/80 italic">
                  {prospectlyFooter.trim()}
                </p>
              </div>
            </div>

            <div className="bg-secondary/50 p-4 rounded-lg border">
              <h4 className="font-semibold text-sm mb-3">
                Introduction Summary
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-primary">Requester:</p>
                  <p className="font-medium">
                    {selectedRequest?.requester?.name ||
                      selectedRequest?.requester?.first_name}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedRequest?.requester?.company}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-primary">Target:</p>
                  <p className="font-medium">
                    {selectedRequest?.contact?.name ||
                      selectedRequest?.contact?.first_name}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedRequest?.contact?.company}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="font-medium text-primary text-sm">Purpose:</p>
                <p className="text-sm mt-1">
                  {selectedRequest?.meeting_description ||
                    selectedRequest?.meetingTitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button
              variant="outline"
              onClick={() => setIsIntroDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSendIntroduction} className="min-w-[140px]">
              <Send className="h-4 w-4 mr-2" />
              Send Introduction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bounty Revision Dialog */}
      <ReviseBountyAmountDialog
        open={isBountyRevisionOpen}
        onOpenChange={(open) => {
          setIsBountyRevisionOpen(open);
          if (!open) {
            setSelectedRequestForBountyRevision(null);
          }
        }}
        connectorBountyAmount={
          selectedRequestForBountyRevision?.connectorBountyAmount
        }
        requesterBountyAmount={
          selectedRequestForBountyRevision?.requesterBountyAmount
        }
        contactId={selectedRequestForBountyRevision?.contact?.id}
        onSuccess={handleBountyUpdateSuccess}
      />

      {/* User Feedback Modal */}
      <UserFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        feedback={selectedFeedback.feedback}
        requesterName={selectedFeedback.requesterName}
      />

      {/* Make Introduction Dialog */}
      <MakeIntroductionDialog
        isOpen={isMakeIntroDialogOpen}
        onClose={() => {
          setIsMakeIntroDialogOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onSuccess={() => {
          fetchRequests();
        }}
        onAccepted={(requestId) => {
          setRealRequests((prevRequests) =>
            prevRequests.map((req) =>
              req.id === requestId ? { ...req, status: "accepted" } : req
            )
          );
        }}
        onEmailSent={(requestId) => {
          setRealRequests((prevRequests) =>
            prevRequests.filter((req) => req.id !== requestId)
          );

          queryClient.invalidateQueries({
            queryKey: ["/api/introduction-requests/connector/pipeline"],
          });
          queryClient.invalidateQueries({
            queryKey: [
              "/api/introduction-requests/introduction-pipeline/archive",
            ],
          });
          queryClient.invalidateQueries({
            queryKey: [
              "/api/introduction-requests/introduction-pipeline/stats",
            ],
          });
        }}
      />

      {/* Decline Introduction Dialog */}
      <DeclineIntroductionDialog
        open={isDeclineDialogOpen}
        onOpenChange={setIsDeclineDialogOpen}
        onConfirm={handleDecline}
        requesterName={
          requestToDecline?.requester?.name ||
          requestToDecline?.requester?.first_name ||
          "the requester"
        }
        contactName={
          requestToDecline?.contact?.name ||
          requestToDecline?.contact?.first_name ||
          "your contact"
        }
      />

      {/* Email Tracking Modal */}
      <EmailTrackingModal
        isOpen={emailTrackingModalOpen}
        onClose={() => {
          setEmailTrackingModalOpen(false);
          setSelectedRequestForEmail(null);
        }}
        introductionRequestId={selectedRequestForEmail || ""}
      />
    </>
  );
}
