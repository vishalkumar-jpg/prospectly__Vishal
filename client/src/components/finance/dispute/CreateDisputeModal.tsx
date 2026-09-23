import { useForm, SubmitHandler } from "react-hook-form";
import { safeResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useDisputes } from "@/hooks/useDisputes";
import { DISPUTE_TYPES } from "@/types/dispute";
import { AnyType } from "@/types/common";
import { CreateDisputeForm } from "./CreateDisputeForm";
import { useToast } from "@/hooks/use-toast";
import { Flag, X } from "lucide-react";

const disputeSchema = z
  .object({
    introductionRequestId: z.string().min(1, "Please select an introduction"),
    disputeType: z.enum(DISPUTE_TYPES),
    priority: z.enum(["low", "medium", "high"]),
    reason: z
      .string()
      .min(50, "Reason must be at least 50 characters")
      .max(5000),
    expectedOutcome: z.string().max(1000).optional(),
    disputedAmount: z.preprocess(
      (a) => {
        if (a === "" || a === undefined) return undefined;
        const n = Number(a);
        return isNaN(n) ? undefined : n;
      },
      z
        .number({ message: "Amount is required" })
        .min(0.01, "Amount must be greater than 0")
        .max(99999999, "Amount cannot exceed 8 digits")
    ),
    requestedRefundAmount: z.preprocess(
      (a) => {
        if (a === "" || a === undefined) return undefined;
        const n = Number(a);
        return isNaN(n) ? undefined : n;
      },
      z
        .number({ message: "Amount is required" })
        .min(0, "Amount cannot be negative")
        .max(99999999, "Amount cannot exceed 8 digits")
    ),
  })
  .refine(
    (data) => {
      // Only refine if both are valid numbers
      if (
        data.disputedAmount === undefined ||
        data.requestedRefundAmount === undefined ||
        isNaN(data.disputedAmount) ||
        isNaN(data.requestedRefundAmount)
      ) {
        return true;
      }
      return data.requestedRefundAmount <= data.disputedAmount;
    },
    {
      message: "Refund requested cannot be greater than the disputed amount",
      path: ["requestedRefundAmount"],
    }
  );

type DisputeFormData = z.infer<typeof disputeSchema>;

interface CreateDisputeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateDisputeModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: CreateDisputeModalProps) {
  const { createDispute, isCreating } = useDisputes();
  const { toast } = useToast();

  const form = useForm<DisputeFormData>({
    resolver: safeResolver(disputeSchema),
    mode: "onChange",
    defaultValues: {
      introductionRequestId: "",
      disputeType: DISPUTE_TYPES[0],
      priority: "medium",
      reason: "",
      expectedOutcome: "",
      disputedAmount: undefined,
      requestedRefundAmount: undefined,
    },
  });

  const handleSubmit: SubmitHandler<DisputeFormData> = async (values) => {
    try {
      await createDispute(values as AnyType);
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: "Failed to create dispute",
        description:
          "Something went wrong while submitting your dispute. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (isCreating) return;
    if (!next) form.reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        mobileFullscreen
        hideCloseButton
      >
        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose
            disabled={isCreating}
            className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3.5 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Flag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                File a New Dispute
              </DialogTitle>
              <DialogDescription asChild>
                <div className="mt-1 text-[13px] leading-relaxed text-white/90">
                  Provide details about the issue you encountered. Mandatory
                  fields are marked with{" "}
                  <span className="font-semibold text-amber-200">*</span>.
                </div>
              </DialogDescription>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              <CreateDisputeForm />
            </div>

            <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isCreating}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:flex-none"
              >
                {isCreating ? "Submitting..." : "Submit Dispute"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
