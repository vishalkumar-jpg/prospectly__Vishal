import { Info, DollarSign } from "lucide-react";
import { InboxRequest } from "./inboxUtils";

interface InboxCardContentProps {
  request: InboxRequest;
}

export function InboxCardContent({ request }: InboxCardContentProps) {
  return (
    <div className="space-y-4 w-full">
      {/* Additional Context Section - Only show when available */}
      {(request.additionalContext || request.additional_context) && (
        <div className="relative overflow-hidden rounded-xl bg-brand-sky/5 border border-brand-sky/20 p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-brand-sky flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold mb-1 text-brand-sky">
                Additional Context
              </h4>
              <p className="text-xs text-muted-foreground">
                {request.additionalContext || request.additional_context}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bounty Validation Warning */}
      {request.status === "pending" &&
        request.canAccept === false &&
        request.connectorBountyAmount !== undefined &&
        request.requesterBountyAmount !== undefined && (
          <div className="relative overflow-hidden rounded-xl bg-brand-warning/5 border border-brand-warning/30 p-3">
            <div className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 text-brand-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-brand-warning leading-relaxed">
                  <strong>Referral Payout Adjustment Required:</strong> Your
                  current referral payout ($
                  {request.connectorBountyAmount.toLocaleString()}) is higher
                  than the requester's referral payout ($
                  {request.requesterBountyAmount.toLocaleString()}). Please
                  revise your referral payout to accept this request.
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
