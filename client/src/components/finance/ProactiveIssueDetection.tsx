import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  XCircle,
} from "lucide-react";
import { useDisputes } from "@/hooks/useDisputes";
import type { IntroductionForDispute } from "@/types/dispute";
import { useState } from "react";

interface ProactiveIssueDetectionProps {
  eligibleIntroductions: IntroductionForDispute[];
  onFileDispute: () => void;
}

export function ProactiveIssueDetection({
  eligibleIntroductions,
  onFileDispute,
}: ProactiveIssueDetectionProps) {
  const { detectIssues } = useDisputes();
  const [dismissedIssues, setDismissedIssues] = useState<Set<string>>(
    new Set()
  );

  // Detect issues for all eligible introductions
  const detectedIssues = eligibleIntroductions
    .map((intro) => {
      const issue = detectIssues(intro);
      if (issue && !dismissedIssues.has(intro.id)) {
        return { intro, issue };
      }
      return null;
    })
    .filter(
      (
        item
      ): item is {
        intro: IntroductionForDispute;
        issue: NonNullable<ReturnType<typeof detectIssues>>;
      } => item !== null
    );

  const dismissIssue = (introId: string) => {
    setDismissedIssues((prev) => new Set(prev).add(introId));
  };

  if (detectedIssues.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-500 bg-red-50 dark:bg-red-950/20";
      case "medium":
        return "border-orange-500 bg-orange-50 dark:bg-orange-950/20";
      case "low":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      default:
        return "border-gray-500 bg-gray-50 dark:bg-gray-950/20";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />;
      case "medium":
        return <Clock className="h-5 w-5 text-orange-600" />;
      case "low":
        return <Calendar className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <Card className="border-2 border-amber-300 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 animate-pulse">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">
              Potential Issues Detected
            </h3>
            <p className="text-sm text-muted-foreground">
              We found {detectedIssues.length} introduction
              {detectedIssues.length > 1 ? "s" : ""} that may require your
              attention
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {detectedIssues.map(({ intro, issue }) => (
            <div
              key={intro.id}
              className={`border-l-4 ${getSeverityColor(issue.severity)} rounded-lg p-4 shadow-sm hover:shadow-md transition-all`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge
                        variant={
                          issue.severity === "high"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {issue.type.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{issue.message}</p>
                    <p className="text-xs text-muted-foreground">
                      Introduction: {intro.contactName || "Unknown Contact"} •
                      {intro.bountyAmount &&
                        ` $${Number(intro.bountyAmount).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={onFileDispute}
                    className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                  >
                    File Dispute
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissIssue(intro.id)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
