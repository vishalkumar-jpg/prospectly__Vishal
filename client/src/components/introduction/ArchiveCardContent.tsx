import { Archive, Info } from "lucide-react";
import { labelRequesterArchiveReason } from "./introductionHelpers";

interface ArchiveCardContentProps {
  withdrawn: boolean;
  additionalContext?: string | null;
  purpose?: string | null;
  requesterArchiveReason?: string | null;
  requesterArchiveNotes?: string | null;
}

export function ArchiveCardContent({
  withdrawn,
  additionalContext,
  purpose,
  requesterArchiveReason,
  requesterArchiveNotes,
}: ArchiveCardContentProps) {
  const contextText =
    additionalContext ||
    (purpose && purpose !== "No message provided" ? purpose : "");

  const hasWithdrawalInfo =
    withdrawn && (requesterArchiveReason || requesterArchiveNotes);

  if (!contextText && !hasWithdrawalInfo) return null;

  return (
    <div className="space-y-4 w-full">
      {/* Withdrawal Details (only when withdrawn) */}
      {hasWithdrawalInfo && (
        <div className="relative overflow-hidden rounded-xl bg-muted/40 border border-border p-4">
          <div className="flex items-start gap-2">
            <Archive className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold mb-1 text-foreground">
                Withdrawal details
              </h4>
              {requesterArchiveReason && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Reason: </span>
                  {labelRequesterArchiveReason(requesterArchiveReason)}
                </p>
              )}
              {requesterArchiveNotes && (
                <p className="mt-2 text-xs text-foreground whitespace-pre-wrap break-words">
                  {requesterArchiveNotes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Context */}
      {contextText && (
        <div className="relative overflow-hidden rounded-xl bg-brand-sky/5 border border-brand-sky/20 p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-brand-sky flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold mb-1 text-brand-sky">
                Additional Context
              </h4>
              <p className="text-xs text-muted-foreground">{contextText}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
