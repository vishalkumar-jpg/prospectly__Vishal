import type { ProspectingPath } from "../recruiting-quick-start/types";
import { TOURS } from "./tours";
import type { Tour } from "./types";

export const PATH_TOUR_IDS: Record<ProspectingPath, readonly string[]> = {
  "find-prospect": ["find-prospect", "track-request", "transactions"],
  "complete-request": ["fulfill-request", "transactions"],
  opportunity: ["opportunity", "transactions"],
};

export const PATH_LABELS: Record<ProspectingPath, string> = {
  "find-prospect": "Find Prospect",
  "complete-request": "Complete Request",
  opportunity: "Opportunity",
};

export const isProspectingPath = (
  value: string | null
): value is ProspectingPath =>
  value === "find-prospect" ||
  value === "complete-request" ||
  value === "opportunity";

export function getTourIdsForProspectingPath(
  path: ProspectingPath | null | undefined
): string[] {
  if (!path) return [];
  return [...PATH_TOUR_IDS[path]];
}

export function getToursForProspectingPath(
  path: ProspectingPath | null | undefined
): Tour[] {
  const ids = getTourIdsForProspectingPath(path);
  return ids
    .map((id) => TOURS.find((t) => t.id === id))
    .filter((t): t is Tour => Boolean(t));
}
