/**
 * Mirror of the server's recruitment permission catalog
 * (server/src/modules/recruitment/collaboration/recruitment-collaboration.constants.ts).
 *
 * UI gating only — the backend remains the source of truth and returns 403 if a
 * permission is missing. Owners receive every permission from the API.
 */
export const RECRUITMENT_PERMISSIONS = {
  CANDIDATE_VIEW: "candidate.view",
  CANDIDATE_SHORTLIST: "candidate.shortlist",
  CANDIDATE_REJECT: "candidate.reject",
  CANDIDATE_INTERVIEW_INVITE: "candidate.interview_invite",
  CANDIDATE_MARK_OUTCOME: "candidate.mark_outcome",
  CANDIDATE_HIRE: "candidate.hire",
  CANDIDATE_CLASSIFY: "candidate.classify",
  PAYOUT_RELEASE: "payout.release",
  JOB_EDIT: "job.edit",
  JOB_CLOSE: "job.close",
  COLLABORATOR_MANAGE: "collaborator.manage",
} as const;

export type RecruitmentPermission =
  (typeof RECRUITMENT_PERMISSIONS)[keyof typeof RECRUITMENT_PERMISSIONS];

/** True if `permissions` (from the job detail response) includes `permission`. */
export function hasPermission(
  permissions: string[] | undefined,
  permission: RecruitmentPermission
): boolean {
  return Boolean(permissions?.includes(permission));
}

/** Human-readable labels for permission strings (UI display only). */
export const PERMISSION_LABELS: Record<string, string> = {
  [RECRUITMENT_PERMISSIONS.CANDIDATE_VIEW]: "View candidates",
  [RECRUITMENT_PERMISSIONS.CANDIDATE_SHORTLIST]: "Shortlist",
  [RECRUITMENT_PERMISSIONS.CANDIDATE_REJECT]: "Reject",
  [RECRUITMENT_PERMISSIONS.CANDIDATE_INTERVIEW_INVITE]: "Send interview invite",
  [RECRUITMENT_PERMISSIONS.CANDIDATE_MARK_OUTCOME]: "Mark interview outcome",
  [RECRUITMENT_PERMISSIONS.CANDIDATE_HIRE]: "Hire",
  [RECRUITMENT_PERMISSIONS.CANDIDATE_CLASSIFY]: "Edit classification",
  [RECRUITMENT_PERMISSIONS.PAYOUT_RELEASE]: "Release payout",
  [RECRUITMENT_PERMISSIONS.JOB_EDIT]: "Edit job",
  [RECRUITMENT_PERMISSIONS.JOB_CLOSE]: "Close job",
  [RECRUITMENT_PERMISSIONS.COLLABORATOR_MANAGE]: "Manage collaborators",
};

/** Friendly label for a permission string; falls back to prettifying the raw value. */
export function permissionLabel(permission: string): string {
  return (
    PERMISSION_LABELS[permission] ??
    permission.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Prettify an admin role name, e.g. "candidate_manager" -> "Candidate Manager". */
export function prettifyRoleName(name: string): string {
  return name.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
