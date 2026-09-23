import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { JobFormData } from "../types";
import LivePreviewPanel from "../LivePreviewPanel";

interface WizardPreviewDrawerProps {
  formData: JobFormData;
}

export default function WizardPreviewDrawer({
  formData,
}: WizardPreviewDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:sticky lg:top-2">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-brand-card">
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
          <Eye className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-extrabold text-foreground">Live Preview</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          See exactly how your job post will appear to candidates as you fill it
          in.
        </p>
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3.5 w-full gap-2 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
        >
          <Eye className="h-4 w-4" />
          Open Preview
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 bg-secondary p-0 sm:max-w-4xl lg:max-w-5xl"
        >
          <div className="flex items-center gap-2 border-b border-border bg-card px-5 py-4">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <SheetTitle className="text-base font-extrabold">
              Live Preview
            </SheetTitle>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <LivePreviewPanel formData={formData} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
