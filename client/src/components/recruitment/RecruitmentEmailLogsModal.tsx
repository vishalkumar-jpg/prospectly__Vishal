import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  recruitmentEmailLogsApi,
  type RecruitmentEmailLogItem,
  type RecruitmentEmailLogsAudience,
} from "@/lib/api/recruitment-email-logs";
import { RecruitmentEmailResendConfirmDialog } from "./RecruitmentEmailResendConfirmDialog";
import { RecruitmentEmailLogsTable } from "./RecruitmentEmailLogsTable";
import { audienceDescription } from "./recruitment-email-logs-modal.utils";

type RecruitmentEmailLogsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: RecruitmentEmailLogsAudience;
  candidateId?: string;
  poolMatchId?: string;
};

export function RecruitmentEmailLogsModal({
  open,
  onOpenChange,
  audience,
  candidateId,
  poolMatchId,
}: RecruitmentEmailLogsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingResendLog, setPendingResendLog] =
    useState<RecruitmentEmailLogItem | null>(null);

  const usePoolMatch = !!poolMatchId && !candidateId;
  const queryKey = usePoolMatch
    ? ["/recruitment/email-logs/pool-matches", poolMatchId, audience]
    : ["/recruitment/email-logs/candidates", candidateId, audience];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      usePoolMatch
        ? recruitmentEmailLogsApi.getPoolMatchLogs(poolMatchId!)
        : recruitmentEmailLogsApi.getCandidateLogs(candidateId!, audience),
    enabled: open && !!(poolMatchId || candidateId),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const resendAudience = data?.audience ?? audience;

  const resendMutation = useMutation({
    mutationFn: (logId: string) =>
      recruitmentEmailLogsApi.resend(logId, resendAudience),
    onSuccess: async () => {
      toast({
        title: "Email resent",
        description: "The email has been queued for delivery again.",
      });
      setConfirmOpen(false);
      setPendingResendLog(null);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: unknown) => {
      toast({
        title: "Resend failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not resend this email.",
        variant: "destructive",
      });
    },
  });

  const handleResendClick = (log: RecruitmentEmailLogItem) => {
    setPendingResendLog(log);
    setConfirmOpen(true);
  };

  const handleConfirmResend = () => {
    if (!pendingResendLog) return;
    resendMutation.mutate(pendingResendLog.id);
  };

  const handleConfirmOpenChange = (nextOpen: boolean) => {
    if (resendMutation.isPending) return;
    setConfirmOpen(nextOpen);
    if (!nextOpen) setPendingResendLog(null);
  };

  const logs = data?.logs ?? [];
  const hasHistoricalGap = data?.hasHistoricalGap ?? false;
  const hasLogs = !isLoading && !isError && logs.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex max-h-[85vh] flex-col gap-4",
            hasLogs
              ? "w-[min(98vw,64rem)] max-w-none"
              : "w-[min(92vw,52rem)] max-w-none min-h-[20rem]"
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-brand-amethyst" />
              Email delivery history
            </DialogTitle>
            <DialogDescription>
              {audienceDescription(audience)}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex min-h-[14rem] flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-amethyst" />
            </div>
          ) : isError ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                Could not load email history
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Something went wrong while fetching delivery logs.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => void refetch()}
              >
                Try again
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
              <Mail className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                {hasHistoricalGap
                  ? "No tracked emails for this candidate yet"
                  : "No emails recorded"}
              </p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {hasHistoricalGap
                  ? "Emails sent before delivery tracking was enabled are not shown here. New emails will appear automatically."
                  : "Emails will appear here once they are sent from the pipeline."}
              </p>
            </div>
          ) : (
            <RecruitmentEmailLogsTable
              logs={logs}
              onResendClick={handleResendClick}
            />
          )}
        </DialogContent>
      </Dialog>

      <RecruitmentEmailResendConfirmDialog
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
        loading={resendMutation.isPending}
        log={pendingResendLog}
        onConfirm={handleConfirmResend}
      />
    </>
  );
}
