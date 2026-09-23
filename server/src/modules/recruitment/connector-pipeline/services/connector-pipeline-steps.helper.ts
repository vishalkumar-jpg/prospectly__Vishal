import type { RecruiterPipelineStep } from "modules/recruitment/candidates/services/candidates-pipeline-steps.helper";

/** Connector-visible referral lifecycle (matches the job board columns). */
export const CONNECTOR_PIPELINE = [
  { key: "qualified", label: "Qualified" },
  { key: "consent_pending", label: "Consent Pending" },
  { key: "consent_accepted", label: "Consent Accepted" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview_invite_sent", label: "Interview Invite Sent" },
  { key: "interview_scheduled", label: "Interview Scheduled" },
  { key: "interview_completed", label: "Interview Completed" },
  { key: "hired", label: "Hired" },
] as const;

export type ConnectorPipelineStageKey =
  (typeof CONNECTOR_PIPELINE)[number]["key"];

const RECRUITER_TO_CONNECTOR_STAGE: Record<string, ConnectorPipelineStageKey> =
  {
    in_review: "consent_accepted",
    shortlisted: "shortlisted",
    interview_invite_sent: "interview_invite_sent",
    interview_scheduled: "interview_scheduled",
    interview_completed: "interview_completed",
    hired: "hired",
  };

const HIDE_PIPELINE_STAGES = new Set([
  "connector_declined",
  "rejected",
  "not_qualified",
]);

const TERMINAL_NEGATIVE_STAGES = new Set([
  "consent_declined",
  ...HIDE_PIPELINE_STAGES,
]);

/** Pool / board stages where the happy-path pipeline should not render. */
export function shouldHideConnectorPipeline(stage: string): boolean {
  return HIDE_PIPELINE_STAGES.has(stage);
}

/** Consent Declined: Qualified → Consent Pending → Consent Declined (with times). */
export function buildConsentDeclinedPipelineSteps(params: {
  matchedAt?: Date | null;
  consentSentAt?: Date | null;
  consentRespondedAt?: Date | null;
}): RecruiterPipelineStep[] {
  return [
    {
      step: "qualified",
      label: "Qualified",
      status: "completed",
      completedAt: params.matchedAt?.toISOString() ?? null,
    },
    {
      step: "consent_pending",
      label: "Consent Pending",
      status: "completed",
      completedAt: params.consentSentAt?.toISOString() ?? null,
    },
    {
      step: "consent_declined",
      label: "Consent Declined",
      status: "current",
      completedAt: params.consentRespondedAt?.toISOString() ?? null,
    },
  ];
}

export function mapPoolMatchStatusToConnectorStage(
  status: string
): ConnectorPipelineStageKey | "consent_declined" | "connector_declined" {
  switch (status) {
    case "consent_pending":
    case "consent_superseded":
      return "consent_pending";
    case "consent_accepted":
      return "consent_accepted";
    case "consent_declined":
      return "consent_declined";
    case "connector_declined":
      return "connector_declined";
    case "processing":
    case "failed":
      return "qualified";
    default:
      return "qualified";
  }
}

export function mapRecruiterStageToConnectorStage(
  stageKey: string | null
): ConnectorPipelineStageKey {
  if (!stageKey) return "consent_accepted";
  return RECRUITER_TO_CONNECTOR_STAGE[stageKey] ?? "consent_accepted";
}

type StageTimestampInput = {
  stageKey: string | null;
  createdAt: Date | null;
};

export function buildConnectorStageTimestamps(params: {
  matchedAt?: Date | null;
  consentSentAt?: Date | null;
  consentRespondedAt?: Date | null;
  candidateCreatedAt?: Date | null;
  stageHistoryRows?: StageTimestampInput[];
  currentStage?: string;
}): Partial<Record<ConnectorPipelineStageKey, Date>> {
  const {
    matchedAt,
    consentSentAt,
    consentRespondedAt,
    candidateCreatedAt,
    stageHistoryRows = [],
    currentStage,
  } = params;

  const map: Partial<Record<ConnectorPipelineStageKey, Date>> = {};

  if (matchedAt) map.qualified = matchedAt;
  if (consentSentAt) map.consent_pending = consentSentAt;
  if (consentRespondedAt) map.consent_accepted = consentRespondedAt;

  for (const row of stageHistoryRows) {
    if (!row.stageKey || !row.createdAt) continue;
    const connectorKey = RECRUITER_TO_CONNECTOR_STAGE[row.stageKey];
    if (connectorKey) {
      map[connectorKey] = row.createdAt;
    }
    if (row.stageKey === "in_review") {
      map.consent_accepted = row.createdAt;
    }
  }

  const fallback = candidateCreatedAt ?? matchedAt;
  if (fallback) {
    map.qualified ??= fallback;
  }

  if (currentStage) {
    const currentIndex = CONNECTOR_PIPELINE.findIndex(
      (s) => s.key === currentStage
    );
    if (currentIndex > 0 && fallback) {
      for (let i = 0; i < currentIndex; i++) {
        const { key } = CONNECTOR_PIPELINE[i];
        map[key] ??= fallback;
      }
    }
  }

  return map;
}

export function resolveConnectorPipelineCurrentStage(
  recruiterStageKey: string | null,
  stageHistoryRows: StageTimestampInput[]
): {
  currentStage: ConnectorPipelineStageKey;
  isRejected: boolean;
  lastReachedIndex: number;
} {
  const isRejected = recruiterStageKey === "rejected";

  if (!isRejected) {
    const currentStage = mapRecruiterStageToConnectorStage(recruiterStageKey);
    const lastReachedIndex = CONNECTOR_PIPELINE.findIndex(
      (s) => s.key === currentStage
    );
    return {
      currentStage,
      isRejected: false,
      lastReachedIndex: lastReachedIndex >= 0 ? lastReachedIndex : 0,
    };
  }

  let maxIndex = 0;
  for (const row of stageHistoryRows) {
    if (!row.stageKey || row.stageKey === "rejected") continue;
    if (row.stageKey === "in_review") {
      maxIndex = Math.max(
        maxIndex,
        CONNECTOR_PIPELINE.findIndex((s) => s.key === "consent_accepted")
      );
    }
    const connectorKey = RECRUITER_TO_CONNECTOR_STAGE[row.stageKey];
    if (connectorKey) {
      const idx = CONNECTOR_PIPELINE.findIndex((s) => s.key === connectorKey);
      if (idx >= 0) maxIndex = Math.max(maxIndex, idx);
    }
  }

  return {
    currentStage: CONNECTOR_PIPELINE[maxIndex]?.key ?? "consent_accepted",
    isRejected: true,
    lastReachedIndex: maxIndex,
  };
}

export function buildConnectorPipelineSteps(params: {
  currentStage: string;
  timestamps?: Partial<Record<ConnectorPipelineStageKey, Date>>;
  isRejected?: boolean;
  lastReachedIndex?: number;
}): RecruiterPipelineStep[] {
  const {
    currentStage,
    timestamps = {},
    isRejected = false,
    lastReachedIndex,
  } = params;

  const currentIndex = CONNECTOR_PIPELINE.findIndex(
    (s) => s.key === currentStage
  );
  const effectiveIndex =
    lastReachedIndex ?? (currentIndex >= 0 ? currentIndex : 0);

  return CONNECTOR_PIPELINE.map((stage, index) => {
    const completedAt = timestamps[stage.key]?.toISOString() ?? null;

    // Terminal rejected: freeze at last reached step — all completed, none current.
    if (isRejected) {
      if (index <= effectiveIndex) {
        return {
          step: stage.key,
          label: stage.label,
          status: "completed" as const,
          completedAt,
        };
      }
      return {
        step: stage.key,
        label: stage.label,
        status: "skipped" as const,
        completedAt: null,
      };
    }

    if (index < effectiveIndex) {
      return {
        step: stage.key,
        label: stage.label,
        status: "completed" as const,
        completedAt,
      };
    }

    if (index === effectiveIndex) {
      return {
        step: stage.key,
        label: stage.label,
        status: "current" as const,
        completedAt: null,
      };
    }

    return {
      step: stage.key,
      label: stage.label,
      status: "pending" as const,
      completedAt: null,
    };
  });
}

export function isConnectorTerminalNegative(stage: string): boolean {
  return TERMINAL_NEGATIVE_STAGES.has(stage);
}

export const CONNECTOR_STAGE_LABELS: Record<string, string> = {
  qualified: "Qualified",
  ai_analysis: "AI Analysis",
  consent_pending: "Consent Pending",
  consent_accepted: "Consent Accepted",
  shortlisted: "Shortlisted",
  interview_invite_sent: "Interview Invite Sent",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  hired: "Hired",
  consent_declined: "Consent Declined",
  rejected: "Rejected",
  connector_declined: "Not Referred",
  not_qualified: "Not Qualified",
  processing: "AI Analysis",
};
