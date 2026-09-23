import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Quote } from "lucide-react";
import { StarRating } from "@/components/shared/StarRating";

interface UserFeedback {
  comment: string;
  reviewer: string;
  rating: number;
}

interface UserFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: UserFeedback[];
  requesterName: string;
}

export function UserFeedbackModal({
  isOpen,
  onClose,
  feedback,
  requesterName,
}: UserFeedbackModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" mobileFullscreen>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Recent Feedback for {requesterName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {feedback.map((item, index) => (
            <div key={index} className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-2">
                <StarRating
                  rating={item.rating}
                  size="md"
                  colorScheme="yellow"
                />
                <Badge variant="outline" className="text-xs">
                  {item.rating}/5
                </Badge>
              </div>

              <div className="relative">
                <Quote className="h-4 w-4 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                  "{item.comment}"
                </p>
              </div>

              <div className="mt-3 text-right">
                <span className="text-xs font-medium text-muted-foreground">
                  — {item.reviewer}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
