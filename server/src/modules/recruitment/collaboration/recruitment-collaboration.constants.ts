/**
 * Single source of truth for recruitment collaboration access control.
 *
 * Every collaborator-gated action references a permission string from
 * RECRUITMENT_PERMISSIONS. The owner implicitly holds all of them; a
 * collaborator holds exactly the permissions on their admin-assigned role
 * (roles + role_permission, scoped by RECRUITING_COLLABORATION_MODULE).
 *
 * Roles/permissions are admin-managed master data.
 */

/** role_permission.module value scoping collaboration roles. */
export const RECRUITING_COLLABORATION_MODULE = "recruiting_collaboration";

/** Default role name assigned to a new collaborator when no roleId is provided. */
export const CANDIDATE_MANAGER_ROLE_NAME = "candidate_manager";

/** Full permission catalog. Services reference these constants, never literals. */
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

export const COLLABORATOR_STATUS = {
  ACTIVE: "active",
  REMOVED: "removed",
} as const;

/** Why a user id in a bulk-add request was not added. */
export const COLLABORATOR_SKIP_REASON = {
  IS_OWNER: "is_owner",
  NOT_ORG_MEMBER: "not_org_member",
  ALREADY_COLLABORATOR: "already_collaborator",
} as const;

export const RECRUITMENT_COLLABORATION_MESSAGES = {
  ERROR: {
    JOB_NOT_FOUND: "Job not found",
    FORBIDDEN: "You are not authorized to perform this action on this job",
    NOT_ORG_MEMBER:
      "The selected user is not a verified member of your organization",
    ALREADY_COLLABORATOR: "This user is already a collaborator on this job",
    CANNOT_ADD_OWNER: "The job owner cannot be added as a collaborator",
    CANDIDATE_NOT_FOUND: "Candidate not found",
    COLLABORATOR_NOT_FOUND: "Collaborator not found on this job",
    ROLE_NOT_FOUND: "The selected collaborator role does not exist",
  },
} as const;
