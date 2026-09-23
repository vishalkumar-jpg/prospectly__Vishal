import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Loader2,
  XCircle,
  Shield,
  ArrowRight,
} from "lucide-react";
import type { OnboardingStep } from "./types";

interface ClaimStepsListProps {
  steps: OnboardingStep[];
  currentStepIndex: number;
  isVerifying: boolean;
  onImportContacts: () => void;
}

export function ClaimStepsList({
  steps,
  currentStepIndex,
  isVerifying,
  onImportContacts,
}: ClaimStepsListProps) {
  const getStepIcon = (step: OnboardingStep) => {
    const Icon = step.icon;
    switch (step.status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case "in_progress":
        return <Loader2 className="h-6 w-6 text-primary animate-spin" />;
      case "failed":
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Icon className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            "flex items-start gap-4 p-4 rounded-lg border transition-all",
            step.status === "in_progress" && "border-primary/50 bg-primary/5",
            step.status === "completed" &&
              "border-green-200 bg-green-50/50 dark:bg-green-950/20",
            step.status === "pending" && "border-muted bg-muted/20",
            step.status === "failed" &&
              "border-red-200 bg-red-50/50 dark:bg-red-950/20"
          )}
        >
          <div className="shrink-0">{getStepIcon(step)}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{step.title}</h4>
              {step.status === "completed" && (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-700 hover:bg-green-700 hover:text-green-100 border-green-200"
                >
                  Done
                </Badge>
              )}
              {step.status === "in_progress" && (
                <Badge variant="outline" className="animate-pulse">
                  In Progress
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{step.description}</p>
            {step.failureReason && (
              <p className="text-sm text-red-600 mt-1">{step.failureReason}</p>
            )}

            {step.actionLabel &&
              step.status === "pending" &&
              index === currentStepIndex && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={
                    step.id === "import_contacts"
                      ? onImportContacts
                      : step.action
                  }
                  disabled={isVerifying}
                >
                  {step.actionLabel}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
          </div>
        </div>
      ))}

      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Why we verify:</strong> This ensures introductions are genuine
          and protects both parties. Your contacts remain private and secure.
        </AlertDescription>
      </Alert>
    </div>
  );
}
