import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, Mail, RotateCcw } from "lucide-react";
import {
  RECRUITMENT_EMAIL_RECIPIENT_TYPE_LABELS,
  RECRUITMENT_EMAIL_TYPE_LABELS,
  type RecruitmentEmailLogItem,
} from "@/lib/api/recruitment-email-logs";

const PRIMARY_CTA_CLASS =
  "bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg";

type RecruitmentEmailResendConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  log: RecruitmentEmailLogItem | null;
  onConfirm: () => void | Promise<void>;
};

function formatEmailLabel(log: RecruitmentEmailLogItem) {
  return (
    log.subject ??
    RECRUITMENT_EMAIL_TYPE_LABELS[log.emailType] ??
    log.emailType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatRecipientLabel(recipientType: string) {
  return (
    RECRUITMENT_EMAIL_RECIPIENT_TYPE_LABELS[recipientType] ??
    recipientType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function RecruitmentEmailResendConfirmDialog({
  open,
  onOpenChange,
  loading,
  log,
  onConfirm,
}: RecruitmentEmailResendConfirmDialogProps) {
  const emailLabel = log ? formatEmailLabel(log) : "this email";
  const recipientLabel = log ? formatRecipientLabel(log.recipientType) : "Recipient";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (loading) return;
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <AlertDialogHeader className="space-y-1.5 border-b border-border px-5 py-4 text-left">
          <AlertDialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-amethyst/10 text-brand-amethyst">
              <RotateCcw className="h-4 w-4" aria-hidden />
            </span>
            Resend this email?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            Send the same email again. The new attempt will show up in this
            history once it is queued.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {log ? (
          <div className="space-y-3 px-5 py-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-amethyst" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Email
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">
                      {emailLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Sent to
                    </p>
                    <Badge
                      variant="outline"
                      className="h-5 border-brand-amethyst/20 bg-brand-amethyst/5 px-2 text-[11px] font-semibold text-brand-amethyst"
                    >
                      {recipientLabel}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <AlertDialogFooter className="gap-2 border-t border-border bg-muted/20 px-5 py-4 sm:space-x-2">
          <AlertDialogCancel disabled={loading} className="mt-0">
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className={cn(PRIMARY_CTA_CLASS)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                Resend
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
