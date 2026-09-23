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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Gift,
  DollarSign,
  Calendar,
  Building2,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  PartyPopper,
  Timer,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateApplication } from "./ApplicationStatusCard";

interface CandidateOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: CandidateApplication | null;
  onAccept: () => void;
  onDecline: (reason?: string) => void;
}

export function CandidateOfferDialog({
  open,
  onOpenChange,
  application,
  onAccept,
  onDecline,
}: CandidateOfferDialogProps) {
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!application || !application.offerDetails) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate days until offer expires
  const getDaysUntilExpiry = () => {
    const expiryDate = new Date(application.offerDetails!.expiresAt);
    const now = new Date();
    return Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const daysUntilExpiry = getDaysUntilExpiry();

  const handleAccept = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsProcessing(false);
    onAccept();
  };

  const handleDecline = async () => {
    if (showDeclineReason) {
      setIsProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsProcessing(false);
      onDecline(declineReason);
      setShowDeclineReason(false);
      setDeclineReason("");
    } else {
      setShowDeclineReason(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-emerald-600" />
            Job Offer
          </DialogTitle>
          <DialogDescription>
            Congratulations! Review your offer details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Expiry Warning */}
          {daysUntilExpiry <= 7 && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg p-3",
                daysUntilExpiry <= 3
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-amber-50 border border-amber-200 text-amber-700"
              )}
            >
              <Timer className="h-5 w-5" />
              <span className="font-medium">
                {daysUntilExpiry > 0
                  ? `This offer expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`
                  : "This offer has expired"}
              </span>
            </div>
          )}

          {/* Job Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-lg bg-teal-100 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  {application.jobTitle}
                </h3>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {application.companyName}
                </p>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {application.location}
                </p>
              </div>
            </div>
          </div>

          {/* Offer Details */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-emerald-800 flex items-center gap-2">
              <PartyPopper className="h-5 w-5" />
              Offer Details
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Annual Salary</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">
                  ${application.offerDetails.salary.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-lg p-3 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Start Date</span>
                </div>
                <p className="text-lg font-semibold text-emerald-700">
                  {formatDate(application.offerDetails.startDate)}
                </p>
              </div>
            </div>

            <div className="text-sm text-emerald-600">
              <p className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Offer valid until{" "}
                {formatDate(application.offerDetails.expiresAt)}
              </p>
            </div>
          </div>

          {/* Decline Reason (if declining) */}
          {showDeclineReason && (
            <div className="space-y-2">
              <Label htmlFor="decline-reason">
                Reason for declining (optional)
              </Label>
              <Textarea
                id="decline-reason"
                placeholder="Please let us know why you're declining this offer..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-slate-500">
                This feedback helps companies improve their hiring process.
              </p>
            </div>
          )}

          {/* Important Notes */}
          {!showDeclineReason && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">
                Before you decide
              </h4>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Accepting will confirm your start date and salary</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>You'll receive onboarding information via email</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Declining will close this application permanently</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          {showDeclineReason ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowDeclineReason(false)}
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleDecline}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Declining...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirm Decline
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleDecline}
                className="text-slate-600"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline Offer
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isProcessing || daysUntilExpiry <= 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Offer
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CandidateOfferDialog;
