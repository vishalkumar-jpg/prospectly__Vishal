import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useNotifyPreview,
  useSendJobNotification,
} from "@/hooks/useJobNotifications";
import type { RecruitmentJobListItem } from "@/lib/api/recruitment";
import OrgMultiSelect from "./OrgMultiSelect";

interface SendNotificationModalProps {
  job: RecruitmentJobListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SendNotificationModal({
  job,
  open,
  onOpenChange,
}: SendNotificationModalProps) {
  const { toast } = useToast();
  const [orgIds, setOrgIds] = useState<string[]>([]);
  const { recipientCount, loading: previewLoading } = useNotifyPreview(
    job?.id,
    orgIds
  );
  const sendMutation = useSendJobNotification();

  const handleOpenChange = (next: boolean) => {
    if (sendMutation.isPending) return;
    if (!next) setOrgIds([]);
    onOpenChange(next);
  };

  const handleSend = async () => {
    if (!job || orgIds.length === 0) return;
    try {
      await sendMutation.mutateAsync({
        jobId: job.id,
        organisationIds: orgIds,
      });
      toast({
        title: "Notification queued",
        description:
          "Members of the selected Organization will be emailed shortly.",
      });
      setOrgIds([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to send notification",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        mobileFullscreen
        hideCloseButton
      >
        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3.5 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Send className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                Send Notification
              </DialogTitle>
              <DialogDescription asChild>
                <div className="mt-1 text-[13px] leading-relaxed text-white/90">
                  Email members of selected Organization about{" "}
                  <span className="font-semibold text-white">{job?.title}</span>
                  .
                </div>
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-5 sm:p-6">
            <Label>Organization</Label>
            <OrgMultiSelect
              value={orgIds}
              onChange={setOrgIds}
              disabled={sendMutation.isPending}
            />

            {orgIds.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-sm text-blue-800">
                <Users className="h-4 w-4 shrink-0" />
                {previewLoading ? (
                  <span>Calculating recipients…</span>
                ) : recipientCount != null ? (
                  <span>
                    This will email{" "}
                    <strong>~{recipientCount.toLocaleString()}</strong> user
                    {recipientCount === 1 ? "" : "s"}.
                  </span>
                ) : (
                  <span>Recipient count unavailable.</span>
                )}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Members of the selected Organizations will be emailed. People
              notified in an earlier send may receive this again.
            </p>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={sendMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={orgIds.length === 0 || sendMutation.isPending}
              className="flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:flex-none"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {recipientCount != null && orgIds.length > 0
                    ? `Send to ${recipientCount.toLocaleString()} user${recipientCount === 1 ? "" : "s"}`
                    : "Send Notification"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
