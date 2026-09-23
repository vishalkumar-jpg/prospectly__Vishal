import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCcw, CheckCircle2 } from "lucide-react";

interface ClaimFailureStateProps {
  failureReason: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export function ClaimFailureState({
  failureReason,
  onClose,
  onRetry,
}: ClaimFailureStateProps) {
  return (
    <div className="space-y-4">
      <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-900 dark:text-red-100">
          {failureReason}
        </AlertDescription>
      </Alert>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">What you can do:</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              Import contacts from additional sources (Google, Microsoft, Apple,
              LinkedIn)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              Make sure you have the prospect's contact information saved
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              Connect with the person who shared this opportunity on LinkedIn
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onRetry} className="flex-1">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
