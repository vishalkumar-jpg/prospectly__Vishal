/** Getting Started preferred workspace cards (can be "both"). */
export type PreferredWorkspace = "recruiting" | "prospecting" | "both";

/** Active sidebar/header primary workspace (never "both"). */
export type PrimaryWorkspace = "recruiting" | "prospecting";

export const PREFERRED_WORKSPACE_OPTIONS: ReadonlyArray<{
  id: PreferredWorkspace;
  title: string;
  badge?: string;
  description: string;
}> = [
  {
    id: "recruiting",
    title: "Hire & refer talent",
    badge: "Recruiting",
    description:
      "Post jobs, refer people you know, or get discovered for a role.",
  },
  {
    id: "prospecting",
    title: "Get & give warm intros",
    badge: "Prospecting",
    description:
      "Request intros to people you want to reach, or introduce people you know and earn.",
  },
  {
    id: "both",
    title: "A bit of both",
    description: "Set me up for hiring and introductions — I'll explore both.",
  },
] as const;

export const PRIMARY_WORKSPACE_OPTIONS: ReadonlyArray<{
  id: PrimaryWorkspace;
  label: string;
}> = [
  { id: "recruiting", label: "Recruiting" },
  { id: "prospecting", label: "Prospecting" },
] as const;

export function isPreferredWorkspace(
  value: unknown
): value is PreferredWorkspace {
  return value === "recruiting" || value === "prospecting" || value === "both";
}

export function isPrimaryWorkspace(value: unknown): value is PrimaryWorkspace {
  return value === "recruiting" || value === "prospecting";
}

/**
 * Map preferred workspace + optional both-dropdown into primary workspace.
 * Single picks mirror into primary; "both" uses the dropdown.
 */
export function primaryFromPreferred(
  preferredWorkspace: PreferredWorkspace,
  bothPrimary: PrimaryWorkspace = "recruiting"
): PrimaryWorkspace {
  if (preferredWorkspace === "both") return bothPrimary;
  return preferredWorkspace;
}

/**
 * Effective primary workspace for nav/UI. Org without recruiting is always prospecting.
 */
export function resolvePrimaryWorkspace({
  storedPrimary,
  canAccessRecruiting,
}: {
  storedPrimary: PrimaryWorkspace | null | undefined;
  canAccessRecruiting: boolean;
}): PrimaryWorkspace {
  if (!canAccessRecruiting) return "prospecting";
  return storedPrimary ?? "recruiting";
}
