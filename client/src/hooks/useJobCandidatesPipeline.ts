import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type {
  JobPoolMatchCandidate,
  JobPoolUploadJobItem,
} from "@/lib/api/recruitment";
import type {
  ConnectorCandidate,
  InboxItem,
  InboxCandidate,
  InboxUploadJob,
} from "@/pages/recruitment/connector-pipeline/types";
import {
  shouldMaskAsAiAnalysisForAutoConsent,
  syncAutoConsentGraceMap,
  trackUploadAutoConsentSession,
} from "@/pages/recruitment/connector-pipeline/connector-upload-auto-consent-ui";

const JOB_CANDIDATES_KEY = "connector-job-board";
const POLL_INTERVAL_MS = 5000;

function toInboxItem(
  item: JobPoolMatchCandidate | JobPoolUploadJobItem
): InboxItem {
  if (item.type === "upload_job") {
    return item as InboxUploadJob;
  }
  const m = item as JobPoolMatchCandidate;
  return {
    type: "pool_match",
    matchId: m.matchId,
    contactId: m.contactId,
    status: m.status,
    source: m.source,
    failureReason: m.failureReason,
    candidateName: m.candidateName,
    candidateEmail: m.candidateEmail,
    candidateTitle: m.candidateTitle,
    candidateCompany: m.candidateCompany,
    matchScore: parseFloat(m.matchScore) || 0,
    cosineSimilarity: m.cosineSimilarity
      ? parseFloat(m.cosineSimilarity)
      : null,
    llmScore: m.llmScore ? parseFloat(m.llmScore) : null,
    matchedSignals: m.matchedSignals ?? [],
    concerns: m.concerns ?? [],
    consentDeclineReason: m.consentDeclineReason ?? null,
    consentDeclineNotes: m.consentDeclineNotes ?? null,
    connectorDeclineReason: m.connectorDeclineReason ?? null,
    connectorDeclinedAt: m.connectorDeclinedAt ?? null,
    consentRespondedAt: m.consentRespondedAt ?? null,
    matchedAt: m.matchedAt,
    isClaimedByOther: m.isClaimedByOther ?? false,
    linkedUploadJob: m.linkedUploadJob ?? null,
    resumeFileName: m.resumeFileName ?? null,
    gapAnalysis: m.gapAnalysis ?? null,
  } satisfies InboxCandidate;
}

/** True while AI analysis or connector-upload auto-consent is still settling. */
function isAnalyzing(
  items: InboxItem[],
  graceMap: Map<string, number>,
  seenProcessing: Set<string>
): boolean {
  return items.some((item) => {
    if (item.type === "upload_job") {
      return item.status === "queued" || item.status === "processing";
    }
    if (item.status === "processing") return true;
    return shouldMaskAsAiAnalysisForAutoConsent(item, graceMap, seenProcessing);
  });
}

export function useJobCandidatesPipeline(
  jobId: string | undefined,
  options?: { enabled?: boolean }
) {
  const enabled = (options?.enabled ?? true) && !!jobId;
  const autoConsentGraceRef = useRef(new Map<string, number>());
  const seenProcessingRef = useRef(new Set<string>());
  const uploadSessionActiveUntilRef = useRef(0);
  // Board reuses the same hook instance across /inbox/:jobId routes — clear
  // masking state before any render work so the previous job cannot leak.
  const trackedJobIdRef = useRef(jobId);
  if (trackedJobIdRef.current !== jobId) {
    trackedJobIdRef.current = jobId;
    autoConsentGraceRef.current.clear();
    seenProcessingRef.current.clear();
    uploadSessionActiveUntilRef.current = 0;
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [JOB_CANDIDATES_KEY, jobId],
    queryFn: () => api.recruitment.getConnectorJobBoard(jobId as string),
    enabled,
    refetchOnMount: "always",
    refetchInterval: (query) => {
      const items = (query.state.data?.poolItems ?? []).map(toInboxItem);
      trackUploadAutoConsentSession(
        items,
        seenProcessingRef.current,
        uploadSessionActiveUntilRef
      );
      syncAutoConsentGraceMap(
        items,
        autoConsentGraceRef.current,
        seenProcessingRef.current
      );
      return isAnalyzing(
        items,
        autoConsentGraceRef.current,
        seenProcessingRef.current
      )
        ? POLL_INTERVAL_MS
        : false;
    },
  });

  const poolItems: InboxItem[] = (data?.poolItems ?? []).map(toInboxItem);
  trackUploadAutoConsentSession(
    poolItems,
    seenProcessingRef.current,
    uploadSessionActiveUntilRef
  );
  syncAutoConsentGraceMap(
    poolItems,
    autoConsentGraceRef.current,
    seenProcessingRef.current
  );

  const shouldHideQualifiedFlash = useCallback(
    (item: InboxItem): boolean =>
      shouldMaskAsAiAnalysisForAutoConsent(
        item,
        autoConsentGraceRef.current,
        seenProcessingRef.current
      ),
    []
  );

  const referred: ConnectorCandidate[] = (data?.referred ?? []).map((item) => ({
    ...item,
    stage: item.stage as ConnectorCandidate["stage"],
    gapAnalysis: item.gapAnalysis as ConnectorCandidate["gapAnalysis"],
    isSplit: item.isSplit ?? false,
    inviteSentAt: item.inviteSentAt ?? null,
  }));

  return {
    jobTitle: data?.jobTitle ?? "",
    jobCompany: data?.jobCompany ?? "",
    jobLocation: data?.jobLocation ?? null,
    bountyAmount: data?.bountyAmount ?? "0",
    jobSalaryRangeMin: data?.jobSalaryRangeMin ?? "0",
    jobSalaryRangeMax: data?.jobSalaryRangeMax ?? "0",
    jobSalaryCurrency: data?.jobSalaryCurrency ?? null,
    jobSalaryPeriod: data?.jobSalaryPeriod ?? null,
    myReferCount: data?.myReferCount ?? 0,
    hasSharedLink: data?.hasSharedLink ?? false,
    connectorPayout: data?.connectorPayout,
    sharerPayout: data?.sharerPayout,
    poolItems,
    referred,
    loading: isLoading,
    error,
    refetch,
    shouldHideQualifiedFlash,
  };
}
