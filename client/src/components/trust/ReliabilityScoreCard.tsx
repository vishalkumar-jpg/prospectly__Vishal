import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ReliabilityScoreCardProps {
  reliabilityScore: number;
  totalDeclines: number;
  declineRate: number;
  onViewHistory?: () => void;
}

export function ReliabilityScoreCard({
  reliabilityScore,
  totalDeclines,
  declineRate,
  onViewHistory,
}: ReliabilityScoreCardProps) {
  const progressValue = ((reliabilityScore + 20) / 20) * 100;
  const isGoodStanding = reliabilityScore >= -5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Reliability & Response Rate</span>
          <Badge variant={isGoodStanding ? "default" : "destructive"}>
            {reliabilityScore} points
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Reliability Score
            </span>
            <span className="text-sm font-medium">-20 to 0 range</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Total Declines</div>
            <div className="text-2xl font-bold">{totalDeclines}</div>
          </div>
          <div>
            <div className="text-muted-foreground">30-Day Rate</div>
            <div className="text-2xl font-bold">
              {(declineRate * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex items-start gap-2">
            {isGoodStanding ? (
              <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isGoodStanding ? "Good Standing" : "Needs Improvement"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isGoodStanding
                  ? "Your reliability score is strong. Continue making quality introductions!"
                  : "Your decline rate is affecting your trust score. Focus on accepting requests you can fulfill."}
              </p>
            </div>
          </div>
        </div>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
            <AlertCircle className="h-4 w-4" />
            How do declines affect my score?
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="font-medium text-green-600 mb-1">
                  No Penalty (0 points)
                </div>
                <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                  <li>"I don't know this person well enough"</li>
                  <li>"Doesn't align with contact's interests"</li>
                </ul>
              </div>

              <div className="rounded-lg border p-3">
                <div className="font-medium text-yellow-600 mb-1">
                  Minor Penalty (-1 to -2)
                </div>
                <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                  <li>"I prefer not to make this introduction"</li>
                </ul>
              </div>

              <div className="rounded-lg border p-3">
                <div className="font-medium text-orange-600 mb-1">
                  Moderate Penalty (-3 to -5)
                </div>
                <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                  <li>"I'm not comfortable making this introduction" (-2)</li>
                  <li>Decline rate above 50% (-5)</li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                💡 Tip: It's better to decline responsibly than accept and not
                deliver. Thoughtful declines protect your reputation and your
                contacts.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {onViewHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewHistory}
            className="w-full"
          >
            View Decline History
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
