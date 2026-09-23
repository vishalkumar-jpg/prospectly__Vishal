import { prospectingCompletionPct } from "../../quick-start-progress";
import {
  getProspectingPath,
  isProspectingTourDone,
  loadQsStorage,
  markProspectingTourDone,
  resetQsProgress,
} from "../../quick-start-storage";

export function loadState(): void {
  loadQsStorage();
}

export function saveState(): void {
  /* persisted via quick-start-storage */
}

export function getState() {
  return { prospectingPath: getProspectingPath() };
}

export function resetState(): void {
  resetQsProgress();
}

export function markTourDone(id: string): void {
  markProspectingTourDone(id, getProspectingPath());
}

export function completionPct(): number {
  return prospectingCompletionPct();
}

export { isProspectingTourDone as isTourDoneForProspecting };
