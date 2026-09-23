import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ResendInviteConfirmDialog } from "@/components/contacts/resend-invite-confirm-dialog";
import {
  getInvitePlanBadgeClass,
  getInviteStatusBadgeClass,
} from "@/lib/invited-users-badges";
import type { ReferralProgressInvitedUser } from "@/hooks/useInvitedUsers";
import type { UseMutationResult } from "@tanstack/react-query";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { cn } from "@/lib/utils";
import { Mail, RefreshCw, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function getInviteStatusIcon({
  statusUpper,
}: {
  statusUpper: string;
}): LucideIcon {
  if (statusUpper === "ACCEPTED") return CheckCircle2;
  if (statusUpper === "EXPIRED") return XCircle;
  return Clock;
}

function getInviteStatusLabel({
  statusUpper,
  statusRaw,
}: {
  statusUpper: string;
  statusRaw: string;
}): string {
  if (statusUpper === "PENDING") return "Pending";
  if (statusUpper === "ACCEPTED") return "Accepted";
  if (statusUpper === "EXPIRED") return "Expired";
  return statusRaw;
}

export type InvitedUserRowProps = {
  invite: ReferralProgressInvitedUser;
  resendInviteMutation: UseMutationResult<
    { email: string; inviteLink: string },
    Error,
    string
  >;
};

export function InvitedUserRow({
  invite,
  resendInviteMutation,
}: InvitedUserRowProps) {
  const [resendConfirmOpen, setResendConfirmOpen] = useState(false);
  const statusRaw = invite.status ?? "PENDING";
  const statusUpper = statusRaw.toUpperCase();
  const acceptedAtDisplay = invite.acceptedAt;
  const canResend = Boolean(invite.contactId) && statusUpper !== "ACCEPTED";
  const isResendingThisRow =
    resendInviteMutation.isPending &&
    resendInviteMutation.variables === invite.contactId;

  const InviteStatusIcon = getInviteStatusIcon({ statusUpper });
  const statusLabel = getInviteStatusLabel({ statusUpper, statusRaw });

  const planLabel = invite.subscriptionPlan ?? "Unknown";
  const planStyleKey = invite.subscriptionPlan ?? "unknown";

  const handleResendConfirm = () => {
    if (!invite.contactId || resendInviteMutation.isPending) return;
    resendInviteMutation.mutate(invite.contactId, {
      onSuccess: () => setResendConfirmOpen(false),
    });
  };

  return (
    <>
      <TableRow className="group transition-colors border-b border-border/50 hover:bg-brand-amethyst/5">
        <TableCell className="py-4 sm:pl-6">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-foreground">
              {invite.fullName || "-"}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[240px]">
              {invite.email}
            </span>
          </div>
        </TableCell>
        <TableCell className="py-4 text-center align-middle">
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className={cn(
                "border-0 rounded-full font-bold text-xs px-2.5 py-1 whitespace-nowrap",
                getInvitePlanBadgeClass(planStyleKey)
              )}
            >
              {planLabel}
            </Badge>
          </div>
        </TableCell>

        <TableCell className="py-4">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatLocalizedShortDateTime(invite.invitedAt)}
          </span>
        </TableCell>
        <TableCell className="py-4 text-center align-middle">
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 border-0 rounded-full font-bold text-xs px-2.5 py-1 whitespace-nowrap",
                getInviteStatusBadgeClass(statusUpper)
              )}
            >
              <InviteStatusIcon className="h-3 w-3 shrink-0" />
              {statusLabel}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="py-4 min-w-[200px] whitespace-nowrap">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {acceptedAtDisplay != null && acceptedAtDisplay !== ""
              ? formatLocalizedShortDateTime(acceptedAtDisplay)
              : "—"}
          </span>
        </TableCell>
        <TableCell className="py-4 pl-4 pr-2 whitespace-nowrap">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {invite.expiresAt
              ? formatLocalizedShortDateTime(invite.expiresAt)
              : "—"}
          </span>
        </TableCell>
        <TableCell className="py-4 pl-2 pr-4 sm:pr-6 text-right whitespace-nowrap w-[1%]">
          {invite.contactId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl hover:bg-brand-amethyst/10 hover:text-brand-amethyst hover:border-brand-amethyst/20"
              disabled={!canResend || resendInviteMutation.isPending}
              onClick={() => setResendConfirmOpen(true)}
            >
              {isResendingThisRow ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  Resend
                </>
              )}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>

      {invite.contactId ? (
        <ResendInviteConfirmDialog
          open={resendConfirmOpen}
          onOpenChange={setResendConfirmOpen}
          loading={isResendingThisRow}
          inviteeName={invite.fullName}
          inviteeEmail={invite.email}
          onConfirm={handleResendConfirm}
        />
      ) : null}
    </>
  );
}
