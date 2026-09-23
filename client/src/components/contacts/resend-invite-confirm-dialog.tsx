import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Mail, X } from "lucide-react";

/** Overrides AlertDialogContent grid/fullscreen; centered card sized to content. */
const DIALOG_SHELL_CLASS =
  "top-[50%] left-[50%] flex h-auto max-h-[min(92dvh,92vh)] w-[min(100%-2rem,32rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-xl";

const PRIMARY_CTA_CLASS =
  "bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg";

type ResendInviteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  inviteeName?: string | null;
  inviteeEmail: string;
  onConfirm: () => void | Promise<void>;
};

export function ResendInviteConfirmDialog({
  open,
  onOpenChange,
  loading,
  inviteeName,
  inviteeEmail,
  onConfirm,
}: ResendInviteConfirmDialogProps) {
  const displayName = inviteeName?.trim() || inviteeEmail || "this contact";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={DIALOG_SHELL_CLASS}>
        <div className="relative shrink-0 overflow-hidden rounded-t-2xl bg-brand-hero-gradient p-5 text-white sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <AlertDialogCancel
            disabled={loading}
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg border-0 bg-white/15 p-0 text-white shadow-none transition-colors hover:bg-white/25 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </AlertDialogCancel>
          <div className="relative flex items-start gap-3 pr-9">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Mail className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle className="text-left text-lg font-extrabold tracking-tight text-white">
                Resend invitation?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1 break-words text-left text-xs leading-relaxed text-white/90 sm:text-[13px]">
                We&apos;ll send a new invite email to{" "}
                <span className="font-semibold">{inviteeEmail}</span>.
              </AlertDialogDescription>
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 sm:p-5">
          <div className="rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">
              Before you resend
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              A fresh invitation will be sent to{" "}
              <span className="font-semibold text-foreground">
                {displayName}
              </span>
              . The previous link may still work until it expires.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card p-4 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={loading} className="w-full sm:w-auto">
            Back
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className={cn("w-full sm:w-auto", PRIMARY_CTA_CLASS)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                Resend invitation
              </>
            )}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
