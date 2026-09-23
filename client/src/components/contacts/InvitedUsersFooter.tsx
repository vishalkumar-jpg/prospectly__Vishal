import { ResponsivePagination } from "@/components/ui/responsive-pagination";

export type InvitedUsersFooterProps = {
  totalInvitedUsers: number;
  invitedPage: number;
  totalInvitedPages: number;
  startIndexInvited: number;
  endIndexInvited: number;
  invitedLimit: number;
  onInvitedPageChange: (page: number) => void;
  onInvitedLimitChange: (limit: number) => void;
};

export function InvitedUsersFooter({
  totalInvitedUsers,
  invitedPage,
  totalInvitedPages,
  startIndexInvited,
  endIndexInvited,
  invitedLimit,
  onInvitedPageChange,
  onInvitedLimitChange,
}: InvitedUsersFooterProps) {
  if (totalInvitedUsers <= 0) {
    return null;
  }

  return (
    <ResponsivePagination
      currentPage={invitedPage}
      totalPages={totalInvitedPages}
      onPageChange={onInvitedPageChange}
      itemsPerPage={invitedLimit}
      totalItems={totalInvitedUsers}
      startIndex={startIndexInvited}
      endIndex={endIndexInvited}
      onItemsPerPageChange={(val) => onInvitedLimitChange(Number(val))}
      itemLabel="users"
      itemsPerPageSelectId="invited-items-per-page"
      itemsPerPageTestId="select-invited-items-per-page"
      prevTestId="button-invited-previous-page"
      nextTestId="button-invited-next-page"
      pageTestIdPrefix="button-invited-page"
    />
  );
}
