import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Loader2,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

/** Centered card on all breakpoints (matches resend invite confirm dialog). */
const DIALOG_SHELL_CLASS =
  "top-[50%] left-[50%] flex h-auto max-h-[min(92dvh,92vh)] w-[min(100%-2rem,32rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-xl";

const PRIMARY_CTA_CLASS =
  "bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg";

const DESTRUCTIVE_CTA_CLASS =
  "bg-destructive font-semibold text-destructive-foreground shadow-lg shadow-destructive/20 transition-all hover:bg-destructive/90";

type ModalHeroProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  loading?: boolean;
};

function ModalHero({
  icon: Icon,
  title,
  description,
  loading,
}: ModalHeroProps) {
  return (
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
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur sm:h-11 sm:w-11">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <AlertDialogTitle className="text-left text-lg font-extrabold tracking-tight text-white sm:text-xl">
            {title}
          </AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="mt-1 text-left text-xs leading-relaxed text-white/90 sm:text-[13px]">
              {description}
            </AlertDialogDescription>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card p-4 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

type DeleteAccountFinalConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: () => void | Promise<void>;
};

export function DeleteAccountFinalConfirmDialog({
  open,
  onOpenChange,
  loading,
  onConfirm,
}: DeleteAccountFinalConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={DIALOG_SHELL_CLASS}>
        <ModalHero
          icon={Trash2}
          loading={loading}
          title="Confirm Account Deletion?"
          description="Your account will be scheduled for permanent removal within 24 hours."
        />

        <div className="shrink-0 p-4 sm:p-5">
          <div className="rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">
              Scheduled Deletion
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              Sign in before the deadline to cancel. Billing records required
              for legal compliance may be retained with personal identity
              cleared.
            </p>
          </div>
        </div>

        <ModalFooter>
          <AlertDialogCancel disabled={loading} className="w-full sm:w-auto">
            Back
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className={cn("w-full sm:w-auto", DESTRUCTIVE_CTA_CLASS)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                Confirm Deletion
              </>
            )}
          </Button>
        </ModalFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type CancelDeletionConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: () => void | Promise<void>;
};

export function CancelDeletionConfirmDialog({
  open,
  onOpenChange,
  loading,
  onConfirm,
}: CancelDeletionConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={DIALOG_SHELL_CLASS}>
        <ModalHero
          icon={AlertTriangle}
          loading={loading}
          title="Cancel account deletion?"
          description="Your account and data will remain active. No data will be removed."
        />

        <ModalFooter>
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
                Processing…
              </>
            ) : (
              "Confirm cancellation"
            )}
          </Button>
        </ModalFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
