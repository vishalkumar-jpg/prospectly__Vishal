import { SetMetadata } from "@nestjs/common";
import { RecruitmentPermission } from "modules/recruitment/collaboration/recruitment-collaboration.constants";

export const REQUIRE_RECRUITMENT_PERMISSION_KEY =
  "requireRecruitmentPermission";

export interface RequireRecruitmentPermissionMeta {
  /** Required permission, or null to require only "any access" to the job. */
  permission: RecruitmentPermission | null;
  /** Whether the route param identifies a job or a candidate. */
  from: "job" | "candidate";
  /** Route param name. Defaults to "jobId" (job) / "candidateId" (candidate). */
  param?: string;
}

interface RequirePermissionOptions {
  from?: "job" | "candidate";
  param?: string;
}

/**
 * Declares the recruitment permission required to access a route. Enforced by
 * `RecruitmentPermissionGuard` (global), which resolves the job from the route
 * param via `RecruitmentAccessService` and attaches the result to the request.
 *
 * @param permission permission string, or `null` for "any access" (owner OR an
 *   active collaborator) without a specific permission (e.g. job detail).
 */
export const RequirePermission = (
  permission: RecruitmentPermission | null,
  options: RequirePermissionOptions = {}
) =>
  SetMetadata<string, RequireRecruitmentPermissionMeta>(
    REQUIRE_RECRUITMENT_PERMISSION_KEY,
    {
      permission,
      from: options.from ?? "job",
      param: options.param,
    }
  );
