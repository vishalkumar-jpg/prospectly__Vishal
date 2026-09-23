import { IntroductionStatus } from "../introductions.constants";

export const REQUESTER_ARCHIVE_ELIGIBLE_PIPELINE_STAGES = [
  "awaiting_connector",
  "awaiting_intro",
  "intro_sent",
] as const;

export type RequesterArchiveEligiblePipelineStage =
  (typeof REQUESTER_ARCHIVE_ELIGIBLE_PIPELINE_STAGES)[number];

/**
 * Maps DB status to the same pipeline stage label used by the requester pipeline API.
 */
export function resolveRequesterPipelineStage(status: string): string {
  if (status === IntroductionStatus.ARCHIVED) {
    return "archived";
  }
  const isPendingOrDeclined =
    status === IntroductionStatus.PENDING ||
    status === IntroductionStatus.DECLINED;
  const isAccepted = status === IntroductionStatus.ACCEPTED;
  if (isPendingOrDeclined) {
    return "awaiting_connector";
  }
  if (isAccepted) {
    return "awaiting_intro";
  }
  return status;
}

export function isRequesterArchiveEligiblePipelineStage(
  stage: string
): stage is RequesterArchiveEligiblePipelineStage {
  return (
    REQUESTER_ARCHIVE_ELIGIBLE_PIPELINE_STAGES as readonly string[]
  ).includes(stage);
}
