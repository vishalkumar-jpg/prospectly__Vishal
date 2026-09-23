import { ReferralProgress } from "database/schema";
import { utcDayjs, toUTC } from "utils/dayjs";
import type { AnyType } from "../../types/common";
import { INVITE_STATUS } from "../invites/invites.constants";

/**
 * API response shape for GET /referrals/progress (enriched invitedUsers).
 */
export function formatReferralProgressForListing(
  progress: ReferralProgress | null
): Record<string, unknown> {
  const empty = {
    totalInvitesSent: 0,
    totalInvitesAccepted: 0,
    acceptedUsers: [],
    invitedUsers: [],
    earnedCoupons: [],
  };

  if (!progress) {
    return empty;
  }

  const acceptedRaw = Array.isArray(progress.acceptedUsers)
    ? (progress.acceptedUsers as AnyType[])
    : [];
  const invitedRaw = Array.isArray(progress.invitedUsers)
    ? (progress.invitedUsers as AnyType[])
    : [];
  const now = toUTC();

  const enrichedInvited = invitedRaw.map((row: AnyType) => {
    const email = String(row.email || "").toLowerCase();
    const acceptedMatch = acceptedRaw.find(
      (a: AnyType) => String(a.email || "").toLowerCase() === email
    );

    let expiresAtDate: Date;
    if (row.expiresAt) {
      expiresAtDate = toUTC(utcDayjs(row.expiresAt));
    } else if (row.invitedAt) {
      expiresAtDate = toUTC(utcDayjs(row.invitedAt).add(24, "hour"));
    } else {
      expiresAtDate = now;
    }

    let status: string;
    let acceptedAt: string | null = null;

    if (acceptedMatch) {
      status = INVITE_STATUS.ACCEPTED;
      const rawAt = acceptedMatch.acceptedAt;
      if (rawAt) {
        acceptedAt =
          typeof rawAt === "string"
            ? rawAt
            : toUTC(utcDayjs(rawAt)).toISOString();
      }
    } else if (now.getTime() > expiresAtDate.getTime()) {
      status = INVITE_STATUS.EXPIRED;
    } else {
      status = INVITE_STATUS.PENDING;
    }

    return {
      ...row,
      status,
      acceptedAt,
      expiresAt: expiresAtDate.toISOString(),
    };
  });

  return {
    id: progress.id,
    userId: progress.userId,
    totalInvitesSent: progress.totalInvitesSent,
    totalInvitesAccepted: progress.totalInvitesAccepted,
    acceptedUsers: progress.acceptedUsers,
    invitedUsers: enrichedInvited,
    earnedCoupons: progress.earnedCoupons,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
  };
}
