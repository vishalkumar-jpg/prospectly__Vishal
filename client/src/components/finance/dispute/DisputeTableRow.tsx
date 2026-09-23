import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Eye,
  Calendar,
} from "lucide-react";
import { utcDayjs } from "@/lib/dayjs";
import {
  Dispute,
  DISPUTE_STATUS_LABELS,
  DISPUTE_TYPE_LABELS,
} from "@/types/dispute";

interface DisputeTableRowProps {
  dispute: Dispute;
  onViewDetails: (dispute: Dispute) => void;
}

export function DisputeTableRow({
  dispute,
  onViewDetails,
}: DisputeTableRowProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <Badge
            variant="outline"
            className="border-emerald-200/80 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-600 hover:text-emerald-50 hover:border-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-50 [&_svg]:text-current transition-colors"
          >
            <CheckCircle2 className="mr-1 h-3 w-3 shrink-0" />
            {DISPUTE_STATUS_LABELS[
              status as keyof typeof DISPUTE_STATUS_LABELS
            ] || status}
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="border-red-200/80 bg-red-500/10 text-red-700 hover:bg-red-600 hover:text-red-50 hover:border-red-600 dark:text-red-400 dark:hover:text-red-50 [&_svg]:text-current transition-colors"
          >
            <XCircle className="mr-1 h-3 w-3 shrink-0" />
            {DISPUTE_STATUS_LABELS[
              status as keyof typeof DISPUTE_STATUS_LABELS
            ] || status}
          </Badge>
        );
      case "under_review":
        return (
          <Badge
            variant="outline"
            className="border-blue-200/80 bg-blue-500/10 text-blue-700 hover:bg-blue-600 hover:text-blue-50 hover:border-blue-600 dark:text-blue-400 dark:hover:text-blue-50 [&_svg]:text-current transition-colors"
          >
            <Clock className="mr-1 h-3 w-3 shrink-0" />
            {DISPUTE_STATUS_LABELS[
              status as keyof typeof DISPUTE_STATUS_LABELS
            ] || status}
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-amber-200/80 bg-amber-500/10 text-amber-700 hover:bg-amber-600 hover:text-amber-50 hover:border-amber-600 dark:text-amber-400 dark:hover:text-amber-50 [&_svg]:text-current transition-colors"
          >
            <AlertCircle className="mr-1 h-3 w-3 shrink-0" />
            {DISPUTE_STATUS_LABELS[
              status as keyof typeof DISPUTE_STATUS_LABELS
            ] || status}
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge
            variant="outline"
            className="text-red-600 hover:bg-red-600 hover:text-red-50 border-red-200 bg-red-50"
          >
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="outline"
            className="text-amber-600 hover:bg-amber-600 hover:text-amber-50 border-amber-200 bg-amber-50"
          >
            Medium
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-blue-600 hover:bg-blue-600 hover:text-blue-50 border-blue-200 bg-blue-50"
          >
            Low
          </Badge>
        );
    }
  };

  return (
    <TableRow
      className="group transition-colors border-b border-border/50 hover:bg-brand-amethyst/5 cursor-pointer"
      onClick={() => onViewDetails(dispute)}
    >
      <TableCell className="py-4 pl-6">
        <div className="flex flex-col gap-0.5 max-w-[300px]">
          <span className="font-semibold text-foreground line-clamp-2 leading-snug">
            {dispute.introductionTitle ||
              "Meeting ID: " + dispute.introductionRequestId.substring(0, 8)}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {dispute.againstUserName || "N/A"}
            </span>
            {dispute.againstUserEmail && (
              <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">
                ({dispute.againstUserEmail})
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <span className="text-sm font-medium text-foreground">
          {DISPUTE_TYPE_LABELS[
            dispute.disputeType as keyof typeof DISPUTE_TYPE_LABELS
          ] || dispute.disputeType}
        </span>
      </TableCell>
      <TableCell className="py-4 text-center">
        <div className="flex justify-center">
          {getPriorityBadge(dispute.priority)}
        </div>
      </TableCell>
      <TableCell className="py-4 text-center">
        <div className="flex justify-center">
          {getStatusBadge(dispute.status)}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-md">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-sm font-semibold">
              {Number(dispute.disputedAmount || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {utcDayjs(dispute.createdAt).local().format("MMM D, YYYY")}
        </div>
      </TableCell>
      <TableCell className="text-right py-4 pr-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground transition-colors hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(dispute);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View Details</TooltipContent>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
