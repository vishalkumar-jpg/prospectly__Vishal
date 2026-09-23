export const JOB_CLOSE_NOTIFY_ALL_STAGES = "all" as const;

export const JOB_CLOSE_INDIVIDUAL_STAGE_OPTIONS = [
  { id: "in_review", label: "In Review" },
  { id: "not_qualified", label: "Not Qualified" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "interview_invite_sent", label: "Interview Invite Sent" },
  { id: "interview_scheduled", label: "Interview Scheduled" },
  { id: "interview_completed", label: "Interview Completed" },
] as const;

export const JOB_CLOSE_INDIVIDUAL_STAGE_KEYS =
  JOB_CLOSE_INDIVIDUAL_STAGE_OPTIONS.map((stage) => stage.id);

export const JOB_CLOSE_CANDIDATE_STAGE_OPTIONS = [
  { id: JOB_CLOSE_NOTIFY_ALL_STAGES, label: "All Stages" },
  ...JOB_CLOSE_INDIVIDUAL_STAGE_OPTIONS,
] as const;

export type JobCloseCandidateStageId =
  (typeof JOB_CLOSE_CANDIDATE_STAGE_OPTIONS)[number]["id"];

export function areAllJobCloseStagesSelected(value: string[]): boolean {
  return JOB_CLOSE_INDIVIDUAL_STAGE_KEYS.every((key) => value.includes(key));
}

export function areSomeJobCloseStagesSelected(value: string[]): boolean {
  return value.some((key) =>
    (JOB_CLOSE_INDIVIDUAL_STAGE_KEYS as readonly string[]).includes(key)
  );
}

export function expandJobCloseStageKeysFromApi(
  keys: string[] | undefined
): string[] {
  if (!keys?.length) return [];
  if (keys.includes(JOB_CLOSE_NOTIFY_ALL_STAGES)) {
    return [...JOB_CLOSE_INDIVIDUAL_STAGE_KEYS];
  }
  return keys.filter((key) => key !== JOB_CLOSE_NOTIFY_ALL_STAGES);
}

export function normalizeJobCloseStageKeysForApi(value: string[]): string[] {
  if (value.length === 0) return [];
  if (areAllJobCloseStagesSelected(value)) {
    return [JOB_CLOSE_NOTIFY_ALL_STAGES];
  }
  return value.filter((key) => key !== JOB_CLOSE_NOTIFY_ALL_STAGES);
}

export function getJobCloseStageTriggerLabel(value: string[]): string {
  if (value.length === 0) return "Select stages";

  if (areAllJobCloseStagesSelected(value)) {
    return "All Stages";
  }

  const selectedLabels = JOB_CLOSE_INDIVIDUAL_STAGE_OPTIONS.filter((stage) =>
    value.includes(stage.id)
  ).map((stage) => stage.label);

  if (selectedLabels.length === 0) return "Select stages";
  if (selectedLabels.length <= 2) return selectedLabels.join(", ");

  const visible = selectedLabels.slice(0, 2).join(", ");
  const remaining = selectedLabels.length - 2;
  return `${visible} +${remaining}`;
}
