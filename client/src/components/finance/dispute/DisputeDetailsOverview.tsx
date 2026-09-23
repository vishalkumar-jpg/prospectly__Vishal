import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Dispute } from "@/types/dispute";
import { DISPUTE_TYPE_LABELS, DISPUTE_STATUS_LABELS } from "@/types/dispute";

interface DisputeDetailsOverviewProps {
  dispute: Dispute;
}

export function DisputeDetailsOverview({
  dispute,
}: DisputeDetailsOverviewProps) {
  const getStatusVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "resolved":
        return "default";
      case "rejected":
        return "destructive";
      case "under_review":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getPriorityVariant = (
    priority: string
  ): "default" | "secondary" | "destructive" => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <Card className="bg-card text-card-foreground border border-border rounded-lg shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge variant={getStatusVariant(dispute.status)}>
              {DISPUTE_STATUS_LABELS[dispute.status]}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Priority</p>
            <Badge variant={getPriorityVariant(dispute.priority)}>
              {dispute.priority.toUpperCase()}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Type</p>
            <p className="text-sm font-medium">
              {DISPUTE_TYPE_LABELS[dispute.disputeType]}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Category</p>
            <Badge variant="outline">{dispute.disputeCategory}</Badge>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground mb-1">
              Intro Meeting Title
            </p>
            <p className="text-sm font-medium leading-none">
              {dispute.introductionTitle || "N/A"}
            </p>
          </div>
          <div className="col-span-2 pt-2 border-t border-border mt-2">
            <p className="text-xs text-muted-foreground mb-1">
              Dispute Against
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                {dispute.againstUserName || "N/A"}
              </p>
              {dispute.againstUserEmail && (
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  ({dispute.againstUserEmail})
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
