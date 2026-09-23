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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Send,
  Briefcase,
  Building2,
  DollarSign,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectorCandidate } from "./ConnectorCandidateCard";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

interface HireConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: ConnectorCandidate | null;
  onConfirmationSent: () => void;
}

export function HireConfirmationDialog({
  open,
  onOpenChange,
  candidate,
  onConfirmationSent,
}: HireConfirmationDialogProps) {
  const [personalMessage, setPersonalMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!candidate) return null;

  const handleSendConfirmation = async () => {
    setIsSending(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSending(false);
    onConfirmationSent();
    onOpenChange(false);
    setPersonalMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-emerald-600" />
            Send Hire Confirmation
          </DialogTitle>
          <DialogDescription>
            Send a confirmation request to {candidate.candidateName} to verify
            they've been hired. Once confirmed by all parties, your referral
            payout will be processed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Candidate & Job Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    candidate.avatarColor
                  )}
                >
                  <span className="text-sm font-medium">
                    {candidate.candidateName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">
                    {candidate.candidateName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {candidate.candidateEmail}
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                {candidate.stage === "offer_accepted"
                  ? "Offer Accepted"
                  : "Offer Sent"}
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Briefcase className="h-4 w-4 text-slate-400" />
                <span>{candidate.jobTitle}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>{candidate.jobCompany}</span>
              </div>
            </div>
          </div>

          {/* Bounty Info */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-emerald-800">
                  Your Referral Payout
                </span>
              </div>
              <span className="text-xl font-bold text-emerald-700">
                ${formatMoneyWithCommas(candidate.bountyAmount)}
              </span>
            </div>
            <p className="text-xs text-emerald-600 mt-2">
              This amount will be released after all parties confirm the hire.
            </p>
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="personal-message">
              Personal Message (optional)
            </Label>
            <Textarea
              id="personal-message"
              placeholder="Add a congratulatory message to the candidate..."
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              This will be included in the confirmation email to{" "}
              {candidate.candidateName}.
            </p>
          </div>

          {/* What happens next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">
              What happens next?
            </h4>
            <ol className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-medium">
                  1
                </span>
                <span>
                  {candidate.candidateName} receives an email to confirm their
                  hire
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-medium">
                  2
                </span>
                <span>The recruiter confirms the hire on their end</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-medium">
                  3
                </span>
                <span>
                  Your referral payout is processed within 5 business days
                </span>
              </li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendConfirmation}
            disabled={isSending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Confirmation Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HireConfirmationDialog;
