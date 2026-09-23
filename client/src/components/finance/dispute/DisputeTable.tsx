import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { Dispute } from "@/types/dispute";
import { PaginationInfo } from "@/hooks/useDisputes";
import { DisputeTableRow } from "./DisputeTableRow";
import { DisputeTablePagination } from "./DisputeTablePagination";
import { Loader } from "@/components/ui/loader";

interface DisputeTableProps {
  disputes: Dispute[];
  loading?: boolean;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onViewDetails: (dispute: Dispute) => void;
}

export function DisputeTable({
  disputes,
  loading,
  pagination,
  onPageChange,
  onLimitChange,
  onViewDetails,
}: DisputeTableProps) {
  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-md border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:font-bold [&>th]:text-muted-foreground">
              <TableHead className="w-[300px] pl-6">Introduction</TableHead>
              <TableHead className="w-[200px]">Dispute Type</TableHead>
              <TableHead className="w-[120px] text-center">Priority</TableHead>
              <TableHead className="w-[140px] text-center">Status</TableHead>
              <TableHead className="w-[140px]">Amount</TableHead>
              <TableHead className="w-[160px]">Filed Date</TableHead>
              <TableHead className="text-right w-[80px] pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader message="Loading disputes..." className="py-0" />
                </TableCell>
              </TableRow>
            ) : disputes.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      No disputes found.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              disputes.map((dispute) => (
                <DisputeTableRow
                  key={dispute.id}
                  dispute={dispute}
                  onViewDetails={onViewDetails}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DisputeTablePagination
        pagination={pagination}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    </div>
  );
}
