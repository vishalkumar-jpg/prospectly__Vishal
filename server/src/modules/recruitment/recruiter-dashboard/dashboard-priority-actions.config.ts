import type { RecruitmentStageKey } from "../recruitment-stage-keys.constants";
import type { PriorityActionItem } from "./recruiter-dashboard.response";

export type PriorityStageConfig = {
  stageKey: RecruitmentStageKey;
  type: PriorityActionItem["type"];
  priority: number;
  buildMessage: (count: number) => string;
};

export const PRIORITY_STAGE_CONFIGS: PriorityStageConfig[] = [
  {
    stageKey: "in_review",
    type: "new_applications",
    priority: 100,
    buildMessage: (count) =>
      `${count} new application${count === 1 ? "" : "s"} waiting for review`,
  },
  {
    stageKey: "interview_completed",
    type: "interview_feedback",
    priority: 95,
    buildMessage: (count) =>
      `${count} candidate${count === 1 ? "" : "s"} awaiting hire/reject decision`,
  },
  {
    stageKey: "shortlisted",
    type: "shortlisted_pending",
    priority: 90,
    buildMessage: (count) =>
      `${count} shortlisted candidate${count === 1 ? "" : "s"} — send interview invite`,
  },
  {
    stageKey: "interview_invite_sent",
    type: "interview_invite_pending",
    priority: 85,
    buildMessage: (count) =>
      `${count} candidate${count === 1 ? "" : "s"} awaiting interview scheduling`,
  },
  {
    stageKey: "interview_scheduled",
    type: "interview_scheduled",
    priority: 80,
    buildMessage: (count) =>
      `${count} interview${count === 1 ? "" : "s"} scheduled — follow up`,
  },
];

export const DRAFT_PRIORITY_ACTION = {
  type: "draft_ready" as const,
  count: 1,
  message: "Draft job ready to publish",
  priority: 70,
};
