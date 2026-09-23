import { X } from "lucide-react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface GapAnalysisDialogHeaderProps {
  onClose: () => void;
}

export function GapAnalysisDialogHeader({
  onClose,
}: GapAnalysisDialogHeaderProps) {
  return (
    <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-5 pb-4 pt-5 text-white max-sm:px-4 max-sm:pb-3 max-sm:pt-4 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative pr-10">
        <DialogTitle className="text-lg font-semibold leading-tight tracking-tight text-white">
          Gap Analysis
        </DialogTitle>
        <p className="mt-1.5 text-xs leading-relaxed text-white/85 max-sm:text-[11px]">
          AI-based comparison of the candidate&apos;s resume against this
          job&apos;s description.
        </p>
        <DialogDescription className="sr-only">
          Gap analysis results across six hiring dimensions.
        </DialogDescription>
      </div>
    </div>
  );
}
