import { AlertCircle } from "lucide-react";
import type { UnsuccessfulAttempt } from "@/hooks/useTransactionHistory";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { formatRefundReason } from "@/utils/refund-reason-labels";
import { FAILURE_STAGE_LABELS } from "./UnfulfilledTab.types";

interface BountyTransactionUnsuccessfulNoteProps {
  attempts: UnsuccessfulAttempt[];
}

export function BountyTransactionUnsuccessfulNote({
  attempts,
}: BountyTransactionUnsuccessfulNoteProps) {
  if (attempts.length === 0) return null;

  const countLabel =
    attempts.length === 1
      ? "Marked unsuccessful once"
      : `Marked unsuccessful ${attempts.length} times`;

  return (
    <div className="mb-4 rounded-xl border border-brand-warning/20 bg-brand-warning/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-brand-warning" />
        <p className="text-sm font-semibold">{countLabel}</p>
      </div>
      <ul className="space-y-2">
        {attempts.map((attempt) => {
          const stageLabel = FAILURE_STAGE_LABELS[attempt.failureStage];
          return (
            <li
              key={`${attempt.markedAt}-${attempt.failureStage}-${attempt.failureReason}`}
              className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-muted-foreground">
                {formatLocalizedShortDateTime(attempt.markedAt)}
              </span>
              <span className="font-medium">
                {formatRefundReason(attempt.failureReason)}
                {stageLabel ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {stageLabel}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
