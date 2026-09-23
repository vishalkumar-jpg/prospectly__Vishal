import type { ConnectorStage } from "./types";

export function isBoardColumnVisible(
  stageId: ConnectorStage,
  selectedStages: ConnectorStage[]
): boolean {
  return selectedStages.length === 0 || selectedStages.includes(stageId);
}
