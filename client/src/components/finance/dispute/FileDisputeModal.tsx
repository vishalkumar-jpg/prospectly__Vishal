import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type {
  IntroductionForDispute,
  DisputeType,
  DisputeCategory,
} from "@/types/dispute";
import { FileDisputeModalStep1 } from "./FileDisputeModalStep1";
import { FileDisputeModalStep2 } from "./FileDisputeModalStep2";

interface DisputeData {
  introductionRequestId: string;
  disputeType: DisputeType;
  disputeCategory: DisputeCategory;
  priority: "low" | "medium" | "high";
  reason: string;
  expectedOutcome: string | null;
  disputedAmount: number | string;
  requestedRefundAmount: number | null;
  againstUserId: string | null;
}

interface DisputeResponse {
  id: string;
  introductionRequestId: string;
  filedByUserId: string;
  disputeType: string;
  disputeCategory: string;
  priority: string;
  status: string;
  reason: string;
  expectedOutcome?: string | null;
  disputedAmount?: string | number;
  requestedRefundAmount?: string | number | null;
  againstUserId?: string | null;
  createdAt: string;
}

interface FileDisputeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  introductions: IntroductionForDispute[];
  onSubmit: (disputeData: DisputeData) => Promise<DisputeResponse>;
  submitting: boolean;
}

export function FileDisputeModal({
  open,
  onOpenChange,
  introductions,
  onSubmit,
  submitting,
}: FileDisputeModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedIntroduction, setSelectedIntroduction] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "requester" | "connector"
  >("all");

  const [disputeType, setDisputeType] = useState<DisputeType>(
    "payment_not_received"
  );
  const [description, setDescription] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [disputedAmount, setDisputedAmount] = useState("");
  const [requestedRefundAmount, setRequestedRefundAmount] = useState("");

  const introductionsList = Array.isArray(introductions) ? introductions : [];

  const selectedIntro = introductionsList.find(
    (i) => i.id === selectedIntroduction
  );

  const handleNext = () => {
    if (step === 1 && selectedIntroduction) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const getDisputeCategory = (type: DisputeType): DisputeCategory => {
    const categoryMap: Record<DisputeType, DisputeCategory> = {
      payment_not_received: "payment",
      bounty_incorrect: "payment",
      service_quality: "service",
      meeting_no_show: "service",
      meeting_cancelled: "service",
      unprofessional_conduct: "conduct",
      other: "technical",
    };
    return categoryMap[type];
  };

  const calculatePriority = (
    amount: number,
    type: DisputeType
  ): "low" | "medium" | "high" => {
    if (amount > 5000 || type === "payment_not_received") return "high";
    if (amount > 1000) return "medium";
    return "low";
  };

  const handleSubmit = async () => {
    if (!selectedIntro) return;

    const disputeData = {
      introductionRequestId: selectedIntro.id,
      disputeType: disputeType,
      disputeCategory: getDisputeCategory(disputeType),
      priority: calculatePriority(
        Number(selectedIntro.bountyAmount),
        disputeType
      ),
      reason: description,
      expectedOutcome: expectedOutcome || null,
      disputedAmount: disputedAmount ? parseFloat(disputedAmount) : 0,
      requestedRefundAmount: requestedRefundAmount
        ? parseFloat(requestedRefundAmount)
        : null,
      againstUserId:
        selectedIntro.userRole === "requester"
          ? selectedIntro.contactOwnerId
          : selectedIntro.requesterId,
    };

    try {
      await onSubmit(disputeData);
      setStep(1);
      setSelectedIntroduction("");
      setDisputeType("payment_not_received");
      setDescription("");
      setExpectedOutcome("");
      setDisputedAmount("");
      setRequestedRefundAmount("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit dispute. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Select Introduction" : "Dispute Details"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <FileDisputeModalStep1
            selectedIntroduction={selectedIntroduction}
            onSelectIntroduction={setSelectedIntroduction}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            introductions={introductionsList}
            onNext={handleNext}
            onCancel={() => onOpenChange(false)}
          />
        )}

        {step === 2 && selectedIntro && (
          <FileDisputeModalStep2
            selectedIntro={selectedIntro}
            disputeType={disputeType}
            onDisputeTypeChange={setDisputeType}
            description={description}
            onDescriptionChange={setDescription}
            expectedOutcome={expectedOutcome}
            onExpectedOutcomeChange={setExpectedOutcome}
            disputedAmount={disputedAmount}
            onDisputedAmountChange={setDisputedAmount}
            requestedRefundAmount={requestedRefundAmount}
            onRequestedRefundAmountChange={setRequestedRefundAmount}
            onBack={handleBack}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
