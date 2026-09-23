import type { AnyType } from "../../types/common";

/** Incoming keys that are not undefined/null overwrite; other fields preserved on existing row */
export function shallowMergeInviteRow(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out;
}

/** Last row wins per normalized email */
export function dedupeSerializedInvitedUsersByEmail(
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  const byEmail = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const key = String(row.email || "")
      .trim()
      .toLowerCase();
    byEmail.set(key, row);
  }
  return Array.from(byEmail.values());
}

export function mergeInvitedRowsWithUpsert(
  currentInvitedUsers: AnyType[],
  serializedInvitedUsersDedup: Record<string, unknown>[]
): { merged: AnyType[]; newCount: number } {
  const newInvitedUsers = [...currentInvitedUsers];
  let newCount = 0;

  for (const invitedUser of serializedInvitedUsersDedup) {
    const emailKey = String(invitedUser.email).trim().toLowerCase();
    const idx = newInvitedUsers.findIndex(
      (u: AnyType) =>
        String(u.email || "")
          .trim()
          .toLowerCase() === emailKey
    );
    if (idx === -1) {
      newInvitedUsers.push(invitedUser);
      newCount++;
    } else {
      const existing = newInvitedUsers[idx] as Record<string, unknown>;
      newInvitedUsers[idx] = shallowMergeInviteRow(
        existing,
        invitedUser
      ) as AnyType;
    }
  }

  return { merged: newInvitedUsers, newCount };
}
