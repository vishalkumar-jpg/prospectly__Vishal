import { useCallback, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { CANDIDATE_SEARCH_PATH } from "@/constants/recruitment-routes";
import { useCandidateDetail } from "@/hooks/useCandidateDetail";
import { useCandidateResumeUrl } from "@/hooks/useCandidateResumeUrl";

import { ResumePreviewDialog } from "./components/ResumePreviewDialog";
import { CandidateSearchDetailView } from "./detail/CandidateSearchDetailView";

export default function CandidateSearchDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { candidate: detail, loading, error } = useCandidateDetail(candidateId);

  const goBack = useCallback(() => {
    navigate({ pathname: CANDIDATE_SEARCH_PATH, search: location.search });
  }, [navigate, location.search]);

  const {
    resumeUrl,
    resumeFileName,
    loading: resumeLoading,
    fetchResumeUrl,
  } = useCandidateResumeUrl(candidateId);

  const [showResumePreview, setShowResumePreview] = useState(false);

  const handlePreviewResume = useCallback(() => {
    setShowResumePreview(true);
    if (!resumeUrl) void fetchResumeUrl();
  }, [fetchResumeUrl, resumeUrl]);

  const handleOpenResume = useCallback(() => {
    if (resumeUrl) {
      window.open(resumeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const win = window.open("", "_blank");
    void fetchResumeUrl().then((url) => {
      if (!win) return;
      if (url) win.location.href = url;
      else win.close();
    });
  }, [fetchResumeUrl, resumeUrl]);

  if (!candidateId) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">Invalid candidate link.</p>
        <Button variant="outline" onClick={goBack}>
          Back to search
        </Button>
      </div>
    );
  }

  const notFound = !loading && (error != null || detail == null);

  return (
    <>
      <SEO title="Candidate Details | Prospectly" />

      <div className="space-y-6 px-2 py-4 sm:px-4 md:px-6">
        <Button
          type="button"
          variant="ghost"
          onClick={goBack}
          aria-label="Back to Candidate Search"
          className="group h-10 shrink-0 gap-2 rounded-xl py-0 pl-1.5 pr-3 text-brand-amethyst transition-all duration-200 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border border-brand-amethyst/30 bg-card shadow-sm transition-all duration-200 group-hover:-translate-x-0.5 group-hover:border-brand-amethyst/40">
            <ArrowLeft />
          </span>
          Candidate Search
        </Button>

        {notFound ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
            <p className="text-lg font-semibold">Candidate not found</p>
            <p className="max-w-md text-xs text-muted-foreground">
              This application may have been removed or you may not have access
              to it.
            </p>
            <Button variant="outline" onClick={goBack}>
              Back to search
            </Button>
          </div>
        ) : loading && !detail ? (
          <Loader message="Loading candidate details…" />
        ) : detail ? (
          <CandidateSearchDetailView
            detail={detail}
            onPreviewResume={handlePreviewResume}
            onOpenResume={handleOpenResume}
          />
        ) : null}
      </div>

      <ResumePreviewDialog
        open={showResumePreview}
        onOpenChange={setShowResumePreview}
        candidateName={detail?.revealedName ?? detail?.anonymousLabel ?? null}
        resumeFileName={resumeFileName ?? detail?.resumeFileName ?? null}
        resumeUrl={resumeUrl}
        loading={resumeLoading}
      />
    </>
  );
}
