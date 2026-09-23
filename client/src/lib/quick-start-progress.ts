import { PATH_TOUR_IDS } from "./prospecting-quick-start/roles";
import { ROLE_TOUR_IDS } from "./recruiting-quick-start/roles";
import type {
  ProspectingPath,
  QuickStartContext,
  RecruitingRole,
} from "./recruiting-quick-start/types";
import {
  getDashboardModule,
  getProspectingPath,
  getRecruitingRole,
  isProspectingTourDoneForPath,
  isRecruitingTourDone,
} from "./quick-start-storage";

const RECRUITING_ROLES: RecruitingRole[] = [
  "recruiter",
  "connector",
  "candidate",
];

const PROSPECTING_PATHS: ProspectingPath[] = [
  "find-prospect",
  "complete-request",
  "opportunity",
];

function toPct(done: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function countRecruitingRoleDone(role: RecruitingRole): number {
  return ROLE_TOUR_IDS[role].filter((id) => isRecruitingTourDone(id, role))
    .length;
}

function countProspectingPathDone(path: ProspectingPath): number {
  return PATH_TOUR_IDS[path].filter((id) =>
    isProspectingTourDoneForPath(id, path)
  ).length;
}

function recruitingModuleTotals(): { done: number; total: number } {
  const total = RECRUITING_ROLES.reduce(
    (sum, role) => sum + ROLE_TOUR_IDS[role].length,
    0
  );
  const done = RECRUITING_ROLES.reduce(
    (sum, role) => sum + countRecruitingRoleDone(role),
    0
  );
  return { done, total };
}

function prospectingModuleTotals(): { done: number; total: number } {
  const total = PROSPECTING_PATHS.reduce(
    (sum, path) => sum + PATH_TOUR_IDS[path].length,
    0
  );
  const done = PROSPECTING_PATHS.reduce(
    (sum, path) => sum + countProspectingPathDone(path),
    0
  );
  return { done, total };
}

function recruitingModulePct(): number {
  const { done, total } = recruitingModuleTotals();
  return toPct(done, total);
}

function prospectingModulePct(): number {
  const { done, total } = prospectingModuleTotals();
  return toPct(done, total);
}

/**
 * Dashboard home (module picker): 50% recruiting + 50% prospecting.
 * Each module is 0–100% on its own tours, then averaged.
 */
export function dashboardCompletionPct(): number {
  return Math.round((recruitingModulePct() + prospectingModulePct()) / 2);
}

/** Progress for the dashboard panel based on which module is open. */
export function dashboardPanelCompletionPct(): number {
  const module = getDashboardModule();
  if (module === "recruiting") {
    return recruitingCompletionPct("dashboard");
  }
  if (module === "prospecting") {
    return prospectingCompletionPct();
  }
  return dashboardCompletionPct();
}

/** Recruiting module: one role when selected, otherwise all recruiting roles. */
export function recruitingCompletionPct(context: QuickStartContext): number {
  const role = getRecruitingRole();
  if (role) {
    const ids = ROLE_TOUR_IDS[role];
    const done = ids.filter((id) => isRecruitingTourDone(id, role)).length;
    return toPct(done, ids.length);
  }

  const { done, total } = recruitingModuleTotals();
  return toPct(done, total);
}

/** Prospecting module: one path when selected, otherwise all prospecting paths. */
export function prospectingCompletionPct(): number {
  const path = getProspectingPath();
  if (path) {
    const ids = PATH_TOUR_IDS[path];
    const done = ids.filter((id) =>
      isProspectingTourDoneForPath(id, path)
    ).length;
    return toPct(done, ids.length);
  }

  const { done, total } = prospectingModuleTotals();
  return toPct(done, total);
}

export function completionPctForContext(context: QuickStartContext): number {
  if (context === "dashboard") {
    return dashboardPanelCompletionPct();
  }
  return recruitingCompletionPct(context);
}
