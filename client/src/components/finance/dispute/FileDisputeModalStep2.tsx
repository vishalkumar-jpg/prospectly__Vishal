import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { safeResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Form } from "@/components/ui/form";
import type { IntroductionForDispute, DisputeType } from "@/types/dispute";
import { DISPUTE_TYPES } from "@/types/dispute";
import { FileDisputeModalStep2Summary } from "./FileDisputeModalStep2Summary";
import { FileDisputeModalStep2Form } from "./FileDisputeModalStep2Form";

const step2Schema = z
  .object({
    disputeType: z.enum(DISPUTE_TYPES),
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
        .number({ message: "Disputed amount is required" })
        .min(0.01, "Disputed amount must be greater than 0")
        .max(99999999, "Disputed amount cannot exceed 8 digits")
    ),
    requestedRefundAmount: z.preprocess(
      (a) => {
        if (a === "" || a === undefined) return undefined;
        const n = Number(a);
        return isNaN(n) ? undefined : n;
      },
      z
        .number({ message: "Requested refund amount is required" })
        .min(0, "Requested refund amount cannot be negative")
        .max(99999999, "Requested refund amount cannot exceed 8 digits")
    ),
  })
  .refine((data) => data.requestedRefundAmount <= data.disputedAmount, {
    message:
      "Refund requested amount cannot be greater than the disputed amount",
    path: ["requestedRefundAmount"],
  });

type Step2FormData = z.infer<typeof step2Schema>;

interface FileDisputeModalStep2Props {
  selectedIntro: IntroductionForDispute;
  disputeType: DisputeType;
  onDisputeTypeChange: (type: DisputeType) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  expectedOutcome: string;
  onExpectedOutcomeChange: (value: string) => void;
  disputedAmount: string;
  onDisputedAmountChange: (value: string) => void;
  requestedRefundAmount: string;
  onRequestedRefundAmountChange: (value: string) => void;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

export function FileDisputeModalStep2({
  selectedIntro,
  disputeType,
  onDisputeTypeChange,
  description,
  onDescriptionChange,
  expectedOutcome,
  onExpectedOutcomeChange,
  disputedAmount,
  onDisputedAmountChange,
  requestedRefundAmount,
  onRequestedRefundAmountChange,
  onBack,
  onCancel,
  onSubmit,
  submitting,
}: FileDisputeModalStep2Props) {
  const form = useForm<Step2FormData>({
    resolver: safeResolver(step2Schema),
    mode: "onChange",
    defaultValues: {
      disputeType: disputeType,
      reason: description,
      expectedOutcome: expectedOutcome || undefined,
      disputedAmount: disputedAmount ? Number(disputedAmount) : undefined,
      requestedRefundAmount: requestedRefundAmount
        ? Number(requestedRefundAmount)
        : undefined,
    },
  });

  // Sync form values with parent callbacks
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "disputeType" && value.disputeType) {
        onDisputeTypeChange(value.disputeType);
      }
      if (name === "reason" && value.reason !== undefined) {
        onDescriptionChange(value.reason);
      }
      if (name === "expectedOutcome") {
        onExpectedOutcomeChange(value.expectedOutcome || "");
      }
      if (name === "disputedAmount") {
        onDisputedAmountChange(
          value.disputedAmount === undefined ? "" : String(value.disputedAmount)
        );
      }
      if (name === "requestedRefundAmount") {
        onRequestedRefundAmountChange(
          value.requestedRefundAmount === undefined
            ? ""
            : String(value.requestedRefundAmount)
        );
      }
    });
    return () => subscription.unsubscribe();
  }, [
    form,
    onDisputeTypeChange,
    onDescriptionChange,
    onExpectedOutcomeChange,
    onDisputedAmountChange,
    onRequestedRefundAmountChange,
  ]);

  // Sync props to form when they change externally
  useEffect(() => {
    form.setValue("disputeType", disputeType);
  }, [disputeType, form]);

  useEffect(() => {
    form.setValue("reason", description);
  }, [description, form]);

  useEffect(() => {
    form.setValue("expectedOutcome", expectedOutcome || undefined);
  }, [expectedOutcome, form]);

  useEffect(() => {
    form.setValue(
      "disputedAmount",
      disputedAmount ? Number(disputedAmount) : undefined
    );
  }, [disputedAmount, form]);

  useEffect(() => {
    form.setValue(
      "requestedRefundAmount",
      requestedRefundAmount ? Number(requestedRefundAmount) : undefined
    );
  }, [requestedRefundAmount, form]);

  const handleSubmit = form.handleSubmit(() => {
    onSubmit();
  });

  return (
    <Form {...form}>
      <div className="space-y-4">
        <FileDisputeModalStep2Summary selectedIntro={selectedIntro} />

        <FileDisputeModalStep2Form />

        <div className="flex justify-between gap-2 pt-4">
          <Button variant="outline" onClick={onBack} disabled={submitting}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
            >
              {submitting ? "Filing..." : "File Dispute"}
            </Button>
          </div>
        </div>
      </div>
    </Form>
  );
}
