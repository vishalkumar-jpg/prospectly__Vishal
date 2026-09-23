import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RotateCcw } from "lucide-react";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { cn } from "@/lib/utils";
import type { RecruitmentEmailLogItem } from "@/lib/api/recruitment-email-logs";
import {
  formatEmailType,
  formatRecipientType,
  formatStatus,
  getEmailLogStatusBadgeClass,
} from "./recruitment-email-logs-modal.utils";

type RecruitmentEmailLogsTableProps = {
  logs: RecruitmentEmailLogItem[];
  onResendClick: (log: RecruitmentEmailLogItem) => void;
};

export function RecruitmentEmailLogsTable({
  logs,
  onResendClick,
}: RecruitmentEmailLogsTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="thin-scroll max-h-[min(52vh,32rem)] [&>div]:overflow-x-hidden">
        <Table className="w-full table-fixed bg-background">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[38%] px-3 py-3 text-xs font-semibold uppercase tracking-wide">
                Email
              </TableHead>
              <TableHead className="w-[16%] px-3 py-3 text-xs font-semibold uppercase tracking-wide">
                Sent to
              </TableHead>
              <TableHead className="w-[12%] px-3 py-3 text-xs font-semibold uppercase tracking-wide">
                Status
              </TableHead>
              <TableHead className="w-[20%] px-3 py-3 text-xs font-semibold uppercase tracking-wide">
                Sent
              </TableHead>
              <TableHead className="w-[14%] px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="hover:bg-muted/30">
                <TableCell className="overflow-hidden align-top px-3 py-3">
                  <p className="line-clamp-2 font-medium leading-snug text-foreground">
                    {log.subject ?? formatEmailType(log.emailType)}
                  </p>
                </TableCell>
                <TableCell className="align-top px-3 py-3 text-sm font-medium text-foreground/90">
                  {formatRecipientType(log.recipientType)}
                </TableCell>
                <TableCell className="align-top px-3 py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-medium capitalize",
                      getEmailLogStatusBadgeClass(log.status)
                    )}
                  >
                    {formatStatus(log.status)}
                  </Badge>
                </TableCell>
                <TableCell className="align-top px-3 py-3 text-xs leading-snug text-muted-foreground">
                  {log.sentAt ? formatLocalizedShortDateTime(log.sentAt) : "—"}
                </TableCell>
                <TableCell className="align-top px-2 py-3">
                  <div className="flex justify-center">
                    {log.canResend ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1 border-transparent bg-brand-gradient px-2.5 text-xs font-semibold text-brand-foreground shadow-brand-cta hover:-translate-y-px"
                        onClick={() => onResendClick(log)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                        Resend
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
