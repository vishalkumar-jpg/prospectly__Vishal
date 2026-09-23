import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";

interface ContactInfo {
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  profile_photo_url?: string | null;
}

interface PendingFeedbackWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingFeedbackCount: number;
  contact?: ContactInfo | null;
}

export function PendingFeedbackWarningModal({
  isOpen,
  onClose,
  pendingFeedbackCount,
  contact,
}: PendingFeedbackWarningModalProps) {
  const navigate = useNavigate();

  const fullName =
    `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim() ||
    "this contact";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" mobileFullscreen>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Complete Pending Feedback First
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Warning Alert */}
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <AlertDescription className="text-red-900 dark:text-red-100 space-y-3">
              <p className="text-sm">
                You have <strong>{pendingFeedbackCount}</strong> introduction
                request{pendingFeedbackCount > 1 ? "s" : ""} waiting for your
                feedback. Complete peer feedback to unlock the ability to make
                new introduction requests.
              </p>

              <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2">
                  Why is this required?
                </p>
                <ul className="text-xs space-y-1 text-red-800 dark:text-red-200">
                  <li>✓ Feedback helps maintain platform quality</li>
                  <li>✓ Ensures fair treatment for all members</li>
                  <li>✓ Required for continued platform access</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button
              onClick={() => {
                navigate("/prospecting/my-prospects/open-request");
                onClose();
              }}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Complete Feedback Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
