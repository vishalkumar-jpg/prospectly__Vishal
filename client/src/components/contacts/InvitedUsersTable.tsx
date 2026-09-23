import { Input } from "@/components/ui/input";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvitedUsersTableBody } from "@/components/contacts/invited-users-table-body";
import { InvitedUsersFooter } from "@/components/contacts/InvitedUsersFooter";
import type { ReferralProgressInvitedUser } from "@/hooks/useInvitedUsers";
import type { UseMutationResult } from "@tanstack/react-query";
import { Search } from "lucide-react";

export type { InvitedUserRowProps } from "@/components/contacts/invited-user-row";
export type { InvitedUsersTableBodyProps } from "@/components/contacts/invited-users-table-body";
export type { InvitedUsersFooterProps } from "@/components/contacts/InvitedUsersFooter";

export type InvitedUsersTableProps = {
  invitedSearchTerm: string;
  onInvitedSearchTermChange: (value: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  paginatedInvitedUsers: ReferralProgressInvitedUser[];
  totalInvitedUsers: number;
  invitedPage: number;
  totalInvitedPages: number;
  startIndexInvited: number;
  endIndexInvited: number;
  invitedLimit: number;
  onInvitedPageChange: (page: number) => void;
  onInvitedLimitChange: (limit: number) => void;
  resendInviteMutation: UseMutationResult<
    { email: string; inviteLink: string },
    Error,
    string
  >;
};

export function InvitedUsersTable({
  invitedSearchTerm,
  onInvitedSearchTermChange,
  isLoading,
  isError,
  error,
  paginatedInvitedUsers,
  totalInvitedUsers,
  invitedPage,
  totalInvitedPages,
  startIndexInvited,
  endIndexInvited,
  invitedLimit,
  onInvitedPageChange,
  onInvitedLimitChange,
  resendInviteMutation,
}: InvitedUsersTableProps) {
  return (
    <div className="min-h-[400px] flex flex-col">
      <div className="p-4 sm:px-6 border-b border-border bg-muted/30">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search invited users"
            placeholder="Search invited users by name or email..."
            value={invitedSearchTerm}
            onChange={(e) => onInvitedSearchTermChange(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-card border-border"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:font-bold [&_th]:text-muted-foreground">
                <TableHead className="min-w-[200px] sm:pl-6">
                  Invited User
                </TableHead>
                <TableHead className="min-w-[140px] text-center align-middle">
                  Subscription Plan
                </TableHead>
                <TableHead className="min-w-[130px] whitespace-nowrap">
                  Invited On
                </TableHead>
                <TableHead className="min-w-[100px] text-center align-middle">
                  Status
                </TableHead>
                <TableHead className="min-w-[200px] whitespace-nowrap">
                  Accepted At
                </TableHead>
                <TableHead className="min-w-[118px] whitespace-nowrap pl-4 pr-2">
                  Expires At
                </TableHead>
                <TableHead className="w-[1%] min-w-[92px] whitespace-nowrap pl-2 pr-4 sm:pr-6 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <InvitedUsersTableBody
              isLoading={isLoading}
              isError={isError}
              error={error}
              invitedSearchTerm={invitedSearchTerm}
              paginatedInvitedUsers={paginatedInvitedUsers}
              resendInviteMutation={resendInviteMutation}
            />
          </Table>
        </div>

        <InvitedUsersFooter
          totalInvitedUsers={totalInvitedUsers}
          invitedPage={invitedPage}
          totalInvitedPages={totalInvitedPages}
          startIndexInvited={startIndexInvited}
          endIndexInvited={endIndexInvited}
          invitedLimit={invitedLimit}
          onInvitedPageChange={onInvitedPageChange}
          onInvitedLimitChange={onInvitedLimitChange}
        />
      </div>
    </div>
  );
}
