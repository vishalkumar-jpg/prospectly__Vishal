import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CandidateDetailModal from "@/components/recruitment/CandidateDetailModal";
import { useConnectorCandidateDetail } from "@/hooks/useConnectorCandidateDetail";
import { useConnectorCandidateResumeUrl } from "@/hooks/useConnectorCandidateResumeUrl";
import { useConnectorPoolMatchDetail } from "@/hooks/useConnectorPoolMatchDetail";
import { usePoolMatchResumeUrl } from "@/hooks/usePoolMatchResumeUrl";
import {
  openResumeHandoff,
  openResumeUrl,
} from "@/lib/recruitment/open-resume-handoff";
import { isHttpOrHttpsUrl, isPdfFile } from "@/lib/url-utils";
import type {
  ConnectorCandidate,
  ConnectorStage,
  InboxCandidate,
} from "./types";
import { applyConnectorBoardStageToDetail } from "./apply-board-stage-to-detail";
import {
  connectorToKanbanCandidate,
  inboxCandidateToKanban,
} from "./connector-candidate-detail.mappers";

type ConnectorCandidateDetailModalProps = {
  boardStage?: ConnectorStage;
  stageLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & (
  | { mode: "referred"; candidate: ConnectorCandidate | null }
  | { mode: "pool"; candidate: InboxCandidate | null }
);

export function ConnectorCandidateDetailModal(
  props: ConnectorCandidateDetailModalProps
) {
  const { open, onOpenChange, boardStage, stageLabel } = props;
  const [showResumePreview, setShowResumePreview] = useState(false);

  const referredCandidate = props.mode === "referred" ? props.candidate : null;
  const poolCandidate = props.mode === "pool" ? props.candidate : null;

  const candidateId =
    open && props.mode === "referred" ? referredCandidate?.id : undefined;
  const poolMatchId =
    open && props.mode === "pool" ? poolCandidate?.matchId : undefined;

  const { candidate: referredDetail, loading: referredLoading } =
    useConnectorCandidateDetail(candidateId);

  const { candidate: poolDetail, loading: poolLoading } =
    useConnectorPoolMatchDetail(poolMatchId);

  const rawDetail = props.mode === "referred" ? referredDetail : poolDetail;
  const detail = useMemo(
    () =>
      rawDetail
        ? applyConnectorBoardStageToDetail(rawDetail, boardStage, stageLabel)
        : null,
    [rawDetail, boardStage, stageLabel]
  );
  const loading = props.mode === "referred" ? referredLoading : poolLoading;

  const resumeFileNameKey =
    detail?.resumeFileName ??
    (props.mode === "referred"
      ? referredCandidate?.resumeFileName
      : poolCandidate?.resumeFileName) ??
    null;

  const kanbanCandidate = useMemo(() => {
    if (props.mode === "referred" && referredCandidate && detail) {
      return connectorToKanbanCandidate(referredCandidate, detail);
    }
    if (props.mode === "pool" && poolCandidate && detail) {
      return inboxCandidateToKanban(poolCandidate, detail);
    }
    return null;
  }, [props.mode, referredCandidate, poolCandidate, detail]);

  const referredResume = useConnectorCandidateResumeUrl(
    candidateId,
    resumeFileNameKey
  );
  const poolResume = usePoolMatchResumeUrl(poolMatchId, resumeFileNameKey);

  const {
    resumeUrl,
    resumeFileName: fetchedResumeFileName,
    loading: resumeLoading,
    error: resumeError,
    fetchResumeUrl,
  } = props.mode === "referred" ? referredResume : poolResume;

  const displayResumeFileName =
    detail?.resumeFileName ?? fetchedResumeFileName ?? "Resume.pdf";

  useEffect(() => {
    if (!open) {
      setShowResumePreview(false);
    }
  }, [open]);

  const handlePreviewResume = () => {
    setShowResumePreview(true);
    void fetchResumeUrl();
  };

  const handleOpenResume = () => {
    if (resumeUrl) {
      openResumeUrl(resumeUrl);
      return;
    }
    if (props.mode === "referred" && candidateId) {
      openResumeHandoff({ source: "connector-candidate", id: candidateId });
      return;
    }
    if (props.mode === "pool" && poolMatchId) {
      openResumeHandoff({ source: "pool-match", id: poolMatchId });
    }
  };

  const noop = () => undefined;

  return (
    <>
      <CandidateDetailModal
        open={open}
        onOpenChange={onOpenChange}
        candidate={kanbanCandidate}
        detail={detail ?? undefined}
        loading={loading}
        showActions={false}
        onReject={noop}
        onShortlist={noop}
        onScheduleInterview={noop}
        onResendInvite={noop}
        onPreviewResume={handlePreviewResume}
        onOpenResume={handleOpenResume}
      />

      <Dialog open={showResumePreview} onOpenChange={setShowResumePreview}>
        <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 p-0">
          <DialogHeader className="flex-shrink-0 border-b border-slate-200 px-6 py-4">
            <DialogTitle className="text-base">
              {displayResumeFileName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Resume preview
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
            {resumeError ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-destructive">
                Unable to load this resume. Please try again.
              </div>
            ) : resumeLoading && !resumeUrl ? (
              <div className="flex h-full items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading resume…
              </div>
            ) : resumeUrl &&
              isHttpOrHttpsUrl(resumeUrl) &&
              isPdfFile(resumeUrl, displayResumeFileName) ? (
              <iframe
                key={resumeUrl}
                src={`${resumeUrl}#toolbar=0`}
                className="h-full w-full border-0"
                title="Resume Preview"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Preview is not available for this file type.
                </p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleOpenResume}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Resume
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
