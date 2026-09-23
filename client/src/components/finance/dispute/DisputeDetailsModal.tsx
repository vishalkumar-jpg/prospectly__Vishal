import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import type { Dispute } from "@/types/dispute";
import { DisputeDetailsContent } from "./DisputeDetailsContent";

interface DisputeDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispute: Dispute | null;
}

export function DisputeDetailsModal({
  open,
  onOpenChange,
  dispute,
}: DisputeDetailsModalProps) {
  if (!dispute) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "under_review":
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(dispute.status)}
            Dispute Details
          </DialogTitle>
        </DialogHeader>

        <DisputeDetailsContent dispute={dispute} />
      </DialogContent>
    </Dialog>
  );
}
