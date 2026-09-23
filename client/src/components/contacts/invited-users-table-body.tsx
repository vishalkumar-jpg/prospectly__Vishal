import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { InvitedUserRow } from "@/components/contacts/invited-user-row";
import type { ReferralProgressInvitedUser } from "@/hooks/useInvitedUsers";
import type { UseMutationResult } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Loader } from "../ui/loader";

export type InvitedUsersTableBodyProps = {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  invitedSearchTerm: string;
  paginatedInvitedUsers: ReferralProgressInvitedUser[];
  resendInviteMutation: UseMutationResult<
    { email: string; inviteLink: string },
    Error,
    string
  >;
};

export function InvitedUsersTableBody({
  isLoading,
  isError,
  error,
  invitedSearchTerm,
  paginatedInvitedUsers,
  resendInviteMutation,
}: InvitedUsersTableBodyProps) {
  if (isLoading) {
    return (
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell
            colSpan={7}
            className="text-center py-24 text-muted-foreground"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader />
              <p className="text-sm font-medium text-foreground">
                Loading invites…
              </p>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (isError) {
    return (
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="text-center py-24 text-destructive">
            <p className="text-sm font-medium">
              {error?.message ?? "Could not load invited users."}
            </p>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (!paginatedInvitedUsers || paginatedInvitedUsers.length === 0) {
    return (
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell
            colSpan={7}
            className="text-center py-24 text-muted-foreground"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                <Users className="h-8 w-8" />
              </div>
              <div className="text-base font-extrabold tracking-tight text-foreground">
                {invitedSearchTerm ? "No users found" : "No invites yet"}
              </div>
              <p className="max-w-[300px] text-sm text-muted-foreground">
                {invitedSearchTerm
                  ? "Try adjusting your search term."
                  : "Start inviting your contacts to grow your network and earn rewards."}
              </p>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {paginatedInvitedUsers.map((invite, idx) => (
        <InvitedUserRow
          key={`${invite.contactId ?? "no-contact"}-${invite.email}-${idx}`}
          invite={invite}
          resendInviteMutation={resendInviteMutation}
        />
      ))}
    </TableBody>
  );
}
