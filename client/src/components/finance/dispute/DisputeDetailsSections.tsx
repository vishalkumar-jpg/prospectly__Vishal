import {
  DollarSign,
  Calendar,
  FileText,
  CheckCircle2,
  Target,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import type { Dispute } from "@/types/dispute";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";

interface DisputeDetailsSectionsProps {
  dispute: Dispute;
}

export function DisputeDetailsSections({
  dispute,
}: DisputeDetailsSectionsProps) {
  return (
    <>
      {/* Financial Information */}
      {(dispute.disputedAmount != null ||
        dispute.requestedRefundAmount != null) && (
        <Card className="bg-card text-card-foreground border border-border rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {dispute.disputedAmount != null && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Disputed Amount
                  </p>
                  <p className="text-lg font-semibold">
                    ${Number(dispute.disputedAmount).toLocaleString()}
                  </p>
                </div>
              )}
              {dispute.requestedRefundAmount != null && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Requested Refund
                  </p>
                  <p className="text-lg font-semibold">
                    ${Number(dispute.requestedRefundAmount).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      <Card className="bg-card text-card-foreground border border-border rounded-lg shadow-sm">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reason
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all max-h-60 overflow-y-auto pr-2">
            {dispute.reason}
          </p>
        </CardContent>
      </Card>

      {/* Expected Outcome */}
      {dispute.expectedOutcome && (
        <Card className="bg-card text-card-foreground border border-border rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Expected Outcome
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all max-h-60 overflow-y-auto pr-2">
              {dispute.expectedOutcome}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resolution Information */}
      {dispute.status === "resolved" && dispute.resolutionNotes && (
        <Card className="bg-card text-card-foreground border border-border rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Resolution
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {dispute.resolutionNotes}
            </p>
            {dispute.resolutionAction && (
              <div className="mt-2">
                <Badge variant="outline">
                  Action:{" "}
                  {dispute.resolutionAction.replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rejection reason (from reviewer; stored as resolution_notes) */}
      {dispute.status === "rejected" && (
        <Card className="bg-card text-card-foreground border border-border rounded-lg shadow-sm border-l-4 border-l-red-500/80">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              Rejection reason
            </h4>
            {dispute.resolutionNotes?.trim() ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all max-h-60 overflow-y-auto pr-2">
                {dispute.resolutionNotes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No rejection reason was provided.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="bg-card text-card-foreground border border-border rounded-lg shadow-sm">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Filed</span>
              <span className="font-medium">
                {formatLocalizedShortDateTime(dispute.createdAt)}
              </span>
            </div>
            {dispute.resolvedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {dispute.status === "rejected" ? "Rejected" : "Resolved"}
                </span>
                <span className="font-medium">
                  {formatLocalizedShortDateTime(dispute.resolvedAt)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Evidence */}
      {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
        <Card className="bg-card text-card-foreground border border-border rounded-lg shadow-sm">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-2">Evidence</h4>
            <p className="text-sm text-muted-foreground">
              {dispute.evidenceUrls.length} file(s) attached
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
