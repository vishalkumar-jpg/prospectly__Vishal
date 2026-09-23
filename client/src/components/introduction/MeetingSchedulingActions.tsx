import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle, Clock } from "lucide-react";
import { MeetingSchedulingDialog } from "./MeetingSchedulingDialog";
import { MeetingOutcomeDialog } from "./MeetingOutcomeDialog";
import { LeaveFeedbackModal } from "./LeaveFeedbackModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AnyType } from "@/types/common";

interface MeetingSchedulingActionsProps {
  stage: string;
  requesterName: string;
  targetName: string;
  meetingDate?: string;
  introductionRequestId: string;
  isRequester: boolean; // Add isRequester prop to avoid redundant API call
  onUpdateStage: (newStage: string, meetingDetails?: AnyType) => void;
  onPipelineRefresh?: () => void;
  renderAcknowledgeButton?: boolean; // If false, only renders dialog, not button
  acknowledgeDialogOpen?: boolean; // External control of dialog state
  onAcknowledgeDialogOpenChange?: (open: boolean) => void; // External control of dialog state
  renderFeedbackButton?: boolean; // If false, hides the feedback button (for when it's shown in header)
}

export function MeetingSchedulingActions({
  stage,
  requesterName,
  targetName,
  meetingDate,
  introductionRequestId,
  isRequester, // Receive isRequester as prop instead of fetching it
  onUpdateStage,
  onPipelineRefresh,
  renderAcknowledgeButton = true, // Default to true for backward compatibility
  acknowledgeDialogOpen: externalAcknowledgeDialogOpen,
  onAcknowledgeDialogOpenChange,
  renderFeedbackButton = true, // Default to true for backward compatibility
}: MeetingSchedulingActionsProps) {
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [isOutcomeOpen, setIsOutcomeOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [internalConfirmationOpen, setInternalConfirmationOpen] =
    useState(false);

  // Use external state if provided, otherwise use internal state
  const isConfirmationOpen =
    externalAcknowledgeDialogOpen !== undefined
      ? externalAcknowledgeDialogOpen
      : internalConfirmationOpen;

  const setIsConfirmationOpen = (open: boolean) => {
    if (onAcknowledgeDialogOpenChange) {
      onAcknowledgeDialogOpenChange(open);
    } else {
      setInternalConfirmationOpen(open);
    }
  };
  const [isProcessingCompletion, setIsProcessingCompletion] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<AnyType>(null);
  const [feedbackToUserId, setFeedbackToUserId] = useState<string>("");
  const [feedbackToUserName, setFeedbackToUserName] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const allowCloseRef = useRef(false);

  const handleScheduleMeeting = (meetingDetails: AnyType) => {
    onUpdateStage("meeting_confirmed", meetingDetails);
    toast({
      title: "Meeting Scheduled!",
      description: `Meeting between ${requesterName} and ${targetName} has been confirmed`,
    });
  };

  const handleMeetingOutcome = (outcome: AnyType) => {
    if (outcome.outcome === "completed") {
      onUpdateStage("completed", outcome);
    } else {
      onUpdateStage("scheduling", outcome);
    }
    toast({
      title: "Meeting Outcome Recorded",
      description: `Meeting outcome has been updated`,
    });
  };

  const handleFeedbackSubmitted = () => {
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback!",
    });

    // Close the modal after a short delay to ensure smooth UI transition
    setTimeout(() => {
      setIsFeedbackOpen(false);
      // Trigger pipeline refresh from parent after modal closes
      onPipelineRefresh?.();
    }, 300);
  };

  const handleConfirmMeetingCompletion = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsProcessingCompletion(true);

    try {
      // Call Express API to acknowledge meeting completion
      const response = await api.introductions.acknowledgeCompletion(
        introductionRequestId
      );

      allowCloseRef.current = true;
      setIsConfirmationOpen(false);
      onUpdateStage("peer_feedback");

      toast({
        title: "Meeting Confirmed",
        description:
          response.message ||
          "Meeting completed successfully! Both parties can now leave peer feedback.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to confirm meeting completion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCompletion(false);
    }
  };

  // Note: isRequester is now passed as a prop from pipeline endpoint to avoid redundant API call

  const fetchExistingFeedback = useCallback(async () => {
    if (!user?.id) return;

    // Determine feedback type based on stage
    const feedbackType =
      stage === "peer_feedback" ? "peer_feedback" : "meeting_feedback";

    try {
      const data = await api.introductions.getExistingFeedback(
        introductionRequestId,
        feedbackType
      );
      setExistingFeedback(data);
    } catch (error: unknown) {
      // 404 is expected when no feedback exists yet
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 404
      ) {
        // Expected 404, no need to log
      } else {
        // Non-404 error - silently ignored
      }
      setExistingFeedback(null);
    }
  }, [user?.id, stage, introductionRequestId]);

  const fetchIntroductionDetails = useCallback(async () => {
    if (!user?.id) return;

    try {
      // For now, we'll use simple logic based on naming
      // In a production app, you'd fetch this from the backend
      // The feedback recipient is determined by the backend based on requester/connector role
      setFeedbackToUserId(""); // Backend will determine this
      setFeedbackToUserName(targetName || requesterName);
    } catch {
      // Silently ignored
    }
  }, [user?.id, targetName, requesterName]);

  // Fetch existing feedback when component mounts or stage changes
  // Skip fetching for peer_feedback stage as data is already in pipeline response
  useEffect(() => {
    if (stage === "meeting_completed" && user?.id && introductionRequestId) {
      fetchExistingFeedback();
      fetchIntroductionDetails();
    }
  }, [
    stage,
    user?.id,
    introductionRequestId,
    fetchExistingFeedback,
    fetchIntroductionDetails,
  ]);

  if (stage === "scheduling") {
    return (
      <>
        <Button
          size="sm"
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={(e) => {
            e.stopPropagation();
            setIsSchedulingOpen(true);
          }}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>

        <MeetingSchedulingDialog
          isOpen={isSchedulingOpen}
          onClose={() => setIsSchedulingOpen(false)}
          requesterName={requesterName}
          targetName={targetName}
          onSchedule={handleScheduleMeeting}
        />
      </>
    );
  }

  if (stage === "meeting_confirmed") {
    return (
      <>
        <Button
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={(e) => {
            e.stopPropagation();
            setIsSchedulingOpen(true);
          }}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Confirm Meeting
        </Button>

        <MeetingSchedulingDialog
          isOpen={isSchedulingOpen}
          onClose={() => setIsSchedulingOpen(false)}
          requesterName={requesterName}
          targetName={targetName}
          onSchedule={handleScheduleMeeting}
        />
      </>
    );
  }

  if (stage === "meeting_completed") {
    // Only Requester can leave feedback
    if (!isRequester) {
      return (
        <div className="w-full p-3 rounded-lg border-2 border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/5 text-center">
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
            Waiting for requester to confirm meeting completion
          </p>
        </div>
      );
    }

    return (
      <>
        {renderAcknowledgeButton && (
          <Button
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={(e) => {
              e.stopPropagation();
              setIsConfirmationOpen(true);
            }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Acknowledge Meeting
          </Button>
        )}

        <AlertDialog
          open={isConfirmationOpen}
          onOpenChange={(open) => {
            if (!open || allowCloseRef.current) {
              allowCloseRef.current = false;
              setIsConfirmationOpen(open);
            }
          }}
        >
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Acknowledge Meeting Completion
              </AlertDialogTitle>
              <AlertDialogDescription>
                Please acknowledge that your meeting with the Prospect has been
                successfully completed. This will move the introduction to the
                peer feedback stage.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={(e) => {
                  e.stopPropagation();
                  allowCloseRef.current = true;
                  setIsConfirmationOpen(false);
                }}
                disabled={isProcessingCompletion}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmMeetingCompletion}
                disabled={isProcessingCompletion}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessingCompletion
                  ? "Processing..."
                  : "Acknowledge Completion"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  if (stage === "peer_feedback") {
    return (
      <>
        {renderFeedbackButton && (
          <Button
            size="sm"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFeedbackOpen(true);
            }}
            className="w-full"
          >
            {existingFeedback ? "Edit Peer Feedback" : "Leave Peer Feedback"}
          </Button>
        )}

        <LeaveFeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          introductionRequestId={introductionRequestId}
          feedbackToUserId={feedbackToUserId || ""}
          feedbackToUserName={feedbackToUserName || ""}
          feedbackType="peer"
          existingFeedback={existingFeedback}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      </>
    );
  }

  if (stage === "completed") {
    return (
      <>
        <Button
          size="sm"
          className="w-full bg-orange-600 hover:bg-orange-700"
          onClick={(e) => {
            e.stopPropagation();
            setIsOutcomeOpen(true);
          }}
        >
          <Clock className="h-4 w-4 mr-2" />
          Meeting Outcome
        </Button>

        <MeetingOutcomeDialog
          isOpen={isOutcomeOpen}
          onClose={() => setIsOutcomeOpen(false)}
          requesterName={requesterName}
          targetName={targetName}
          meetingDate={meetingDate || "TBD"}
          onUpdateOutcome={handleMeetingOutcome}
        />
      </>
    );
  }

  return null;
}
