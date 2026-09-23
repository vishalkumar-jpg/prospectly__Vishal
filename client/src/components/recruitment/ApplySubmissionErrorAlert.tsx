import { AlertCircle } from "lucide-react";

interface ApplySubmissionErrorAlertProps {
  message: string;
}

export function ApplySubmissionErrorAlert({
  message,
}: ApplySubmissionErrorAlertProps) {
  return (
    <div
      role="alert"
      className="w-full overflow-hidden rounded-lg border border-brand-destructive/20 bg-gradient-to-br from-brand-destructive/5 to-brand-rose/5 p-4"
    >
      <div className="flex w-full min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-destructive/10">
          <AlertCircle className="h-5 w-5 text-brand-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-brand-destructive">
            Application failed
          </p>
          <p className="mt-1 text-sm leading-relaxed text-brand-destructive/80">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
