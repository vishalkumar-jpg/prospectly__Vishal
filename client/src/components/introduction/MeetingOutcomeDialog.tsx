import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { CheckCircle, Star, Calendar, Users } from "lucide-react";

import { AnyType } from "@/types/common";
import { toUTC } from "@/lib/dayjs";

// Note: /api/introductions/:id/template-variant endpoint has been removed from the backend.
// Template effectiveness tracking is no longer available.
// This is an explicit no-op stub kept to avoid breaking existing call sites.
function updateTemplateEffectiveness(
  _introductionRequestId: string,
  _outcome: string,
  _rating: number
): void {
  return;
}

interface MeetingOutcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requesterName: string;
  targetName: string;
  meetingDate: string;
  onUpdateOutcome: (outcome: AnyType) => void;
  introductionRequestId?: string;
}

export function MeetingOutcomeDialog({
  isOpen,
  onClose,
  requesterName,
  targetName,
  meetingDate,
  onUpdateOutcome,
  introductionRequestId,
}: MeetingOutcomeDialogProps) {
  const [outcome, setOutcome] = useState<
    "completed" | "rescheduled" | "cancelled" | "no-show"
  >("completed");
  const [rating, setRating] = useState("5");
  const [notes, setNotes] = useState("");
  const [followUpActions, setFollowUpActions] = useState("");
  const { toast } = useToast();

  const handleSubmit = async () => {
    const outcomeData = {
      outcome,
      rating: parseInt(rating),
      notes,
      followUpActions: followUpActions
        .split("\n")
        .filter((action) => action.trim()),
      updatedAt: toUTC().toISOString(),
    };

    // Update template effectiveness if we have the introduction request ID
    if (introductionRequestId) {
      updateTemplateEffectiveness(
        introductionRequestId,
        outcome,
        parseInt(rating)
      );
    }

    onUpdateOutcome(outcomeData);

    toast({
      title: "Meeting Outcome Recorded!",
      description: `Meeting outcome has been updated for ${requesterName} and ${targetName}`,
    });

    onClose();
  };

  const outcomeColors = {
    completed:
      "bg-green-100 text-green-800 hover:bg-green-800 hover:text-green-100 border-green-200",
    rescheduled:
      "bg-yellow-100 text-yellow-800 hover:bg-yellow-800 hover:text-yellow-100 border-yellow-200",
    cancelled:
      "bg-red-100 text-red-800 hover:bg-red-800 hover:text-red-100 border-red-200",
    "no-show":
      "bg-gray-100 text-gray-800 hover:bg-gray-800 hover:text-gray-100 border-gray-200",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Meeting Outcome
          </DialogTitle>
          <DialogDescription>
            Record the outcome of the meeting between {requesterName} and{" "}
            {targetName} on {meetingDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meeting Info */}
          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-blue-50 border-blue-200"
              >
                <Users className="h-3 w-3 mr-1" />
                {requesterName} ↔ {targetName}
              </Badge>
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 hover:bg-purple-700 hover:text-purple-50 border-purple-200"
              >
                <Calendar className="h-3 w-3 mr-1" />
                {meetingDate}
              </Badge>
            </div>
          </div>

          {/* Outcome Selection */}
          <div className="space-y-2">
            <Label>Meeting Outcome</Label>
            <Select
              value={outcome}
              onValueChange={(value: AnyType) => setOutcome(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">
                  ✅ Meeting Completed Successfully
                </SelectItem>
                <SelectItem value="rescheduled">
                  📅 Meeting Rescheduled
                </SelectItem>
                <SelectItem value="cancelled">❌ Meeting Cancelled</SelectItem>
                <SelectItem value="no-show">👻 No Show</SelectItem>
              </SelectContent>
            </Select>
            <Badge className={outcomeColors[outcome]} variant="outline">
              Status:{" "}
              {outcome.charAt(0).toUpperCase() +
                outcome.slice(1).replace("-", " ")}
            </Badge>
          </div>

          {/* Rating (only for completed meetings) */}
          {outcome === "completed" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Meeting Quality Rating
              </Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">
                    ⭐⭐⭐⭐⭐ Excellent - Great connection, clear next steps
                  </SelectItem>
                  <SelectItem value="4">
                    ⭐⭐⭐⭐ Good - Positive interaction, some progress
                  </SelectItem>
                  <SelectItem value="3">
                    ⭐⭐⭐ Average - Neutral meeting, limited progress
                  </SelectItem>
                  <SelectItem value="2">
                    ⭐⭐ Poor - Some issues, minimal value
                  </SelectItem>
                  <SelectItem value="1">
                    ⭐ Very Poor - Significant problems, no value
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Meeting Notes</Label>
            <Textarea
              id="notes"
              placeholder="Key discussion points, outcomes, or AnyType important details from the meeting..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Follow-up Actions */}
          {outcome === "completed" && (
            <div className="space-y-2">
              <Label htmlFor="follow-up">Follow-up Actions (Optional)</Label>
              <Textarea
                id="follow-up"
                placeholder="List follow-up actions, one per line:&#10;• Send proposal&#10;• Schedule follow-up meeting&#10;• Introduce to team members"
                value={followUpActions}
                onChange={(e) => setFollowUpActions(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Record Outcome
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
