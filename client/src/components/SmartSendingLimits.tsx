import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Mail,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Settings,
} from "lucide-react";

interface SmartSendingLimitsProps {
  campaignId: string;
  userTier: "basic" | "pro" | "enterprise";
  trustScore: number;
}

export function SmartSendingLimits({
  campaignId,
  userTier,
  trustScore,
}: SmartSendingLimitsProps) {
  const [currentUsage, setCurrentUsage] = useState({
    emailsToday: 45,
    linkedinToday: 12,
    textsToday: 8,
    totalToday: 65,
  });

  // Calculate daily limits based on trust score and user tier
  const calculateDailyLimits = () => {
    const baseLimits = {
      basic: { email: 50, linkedin: 20, text: 15 },
      pro: { email: 100, linkedin: 40, text: 30 },
      enterprise: { email: 200, linkedin: 80, text: 60 },
    };

    const base = baseLimits[userTier];
    const trustMultiplier = Math.max(0.3, Math.min(2.0, trustScore / 4.0));

    return {
      email: Math.floor(base.email * trustMultiplier),
      linkedin: Math.floor(base.linkedin * trustMultiplier),
      text: Math.floor(base.text * trustMultiplier),
      total: Math.floor(
        (base.email + base.linkedin + base.text) * trustMultiplier
      ),
    };
  };

  const limits = calculateDailyLimits();

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min(100, (used / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 4.5) return "text-green-600";
    if (score >= 3.5) return "text-yellow-600";
    return "text-red-600";
  };

  const warmUpStatus = {
    isWarmingUp: trustScore < 3.0 || userTier === "basic",
    daysRemaining: Math.max(0, 14 - Math.floor(trustScore * 3)),
    currentPhase:
      trustScore < 2.0
        ? "Initial"
        : trustScore < 3.0
          ? "Gradual"
          : "Full Speed",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Smart Sending Limits
          <Badge variant="outline" className="ml-auto">
            Trust Score:{" "}
            <span className={getTrustScoreColor(trustScore)}>
              {trustScore.toFixed(1)}
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warm-up Protocol Alert */}
        {warmUpStatus.isWarmingUp && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Warm-Up Protocol Active:</strong> Your account is in{" "}
              {warmUpStatus.currentPhase.toLowerCase()} phase.
              {warmUpStatus.daysRemaining > 0 &&
                ` ${warmUpStatus.daysRemaining} days remaining to reach full sending capacity.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Trust Score Impact */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Trust Score Impact</span>
            <div className="flex items-center gap-2">
              {trustScore >= 4.0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`font-bold ${getTrustScoreColor(trustScore)}`}>
                {((trustScore / 4.0) * 100).toFixed(0)}% of base limits
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Your current trust score of {trustScore.toFixed(1)} affects your
            daily sending limits. Maintain high reply rates and low bounce rates
            to increase limits.
          </p>
        </div>

        {/* Daily Usage Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Messages Today</span>
              <span
                className={getUsageColor(
                  getUsagePercentage(currentUsage.totalToday, limits.total)
                )}
              >
                {currentUsage.totalToday}/{limits.total}
              </span>
            </div>
            <Progress
              value={getUsagePercentage(currentUsage.totalToday, limits.total)}
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Plan Tier</span>
              <Badge variant="outline" className="text-xs">
                {userTier.toUpperCase()}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Upgrade for higher base limits
            </div>
          </div>
        </div>

        {/* Channel-Specific Limits */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Channel Usage & Limits
          </h4>

          <div className="grid gap-3">
            {/* Email */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">
                    {currentUsage.emailsToday}/{limits.email} sent today
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-bold ${getUsageColor(getUsagePercentage(currentUsage.emailsToday, limits.email))}`}
                >
                  {getUsagePercentage(
                    currentUsage.emailsToday,
                    limits.email
                  ).toFixed(0)}
                  %
                </div>
                <Progress
                  value={getUsagePercentage(
                    currentUsage.emailsToday,
                    limits.email
                  )}
                  className="w-20 h-2 mt-1"
                />
              </div>
            </div>

            {/* LinkedIn */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-blue-700 rounded text-white flex items-center justify-center text-xs font-bold">
                  in
                </div>
                <div>
                  <div className="font-medium">LinkedIn</div>
                  <div className="text-sm text-muted-foreground">
                    {currentUsage.linkedinToday}/{limits.linkedin} sent today
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-bold ${getUsageColor(getUsagePercentage(currentUsage.linkedinToday, limits.linkedin))}`}
                >
                  {getUsagePercentage(
                    currentUsage.linkedinToday,
                    limits.linkedin
                  ).toFixed(0)}
                  %
                </div>
                <Progress
                  value={getUsagePercentage(
                    currentUsage.linkedinToday,
                    limits.linkedin
                  )}
                  className="w-20 h-2 mt-1"
                />
              </div>
            </div>

            {/* SMS */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-green-600 rounded text-white flex items-center justify-center text-xs">
                  📱
                </div>
                <div>
                  <div className="font-medium">SMS</div>
                  <div className="text-sm text-muted-foreground">
                    {currentUsage.textsToday}/{limits.text} sent today
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-bold ${getUsageColor(getUsagePercentage(currentUsage.textsToday, limits.text))}`}
                >
                  {getUsagePercentage(
                    currentUsage.textsToday,
                    limits.text
                  ).toFixed(0)}
                  %
                </div>
                <Progress
                  value={getUsagePercentage(
                    currentUsage.textsToday,
                    limits.text
                  )}
                  className="w-20 h-2 mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Smart Controls */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Smart Controls Active
          </h4>

          <div className="grid gap-2">
            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Anti-spam protection</span>
              </div>
              <Badge
                variant="outline"
                className="text-green-700 border-green-300"
              >
                Active
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Bounce monitoring</span>
              </div>
              <Badge
                variant="outline"
                className="text-blue-700 border-blue-300"
              >
                Active
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Compliance checks</span>
              </div>
              <Badge
                variant="outline"
                className="text-yellow-700 border-yellow-300"
              >
                Monitoring
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Settings className="h-4 w-4 mr-2" />
            Adjust Settings
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            View Trust Score Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
