import { AlertTriangle, Flag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetectedIssue } from "@/utils/disputeDetection";

interface DisputeAlertProps {
  issue: DetectedIssue;
  onFileDispute?: () => void;
}

export function DisputeAlert({ issue, onFileDispute }: DisputeAlertProps) {
  const severityColors = {
    high: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
    medium:
      "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
    low: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
  };

  const severityTextColors = {
    high: "text-red-900 dark:text-red-100",
    medium: "text-orange-900 dark:text-orange-100",
    low: "text-yellow-900 dark:text-yellow-100",
  };

  const severityIconColors = {
    high: "text-red-600",
    medium: "text-orange-600",
    low: "text-yellow-600",
  };

  return (
    <div
      className={`mb-3 p-3 rounded-lg border ${severityColors[issue.severity]}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`h-5 w-5 ${severityIconColors[issue.severity]} flex-shrink-0 mt-0.5`}
        />
        <div className="flex-1">
          <h4
            className={`text-sm font-semibold ${severityTextColors[issue.severity]}`}
          >
            Potential Issue Detected
          </h4>
          <p
            className={`text-xs mt-1 ${severityTextColors[issue.severity]} opacity-90`}
          >
            {issue.message}
          </p>
          {onFileDispute && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  onFileDispute();
                }}
              >
                <Flag className="h-3 w-3 mr-1.5" />
                Review & File Dispute
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
