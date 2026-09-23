export interface UpdateReferralProgressJobData {
  inviteId: string;
  acceptedUserId: string;
  senderUserId?: string; // For stateless invites
  planId?: string; // For stateless invites
  planName?: string; // For stateless invites
  email?: string; // For stateless invites
}

export interface VerifyContactsJobData {
  userId: string;
  planId: string;
}

export interface CheckThresholdsJobData {
  userId: string;
  planId: string;
}

export interface SendInviteEmailJobData {
  inviteId: string;
}
