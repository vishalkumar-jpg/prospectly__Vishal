import { TOURS } from "./tours";
import type { RecruitingRole, Tour } from "./types";

export const ROLE_TOUR_IDS: Record<RecruitingRole, string[]> = {
  recruiter: ["postjob", "notify", "candidates", "money"],
  connector: ["refer", "share", "money"],
  candidate: ["applications", "money"],
};

export const ROLE_LABELS: Record<RecruitingRole, string> = {
  recruiter: "Recruiter",
  connector: "Connector",
  candidate: "Candidate",
};

export const MODULE_LABELS = {
  recruiting: "Recruiting",
  prospecting: "Prospecting",
} as const;

export function getToursForRole(role: RecruitingRole): Tour[] {
  const ids = ROLE_TOUR_IDS[role];
  return TOURS.filter((t) => ids.includes(t.id));
}
