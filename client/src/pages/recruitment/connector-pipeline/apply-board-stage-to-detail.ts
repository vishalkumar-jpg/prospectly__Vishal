import type { CandidateDetailResponse } from "@/lib/api/recruitment";
import type { ConnectorStage } from "./types";
import { JOB_BOARD_COLUMNS } from "./types";

const HIDE_PIPELINE_STAGES = new Set<ConnectorStage>([
  "not_qualified",
  "connector_declined",
  "rejected",
]);

const STAGE_LABEL_BY_ID = Object.fromEntries(
  JOB_BOARD_COLUMNS.map((col) => [col.id, col.label])
) as Record<ConnectorStage, string>;

/** Align modal status/pipeline with the kanban column the card was opened from. */
export function applyConnectorBoardStageToDetail(
  detail: CandidateDetailResponse,
  boardStage?: ConnectorStage,
  stageLabel?: string
): CandidateDetailResponse {
  if (!boardStage) return detail;

  const label =
    stageLabel ?? STAGE_LABEL_BY_ID[boardStage] ?? detail.stageLabel;

  if (HIDE_PIPELINE_STAGES.has(boardStage)) {
    return {
      ...detail,
      stage: boardStage,
      stageLabel: label,
      pipelineSteps: [],
    };
  }

  // Share-link applies in AI Analysis while evaluation runs — mirror the column.
  if (boardStage === "ai_analysis") {
    return {
      ...detail,
      stage: boardStage,
      stageLabel: label,
      pipelineSteps: [],
    };
  }

  if (boardStage === "consent_declined") {
    return {
      ...detail,
      stage: boardStage,
      stageLabel: label,
    };
  }

  return detail;
}
