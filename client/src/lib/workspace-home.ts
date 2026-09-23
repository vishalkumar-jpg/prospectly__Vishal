import { RECRUITER_DASHBOARD_PATH } from "@/constants/recruitment-routes";
import type { PrimaryWorkspace } from "@/lib/workspace-focus";

export type WorkspaceHomeDestination = {
  path: string;
  label: string;
};

/**
 * Home destination after Getting Started / landing CTA / header focus switch.
 * Prospecting → prospecting dashboard.
 * Recruiting with ≥1 posted job (owner or collaborator) → recruiting dashboard.
 * Recruiting without jobs → job marketplace (connector default).
 */
export function resolveWorkspaceHomeDestination({
  primary,
  hasPostedJobs,
}: {
  primary: PrimaryWorkspace;
  hasPostedJobs: boolean;
}): WorkspaceHomeDestination {
  if (primary === "prospecting") {
    return { path: "/dashboard", label: "Go to Dashboard" };
  }

  if (hasPostedJobs) {
    return {
      path: RECRUITER_DASHBOARD_PATH,
      label: "Go to Dashboard",
    };
  }

  return {
    path: "/recruiting/job-marketplace",
    label: "Go to Job Marketplace",
  };
}
