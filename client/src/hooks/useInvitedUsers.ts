import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { utcDayjs } from "@/lib/dayjs";

export type ReferralProgressInvitedUser = Awaited<
  ReturnType<typeof api.referrals.getProgress>
>["invitedUsers"][number];

export function useInvitedUsers(options: { inviteTabActive: boolean }) {
  const { inviteTabActive } = options;
  const queryClient = useQueryClient();

  const {
    data: referralProgress,
    refetch: refetchReferralProgress,
    isPending: isLoading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ["referrals", "progress"],
    queryFn: () => api.referrals.getProgress(),
  });

  const error: Error | null =
    queryError instanceof Error
      ? queryError
      : queryError != null
        ? new Error(String(queryError))
        : null;

  const resendInviteMutation = useMutation({
    mutationFn: (contactId: string) => api.invites.resend({ contactId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals", "progress"] });
      queryClient.invalidateQueries({ queryKey: ["leader-permissions"] });
      toast({
        title: "Invite resent",
        description: "A new invitation email with an updated link was sent.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Resend failed",
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (inviteTabActive) {
      void refetchReferralProgress();
    }
  }, [inviteTabActive, refetchReferralProgress]);

  const [invitedSearchTerm, setInvitedSearchTerm] = useState("");
  const [invitedPage, setInvitedPage] = useState(1);
  const [invitedLimit, setInvitedLimit] = useState(10);

  const filteredInvitedUsers = useMemo(
    () =>
      (referralProgress?.invitedUsers || []).filter(
        (invite) =>
          invite.fullName
            ?.toLowerCase()
            .includes(invitedSearchTerm.toLowerCase()) ||
          invite.email?.toLowerCase().includes(invitedSearchTerm.toLowerCase())
      ),
    [referralProgress?.invitedUsers, invitedSearchTerm]
  );

  const totalInvitedUsers = filteredInvitedUsers.length;
  const totalInvitedPages = Math.max(
    1,
    Math.ceil(totalInvitedUsers / invitedLimit)
  );
  const startIndexInvited = (invitedPage - 1) * invitedLimit;
  const endIndexInvited = Math.min(
    startIndexInvited + invitedLimit,
    totalInvitedUsers
  );

  const paginatedInvitedUsers = useMemo(
    () =>
      [...filteredInvitedUsers]
        .sort(
          (a, b) =>
            utcDayjs(b.invitedAt).valueOf() - utcDayjs(a.invitedAt).valueOf()
        )
        .slice(startIndexInvited, startIndexInvited + invitedLimit),
    [filteredInvitedUsers, invitedLimit, startIndexInvited]
  );

  useEffect(() => {
    setInvitedPage(1);
  }, [invitedSearchTerm]);

  useEffect(() => {
    const pages = Math.max(
      1,
      Math.ceil(filteredInvitedUsers.length / invitedLimit)
    );
    setInvitedPage((prev) => Math.max(1, Math.min(prev, pages)));
  }, [filteredInvitedUsers.length, invitedLimit]);

  return {
    referralProgress,
    refetchReferralProgress,
    isLoading,
    isError,
    error,
    resendInviteMutation,
    invitedSearchTerm,
    setInvitedSearchTerm,
    invitedPage,
    setInvitedPage,
    invitedLimit,
    setInvitedLimit,
    paginatedInvitedUsers,
    totalInvitedUsers,
    totalInvitedPages,
    startIndexInvited,
    endIndexInvited,
  };
}
