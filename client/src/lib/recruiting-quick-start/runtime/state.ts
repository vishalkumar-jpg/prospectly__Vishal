import { getTourIdsForProspectingPath } from "../../prospecting-quick-start/roles";
import { completionPctForContext } from "../../quick-start-progress";
import {
  getDashboardModule,
  getProspectingPath,
  getRecruitingRole,
  isRecruitingTourDone,
  loadQsStorage,
  markRecruitingTourDone,
  resetQsProgress,
  setDashboardModule,
  setRecruitingRole,
} from "../../quick-start-storage";
import { ROLE_TOUR_IDS } from "../roles";
import type {
  DashboardModule,
  QuickStartContext,
  RecruitingRole,
} from "../types";

export function loadState(): void {
  loadQsStorage();
}

export function saveState(): void {
  /* persisted via quick-start-storage on each mutation */
}

export function getState() {
  loadQsStorage();
  return {
    recruitingRole: getRecruitingRole(),
    dashboardModule: getDashboardModule(),
    prospectingPath: getProspectingPath(),
  };
}

export { setRecruitingRole, setDashboardModule };

export function resetState(): void {
  resetQsProgress();
}

export function markTourDone(
  tourId: string,
  role?: RecruitingRole | null
): void {
  markRecruitingTourDone(tourId, role);
}

export function isTourDone(
  tourId: string,
  role: RecruitingRole | null | undefined
): boolean {
  return isRecruitingTourDone(tourId, role);
}

function recruitingVisibleIds(context: QuickStartContext): string[] {
  const role = getRecruitingRole();
  const module = getDashboardModule();
  if (context === "dashboard") {
    if (module !== "recruiting" || !role) return [];
    return ROLE_TOUR_IDS[role];
  }
  if (!role) return [];
  return ROLE_TOUR_IDS[role];
}

function prospectingVisibleIds(): string[] {
  return getTourIdsForProspectingPath(getProspectingPath());
}

export function getVisibleTourIds(context: QuickStartContext): string[] {
  if (context === "dashboard" && getDashboardModule() === "prospecting") {
    return prospectingVisibleIds();
  }
  return recruitingVisibleIds(context);
}

export function completionPct(context: QuickStartContext): number {
  return completionPctForContext(context);
}

export type { DashboardModule, RecruitingRole };
