import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_AI_RETRY_ATTEMPTS } from "@/constants/recruitmentRetry";
import { useRetryCandidateEvaluation } from "@/hooks/useRetryCandidateEvaluation";
import { useToast } from "@/hooks/use-toast";
import { CandidateApplication } from "@/lib/types/recruitment";

interface EvaluationNoticeProps {
  application: CandidateApplication;
}

export function EvaluationNotice({ application }: EvaluationNoticeProps) {
  const retryMutation = useRetryCandidateEvaluation();
  const { toast } = useToast();

  const retryCount = application.evaluationRetryCount ?? 0;
  const canRetry = retryCount < MAX_AI_RETRY_ATTEMPTS;

  const handleRetry = () => {
    retryMutation.mutate(application.id, {
      onSuccess: () => {
        toast({
          title: "Retry queued",
          description:
            "Resume evaluation will be reprocessed. Refresh to see updates.",
        });
      },
      onError: (error) => {
        toast({
          title: "Retry failed",
          description:
            (error as Error)?.message || "Could not retry this evaluation.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <>
      {application.analysisStatus === "failed" && (
        <>
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 mt-3">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span>
                We couldn&apos;t complete the resume evaluation for this
                application.
              </span>
              {canRetry ? (
                <span className="text-muted-foreground">
                  Don&apos;t worry — you can try again by clicking the{" "}
                  <strong>&quot;Retry&quot;</strong> button below. You have{" "}
                  {MAX_AI_RETRY_ATTEMPTS - retryCount} attempt
                  {MAX_AI_RETRY_ATTEMPTS - retryCount === 1 ? "" : "s"}{" "}
                  remaining.
                </span>
              ) : (
                <span className="text-muted-foreground">
                  All {MAX_AI_RETRY_ATTEMPTS} retry attempts have been used. If
                  the issue persists, please reach out to our support team for
                  further assistance.
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={!canRetry || retryMutation.isPending}
            >
              {retryMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              Retry ({retryCount}/{MAX_AI_RETRY_ATTEMPTS})
            </Button>
          </div>
        </>
      )}

      {/* {application.analysisStatus === "completed" &&
        application.matchScore &&
        parseFloat(application.matchScore) < 50 &&
        ["applied", "under_review"].includes(application.status) && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted border border-border rounded px-3 py-2 mt-3">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <span>
              Your uploaded resume did not meet the required match threshold for
              this role ({application.matchScore}% vs. 50% minimum). The
              evaluation is based on how well your skills and experience align
              with the job description.
            </span>
          </div>
        )} */}

      {application.status === "jd_mismatched" && (
        <div className="flex items-start gap-2 text-xs text-brand-warning bg-brand-warning/10 border border-brand-warning/30 rounded px-3 py-2 mt-3">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            This application was not progressed because your resume did not
            sufficiently match the job description requirements. Consider
            updating your resume to better reflect the required skills before
            applying to similar roles.
          </span>
        </div>
      )}
    </>
  );
}
