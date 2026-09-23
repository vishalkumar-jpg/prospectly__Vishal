import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Loader2, Shield, UserCheck, X } from "lucide-react";

interface ShortlistConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  candidateLabel: string;
  onConfirm: () => void;
  isPending: boolean;
}

const SECTION_LABEL =
  "mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground";

export default function ShortlistConfirmDialog({
  open,
  onOpenChange,
  jobTitle,
  candidateLabel,
  onConfirm,
  isPending,
}: ShortlistConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg max-sm:rounded-none"
        mobileFullscreen
        hideCloseButton
      >
        {/* Brand hero header */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-6 py-5 text-white sm:px-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm">
              <UserCheck className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
              Confirm Shortlist
            </DialogTitle>
          </div>
          <DialogDescription className="relative mt-1.5 text-[13px] text-white/90 sm:pl-[56px]">
            Shortlisting is free — you are only charged when you hire.
          </DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <p className={SECTION_LABEL}>
            <FileText className="h-3.5 w-3.5" /> Review Details
          </p>
          <div className="border-b border-border py-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Job
            </p>
            <p className="text-sm font-extrabold text-foreground">{jobTitle}</p>
          </div>
          <div className="border-b border-border py-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Candidate
            </p>
            <p className="text-sm font-extrabold text-foreground">
              {candidateLabel}
            </p>
          </div>

          <div className="mt-4 flex gap-3 rounded-2xl border border-brand-sky/20 bg-brand-sky/10 p-4 text-[11.5px] leading-relaxed text-brand-sky">
            <Shield className="mt-px h-[18px] w-[18px] shrink-0" />
            <div>
              Candidate details remain anonymized after shortlisting. Full
              personal details are revealed only after the interview is
              scheduled.
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-border bg-background px-6 py-4 max-sm:[&>button]:flex-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Shortlist Candidate"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
