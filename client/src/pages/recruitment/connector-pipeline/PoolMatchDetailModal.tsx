import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isHttpOrHttpsUrl, isPdfFile } from "@/lib/url-utils";
import { formatDateTime } from "@/utils/dateFormatter";
import { CandidateGapAnalysisSummary } from "@/components/recruitment/gap-analysis/CandidateGapAnalysisSummary";
import {
  resolveGapAnalysisForInbox,
  resolveInboxFallbackSignals,
} from "@/lib/recruitment/gap-analysis-resolve";
import { usePoolMatchResumeUrl } from "@/hooks/usePoolMatchResumeUrl";
import { getMatchScoreBadgeClass } from "@/lib/recruitment/match-score-colors";
import type { InboxCandidate } from "./types";
import {
  Briefcase,
  Building2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";

interface PoolMatchDetailModalProps {
  candidate: InboxCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageLabel?: string;
}

export function PoolMatchDetailModal({
  candidate,
  open,
  onOpenChange,
  stageLabel,
}: PoolMatchDetailModalProps) {
  const [showResumePreview, setShowResumePreview] = useState(false);
  const matchId = open ? candidate?.matchId : undefined;
  const resumeFileNameKey =
    candidate?.resumeFileName ?? candidate?.linkedUploadJob?.fileName ?? null;
  const {
    resumeUrl,
    resumeFileName: fetchedResumeFileName,
    loading: resumeLoading,
    fetchResumeUrl,
  } = usePoolMatchResumeUrl(matchId, resumeFileNameKey);

  if (!candidate) return null;

  const gapData = resolveGapAnalysisForInbox(candidate);
  const fallbackSignals = resolveInboxFallbackSignals(candidate);
  const matchScore = Math.round(candidate.matchScore);
  const displayResumeFileName =
    candidate.resumeFileName ??
    candidate.linkedUploadJob?.fileName ??
    fetchedResumeFileName ??
    "Resume.pdf";
  const hasResume =
    candidate.source === "connector_uploaded" ||
    Boolean(candidate.resumeFileName || candidate.linkedUploadJob?.fileName);

  const handlePreviewResume = () => {
    setShowResumePreview(true);
    void fetchResumeUrl();
  };

  const handleOpenResume = () => {
    void fetchResumeUrl().then((url) => {
      if (url && isHttpOrHttpsUrl(url)) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          mobileFullscreen
          hideCloseButton
          className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl max-sm:rounded-none"
        >
          <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-5 pb-4 pt-5 text-white sm:px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
            />
            <DialogClose className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 sm:right-4 sm:top-4">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>

            <div className="relative pr-10 sm:pr-12">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/20 text-sm font-extrabold backdrop-blur-sm sm:h-12 sm:w-12 sm:text-base">
                  {candidate.candidateName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-2.5 sm:gap-y-1.5">
                    <DialogTitle className="truncate text-base font-extrabold leading-tight tracking-tight text-white sm:text-lg">
                      {candidate.candidateName}
                    </DialogTitle>
                    {stageLabel ? (
                      <span className="inline-flex items-center rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:px-2.5 sm:text-[10px]">
                        {stageLabel}
                      </span>
                    ) : null}
                    {matchScore > 0 ? (
                      <Badge
                        className={cn(
                          "border-0 text-[10px] sm:text-xs",
                          getMatchScoreBadgeClass(matchScore)
                        )}
                      >
                        {matchScore}% Match
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <DialogDescription className="sr-only">
                Candidate match details and resume preview.
              </DialogDescription>
              {candidate.candidateTitle ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/95 sm:mt-1.5 sm:text-[13px]">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{candidate.candidateTitle}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-app p-5 sm:p-6">
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="mb-3.5 flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-brand-amethyst" />
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Contact Details
                  </p>
                </div>
                <dl className="grid gap-x-8 gap-y-3.5 sm:grid-cols-3">
                  <div className="min-w-0">
                    <dt className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <UserRound className="h-3 w-3" />
                      Name
                    </dt>
                    <dd className="mt-1 truncate text-sm font-semibold text-foreground">
                      {candidate.candidateName}
                    </dd>
                  </div>
                  {candidate.candidateEmail ? (
                    <div className="min-w-0">
                      <dt className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        Email
                      </dt>
                      <dd className="mt-1 break-all text-sm font-semibold text-foreground">
                        {candidate.candidateEmail}
                      </dd>
                    </div>
                  ) : null}
                  {candidate.candidateCompany ? (
                    <div className="min-w-0">
                      <dt className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        Company
                      </dt>
                      <dd className="mt-1 truncate text-sm font-semibold text-foreground">
                        {candidate.candidateCompany}
                      </dd>
                    </div>
                  ) : null}
                  {candidate.matchedAt ? (
                    <div className="min-w-0">
                      <dt className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Processed
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">
                        {formatDateTime(candidate.matchedAt)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {(gapData || fallbackSignals) && (
                <CandidateGapAnalysisSummary
                  data={gapData}
                  fallbackSignals={fallbackSignals}
                  legacyMatchScore={candidate.matchScore}
                />
              )}

              {candidate.status === "connector_declined" &&
              candidate.connectorDeclineReason ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Decline reason
                  </p>
                  <p className="text-sm text-slate-700">
                    {candidate.connectorDeclineReason}
                  </p>
                  {candidate.connectorDeclinedAt ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Declined {formatDateTime(candidate.connectorDeclinedAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {hasResume ? (
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Resume
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-brand-rose">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {displayResumeFileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.source === "connector_uploaded"
                          ? "Uploaded resume"
                          : "Candidate resume"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isPdfFile(null, displayResumeFileName) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-brand-amethyst hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                          onClick={handlePreviewResume}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-brand-amethyst hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                        onClick={handleOpenResume}
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResumePreview} onOpenChange={setShowResumePreview}>
        <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 p-0">
          <DialogHeader className="flex-shrink-0 border-b border-slate-200 px-6 py-4">
            <DialogTitle className="text-base">
              {displayResumeFileName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Resume preview for {candidate.candidateName}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
            {resumeLoading && !resumeUrl ? (
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
