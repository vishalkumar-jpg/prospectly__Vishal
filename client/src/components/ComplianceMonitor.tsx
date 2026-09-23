import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  TrendingDown,
  TrendingUp,
  Pause,
  Settings,
} from "lucide-react";

interface ComplianceMonitorProps {
  campaignId: string;
  campaignName: string;
}

interface ComplianceMetrics {
  bounceRate: number;
  spamReports: number;
  unsubscribeRate: number;
  replyRate: number;
  deliverabilityScore: number;
  riskLevel: "low" | "medium" | "high";
  autoHaltTriggered: boolean;
  lastCheck: string;
}

export function ComplianceMonitor({
  campaignId,
  campaignName,
}: ComplianceMonitorProps) {
  const [metrics] = useState<ComplianceMetrics>({
    bounceRate: 3.2,
    spamReports: 0.1,
    unsubscribeRate: 1.8,
    replyRate: 12.4,
    deliverabilityScore: 87,
    riskLevel: "low",
    autoHaltTriggered: false,
    lastCheck: "2 minutes ago",
  });

  const thresholds = {
    bounceRate: { warning: 5, critical: 10 },
    spamReports: { warning: 0.5, critical: 1.0 },
    unsubscribeRate: { warning: 3, critical: 5 },
    replyRate: { minimum: 5 },
    deliverabilityScore: { warning: 80, critical: 70 },
  };

  const getStatusColor = (
    value: number,
    threshold: Record<string, number>,
    isHigherBetter = false
  ) => {
    if (isHigherBetter) {
      if (value >= threshold.critical) return "text-green-600";
      if (value >= threshold.warning) return "text-yellow-600";
      return "text-red-600";
    } else {
      if (value >= threshold.critical) return "text-red-600";
      if (value >= threshold.warning) return "text-yellow-600";
      return "text-green-600";
    }
  };

  const getStatusBadge = (
    value: number,
    threshold: Record<string, number>,
    isHigherBetter = false
  ) => {
    if (isHigherBetter) {
      if (value >= threshold.critical)
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-800 hover:text-green-100">
            Excellent
          </Badge>
        );
      if (value >= threshold.warning)
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-800 hover:text-yellow-100">
            Good
          </Badge>
        );
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-800 hover:text-red-100">
          Poor
        </Badge>
      );
    } else {
      if (value >= threshold.critical)
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-800 hover:text-red-100">
            Critical
          </Badge>
        );
      if (value >= threshold.warning)
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-800 hover:text-yellow-100">
            Warning
          </Badge>
        );
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-800 hover:text-green-100">
          Good
        </Badge>
      );
    }
  };

  const complianceFeatures = [
    {
      name: "Unsubscribe Links",
      status: "active",
      description: "Auto-included in all emails",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      name: "CAN-SPAM Compliance",
      status: "active",
      description: "Physical address & sender info",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      name: "GDPR Compliance",
      status: "active",
      description: "Consent tracking & data handling",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      name: "Signature Requirements",
      status: "active",
      description: "Company signature auto-added",
      icon: CheckCircle,
      color: "text-green-600",
    },
  ];

  const riskLevelColor = {
    low: "text-green-600",
    medium: "text-yellow-600",
    high: "text-red-600",
  };

  const riskLevelBg = {
    low: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    medium:
      "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
    high: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Compliance & Monitoring
          <Badge
            variant="outline"
            className={`ml-auto ${riskLevelColor[metrics.riskLevel]}`}
          >
            {metrics.riskLevel.toUpperCase()} RISK
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-Halt Alert */}
        {metrics.autoHaltTriggered && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <Pause className="h-4 w-4" />
            <AlertDescription>
              <strong>Campaign Auto-Halted:</strong> High bounce rate detected
              (&gt;{thresholds.bounceRate.critical}%). Campaign has been
              automatically paused to protect sender reputation.
            </AlertDescription>
          </Alert>
        )}

        {/* Overall Risk Assessment */}
        <div
          className={`p-4 rounded-lg border ${riskLevelBg[metrics.riskLevel]}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Overall Risk Level</span>
            <div className="flex items-center gap-2">
              {metrics.riskLevel === "low" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : metrics.riskLevel === "medium" ? (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span
                className={`font-bold ${riskLevelColor[metrics.riskLevel]}`}
              >
                {metrics.riskLevel.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Last monitored: {metrics.lastCheck}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Real-time Metrics
          </h4>

          <div className="grid gap-4">
            {/* Bounce Rate */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Bounce Rate</div>
                <div className="text-sm text-muted-foreground">
                  Target: &lt;{thresholds.bounceRate.warning}%
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-xl font-bold ${getStatusColor(metrics.bounceRate, thresholds.bounceRate)}`}
                >
                  {metrics.bounceRate}%
                </div>
                {getStatusBadge(metrics.bounceRate, thresholds.bounceRate)}
              </div>
            </div>

            {/* Spam Reports */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Spam Reports</div>
                <div className="text-sm text-muted-foreground">
                  Target: &lt;{thresholds.spamReports.warning}%
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-xl font-bold ${getStatusColor(metrics.spamReports, thresholds.spamReports)}`}
                >
                  {metrics.spamReports}%
                </div>
                {getStatusBadge(metrics.spamReports, thresholds.spamReports)}
              </div>
            </div>

            {/* Reply Rate */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Reply Rate</div>
                <div className="text-sm text-muted-foreground">
                  Target: &gt;{thresholds.replyRate.minimum}%
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-xl font-bold ${metrics.replyRate >= thresholds.replyRate.minimum ? "text-green-600" : "text-red-600"}`}
                >
                  {metrics.replyRate}%
                </div>
                <div className="flex items-center gap-1">
                  {metrics.replyRate >= thresholds.replyRate.minimum ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <Badge
                    variant="outline"
                    className={
                      metrics.replyRate >= thresholds.replyRate.minimum
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    {metrics.replyRate >= thresholds.replyRate.minimum
                      ? "Good"
                      : "Poor"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Deliverability Score */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Deliverability Score</div>
                <div className="text-sm text-muted-foreground">
                  Target: &gt;{thresholds.deliverabilityScore.warning}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-xl font-bold ${getStatusColor(metrics.deliverabilityScore, thresholds.deliverabilityScore, true)}`}
                >
                  {metrics.deliverabilityScore}/100
                </div>
                <Progress
                  value={metrics.deliverabilityScore}
                  className="w-20 h-2 mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Built-in Compliance Features */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Built-in Compliance
          </h4>

          <div className="grid gap-2">
            {complianceFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <feature.icon className={`h-4 w-4 ${feature.color}`} />
                  <div>
                    <div className="text-sm font-medium">{feature.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {feature.description}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-green-700 border-green-300"
                >
                  {feature.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-Halt Thresholds */}
        <div className="space-y-3">
          <h4 className="font-medium">Auto-Halt Thresholds</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• Bounce rate: &gt;{thresholds.bounceRate.critical}%</div>
            <div>• Spam reports: &gt;{thresholds.spamReports.critical}%</div>
            <div>
              • Deliverability: &lt;{thresholds.deliverabilityScore.critical}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Settings className="h-4 w-4 mr-2" />
            Configure Thresholds
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            View Detailed Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
