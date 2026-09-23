import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { GapAnalysisPayload } from "@/lib/recruitment/gap-analysis.types";
import { GapAnalysisAccordion } from "./GapAnalysisAccordion";
import { GapAnalysisDialogHeader } from "./GapAnalysisDialogHeader";
import { GapAnalysisRail } from "./GapAnalysisRail";

interface GapAnalysisDialogProps {
  data: GapAnalysisPayload;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GapAnalysisDialog({
  data,
  open,
  onOpenChange,
}: GapAnalysisDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        mobileFullscreen
        hideCloseButton
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 max-sm:flex max-sm:h-full max-sm:max-h-full max-sm:overflow-hidden max-sm:w-full max-sm:max-w-full sm:max-w-[960px] sm:rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        <GapAnalysisDialogHeader onClose={() => onOpenChange(false)} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:pb-6 md:grid md:max-h-[calc(92vh-6rem)] md:grid-cols-[minmax(0,286px)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden">
          <GapAnalysisRail data={data} />
          <GapAnalysisAccordion data={data} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
