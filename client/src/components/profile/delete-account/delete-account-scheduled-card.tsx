import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CancelDeletionConfirmDialog } from "./delete-account-confirm-dialog";

type DeleteAccountScheduledCardProps = {
  cancelOpen: boolean;
  onCancelOpenChange: (open: boolean) => void;
  cancelLoading: boolean;
  onConfirmCancel: () => void | Promise<void>;
};

export function DeleteAccountScheduledCard({
  cancelOpen,
  onCancelOpenChange,
  cancelLoading,
  onConfirmCancel,
}: DeleteAccountScheduledCardProps) {
  return (
    <>
      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-warning/15 text-brand-warning">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg font-extrabold tracking-tight">
                Account deletion scheduled
              </CardTitle>
              <CardDescription>
                Pending permanent removal within 24 hours
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="rounded-xl border border-amber-200/80 bg-amber-500/5 p-3 dark:border-amber-900/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">
              Scheduled deletion
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your access remains active until the scheduled deletion time,
              after which all personal data will be{" "}
              <span className="font-semibold text-foreground">
                permanently purged
              </span>
              . You can cancel this request before the process completes.
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onCancelOpenChange(true)}
              disabled={cancelLoading}
            >
              {cancelLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                "Cancel Account Deletion"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CancelDeletionConfirmDialog
        open={cancelOpen}
        onOpenChange={onCancelOpenChange}
        loading={cancelLoading}
        onConfirm={onConfirmCancel}
      />
    </>
  );
}
