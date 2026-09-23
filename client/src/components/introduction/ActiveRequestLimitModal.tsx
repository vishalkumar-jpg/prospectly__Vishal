import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Star, X } from "lucide-react";

interface ActiveRequestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  limit: number;
}

export function ActiveRequestLimitModal({
  isOpen,
  onClose,
  currentCount,
  limit,
}: ActiveRequestLimitModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" mobileFullscreen>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Active Introduction Requests Limit Reached
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Warning Alert */}
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-900 dark:text-red-100 space-y-3">
              <p className="font-semibold text-base">
                You've reached your active introduction requests limit
              </p>
              <p className="text-sm">
                You have reached the limit of <strong>{limit}</strong> active
                introduction requests. Please upgrade your subscription plan to
                get more active introduction requests.
              </p>
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
                navigate("/profile/subscriptions");
                onClose();
              }}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Star className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
