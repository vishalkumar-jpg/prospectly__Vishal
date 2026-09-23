import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RecruiterDashboardErrorProps = {
  onRetry: () => void;
};

export function RecruiterDashboardError({
  onRetry,
}: RecruiterDashboardErrorProps) {
  return (
    <Card className="mx-auto max-w-lg rounded-lg border border-border bg-card p-6 text-center text-card-foreground shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-destructive/10 text-brand-destructive">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="mb-2 text-xl font-bold">Unable to load dashboard</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        We couldn&apos;t load your recruiter dashboard data. Please try again.
      </p>
      <Button variant="outline" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </Card>
  );
}
