import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

interface LeaveFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  introductionRequestId: string;
  feedbackToUserId: string;
  feedbackToUserName: string;
  feedbackType: "meeting" | "peer";
  existingFeedback?: {
    id: string;
    rating: number;
    feedback_text: string;
    meeting_completed: boolean;
  } | null;
  onFeedbackSubmitted: () => void;
}

function getFeedbackSubmitValidationError({
  userId,
  rating,
}: {
  userId?: number;
  rating: number;
}): string | null {
  if (!userId) return "You must be logged in to submit feedback.";
  if (rating === 0) return "Please select a star rating before submitting.";
  return null;
}

function showFeedbackSubmitSuccessToast({
  response,
  existingFeedback,
  toast,
}: {
  response: {
    payoutTriggered?: boolean;
    requesterFeedbackCompleted?: boolean;
    connectorFeedbackCompleted?: boolean;
  };
  existingFeedback?: LeaveFeedbackModalProps["existingFeedback"];
  toast: ReturnType<typeof useToast>["toast"];
}): void {
  if (response.payoutTriggered) {
    toast({
      title: "🎉 Payment Processed!",
      description:
        "Your feedback has been submitted and the final referral payout payment has been processed to your Stripe account!",
    });
    return;
  }
  if (existingFeedback) {
    toast({
      title: "Feedback Updated!",
      description: "Your feedback has been updated successfully.",
    });
    return;
  }
  if (
    response.requesterFeedbackCompleted ||
    response.connectorFeedbackCompleted
  ) {
    toast({
      title: "Feedback Saved!",
      description: "Your feedback helps improve the platform.",
    });
    return;
  }
  toast({
    title: "Feedback Saved!",
    description: "Feedback submitted successfully.",
  });
}

function applyPeerFeedbackOptimisticUpdates({
  feedbackType,
  queryClient,
  introductionRequestId,
}: {
  feedbackType: "meeting" | "peer";
  queryClient: QueryClient;
  introductionRequestId: string;
}): void {
  if (feedbackType !== "peer") {
    return;
  }
  queryClient.setQueryData(
    ["/api/requester/introduction-requests/pipeline"],
    (oldData: Array<{ id: string }> | undefined) => {
      if (!oldData) return oldData;
      return oldData.filter(
        (intro: { id: string }) => intro.id !== introductionRequestId
      );
    }
  );
  queryClient.setQueryData(
    ["/api/introduction-requests/connector/pipeline"],
    (oldData: Array<{ id: string }> | undefined) => {
      if (!oldData) return oldData;
      return oldData.filter(
        (intro: { id: string }) => intro.id !== introductionRequestId
      );
    }
  );
  queryClient.invalidateQueries({
    queryKey: ["/api/requester/introduction-requests/archive"],
  });
  queryClient.invalidateQueries({
    queryKey: ["/api/introduction-requests/introduction-pipeline/archive"],
  });
}

function rollbackPeerFeedbackOptimisticUpdates({
  queryClient,
  previousRequesterPipelineData,
  previousConnectorPipelineData,
}: {
  queryClient: QueryClient;
  previousRequesterPipelineData?: Array<{ id: string }>;
  previousConnectorPipelineData?: Array<{ id: string }>;
}): void {
  if (previousRequesterPipelineData) {
    queryClient.setQueryData(
      ["/api/requester/introduction-requests/pipeline"],
      previousRequesterPipelineData
    );
  }
  if (previousConnectorPipelineData) {
    queryClient.setQueryData(
      ["/api/introduction-requests/connector/pipeline"],
      previousConnectorPipelineData
    );
  }
}

export function LeaveFeedbackModal({
  isOpen,
  onClose,
  introductionRequestId,
  feedbackToUserName,
  feedbackType,
  existingFeedback,
  onFeedbackSubmitted,
}: LeaveFeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [meetingCompleted, setMeetingCompleted] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load existing feedback when modal opens
  useEffect(() => {
    if (existingFeedback) {
      setRating(Number(existingFeedback.rating) || 0);
      setFeedbackText(existingFeedback.feedback_text || "");
      setMeetingCompleted(existingFeedback.meeting_completed);
    } else {
      // Reset to defaults when no existing feedback
      setRating(0);
      setFeedbackText("");
      setMeetingCompleted(true);
    }
  }, [existingFeedback, isOpen]);

  const handleSubmit = async () => {
    const validationError = getFeedbackSubmitValidationError({
      userId: user?.id,
      rating,
    });
    if (validationError) {
      toast({
        title: rating === 0 ? "Rating Required" : "Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Store previous cache state for rollback on error (senior-level error handling)
    const previousRequesterPipelineData = queryClient.getQueryData<
      Array<{ id: string }>
    >(["/api/requester/introduction-requests/pipeline"]);
    const previousConnectorPipelineData = queryClient.getQueryData<
      Array<{ id: string }>
    >(["/api/introduction-requests/connector/pipeline"]);

    try {
      // Submit feedback using Express API
      const response = await api.introductions.submitFeedback(
        introductionRequestId,
        {
          rating,
          feedbackText,
          meetingCompleted:
            feedbackType === "meeting" ? meetingCompleted : false,
          feedbackType:
            feedbackType === "meeting" ? "meeting_feedback" : "peer_feedback",
          existingFeedbackId: existingFeedback?.id,
        }
      );

      showFeedbackSubmitSuccessToast({ response, existingFeedback, toast });
      applyPeerFeedbackOptimisticUpdates({
        feedbackType,
        queryClient,
        introductionRequestId,
      });

      onFeedbackSubmitted();
      onClose();
    } catch (error: unknown) {
      rollbackPeerFeedbackOptimisticUpdates({
        queryClient,
        previousRequesterPipelineData:
          previousRequesterPipelineData || undefined,
        previousConnectorPipelineData:
          previousConnectorPipelineData || undefined,
      });

      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md"
        onClick={(e) => e.stopPropagation()}
        mobileFullscreen
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {existingFeedback
              ? feedbackType === "peer"
                ? "Edit Peer Feedback"
                : "Edit Feedback"
              : feedbackType === "peer"
                ? "Leave Peer Feedback"
                : "Leave Feedback"}
          </DialogTitle>
          <DialogDescription>
            {feedbackType === "peer"
              ? `Rate your overall experience working with ${feedbackToUserName}`
              : `Share your experience with ${feedbackToUserName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating - Half Star Support for Peer Feedback */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Rating *</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <div key={star} className="relative inline-flex">
                  {feedbackType === "peer" ? (
                    <div className="relative inline-flex group transition-transform hover:scale-110">
                      {/* Background star outline (always showing full border) */}
                      <Star className="h-8 w-8 text-muted-foreground pointer-events-none" />

                      <div className="absolute inset-0 flex">
                        {/* Left half button (0.5) */}
                        <button
                          type="button"
                          onClick={() => setRating(star - 0.5)}
                          onMouseEnter={() => setHoveredRating(star - 0.5)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="w-4 h-8 focus-visible:ring-2 focus-visible:ring-yellow-400/75 rounded-l-sm outline-none"
                          aria-label={`${star - 0.5} stars`}
                          aria-pressed={(hoveredRating || rating) >= star - 0.5}
                        >
                          {(hoveredRating || rating) >= star - 0.5 && (
                            <Star
                              className="h-8 w-8 absolute left-0 top-0 pointer-events-none fill-yellow-400 text-yellow-400"
                              style={{
                                clipPath:
                                  "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
                              }}
                            />
                          )}
                        </button>
                        {/* Right half button (1.0) */}
                        <button
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="w-4 h-8 focus-visible:ring-2 focus-visible:ring-yellow-400/75 rounded-r-sm outline-none"
                          aria-label={`${star} stars`}
                          aria-pressed={(hoveredRating || rating) >= star}
                        >
                          {(hoveredRating || rating) >= star && (
                            <Star
                              className="h-8 w-8 absolute right-0 top-0 pointer-events-none fill-yellow-400 text-yellow-400"
                              style={{
                                clipPath:
                                  "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)",
                              }}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= (hoveredRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  )}
                </div>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  {feedbackType === "peer"
                    ? Number(rating).toFixed(1)
                    : Number(rating)}{" "}
                  out of 5
                </span>
              )}
            </div>
          </div>

          {/* Feedback Text */}
          <div className="space-y-2">
            <Label htmlFor="feedback-text" className="text-sm font-semibold">
              Feedback Comments
            </Label>
            <Textarea
              id="feedback-text"
              placeholder="Share your thoughts about the introduction, meeting quality, or overall experience..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Help others understand your experience
            </p>
          </div>

          {/* Meeting Completed Checkbox - Only show for meeting feedback */}
          {feedbackType === "meeting" && (
            <div className="flex items-start space-x-3 rounded-lg border p-4 bg-muted/30">
              <Checkbox
                id="meeting-completed"
                checked={meetingCompleted}
                onCheckedChange={(checked) =>
                  setMeetingCompleted(checked as boolean)
                }
              />
              <div className="space-y-1 leading-none">
                <Label
                  htmlFor="meeting-completed"
                  className="text-sm font-medium cursor-pointer"
                >
                  Meeting was successfully completed
                </Label>
                <p className="text-xs text-muted-foreground">
                  Confirm that the meeting took place as scheduled
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="flex-1"
          >
            {isSubmitting
              ? "Submitting..."
              : existingFeedback
                ? "Update Feedback"
                : "Submit Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
