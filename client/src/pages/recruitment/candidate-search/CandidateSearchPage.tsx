import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bookmark, SearchIcon } from "lucide-react";

import SEO from "@/components/SEO";
import { Loader } from "@/components/ui/loader";
import {
  candidateSearchDetailPath,
  POST_A_JOB_PATH,
} from "@/constants/recruitment-routes";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useCandidateSearch } from "@/hooks/useCandidateSearch";
import { useCandidateSearchCriteria } from "@/hooks/useCandidateSearchCriteria";
import { useCandidateResumeUrl } from "@/hooks/useCandidateResumeUrl";
import { useCandidateSearchFacets } from "@/hooks/useCandidateSearchFacets";
import { useRecruitmentStages } from "@/hooks/useRecruitmentMasterData";
import { useRecruitingHomeActivity } from "@/hooks/useWorkspaceHomeDestination";
import {
  savedSearchCriteria,
  useSavedSearches,
} from "@/hooks/useSavedSearches";
import type {
  CandidateSearchRow,
  ParsedJobDescription,
  SavedCandidateSearch,
} from "@/lib/api/recruitment-candidate-search";
import {
  mergeJobDescription,
  toRequestBody,
} from "@/lib/recruitment/candidate-search.criteria";

import { AllFiltersSheet } from "./components/AllFiltersSheet";
import { AppliedChips } from "./components/AppliedChips";
import { CandidateFilterRow } from "./components/CandidateFilterRow";
import { JdOriginBanner } from "./components/JdOriginBanner";
import { ResultsPanel } from "./components/ResultsPanel";
import { ResumePreviewDialog } from "./components/ResumePreviewDialog";
import { SaveSearchDialog } from "./components/SaveSearchDialog";
import { SavedSearchesCard } from "./components/SavedSearchesCard";
import { AdvancedSearchButton } from "./components/SearchBar";
import { SearchLaunchCard } from "./components/SearchLaunchCard";

/**
 * Nothing has been asked yet, so nothing is answered.
 *
 * Distinct from the results panel's own empty states: those say "your search
 * matched nobody", which is a claim this page has no basis to make before a
 * search has run.
 */
function StartYourSearch() {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
          <SearchIcon className="h-6 w-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-lg font-semibold">Start your search</p>
          <p className="mx-auto max-w-md text-xs text-muted-foreground">
            Add keywords, upload a job description, or apply filters to see
            matching candidates.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function CandidateSearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const recruitingActivity = useRecruitingHomeActivity(true);

  useEffect(() => {
    if (recruitingActivity.hasConfirmedNoPostedJobs) {
      navigate(POST_A_JOB_PATH, { replace: true });
    }
  }, [navigate, recruitingActivity.hasConfirmedNoPostedJobs]);

  const criteria = useCandidateSearchCriteria();
  const { applied, appliedCount } = criteria;

  const { facets, loading: facetsLoading } = useCandidateSearchFacets();
  const { stages } = useRecruitmentStages();
  const saved = useSavedSearches();

  /**
   * Whether a search has been asked for. A submitted query, any applied filter,
   * or a committed job description all count.
   *
   * Latched rather than derived from the current criteria. Deriving it meant
   * that removing your only filter — picking "All countries", say, or dropping
   * the last chip — took the count to zero and threw you back to the empty
   * state, wiping results you were in the middle of reading. Widening a search
   * is not the same as never having run one.
   *
   * Only "Clear all" resets it, because that is the one action that explicitly
   * says "start over". Latching also keeps the landing view from spending an
   * embedding call on a browse nobody asked for.
   */
  const [hasSearched, setHasSearched] = useState(false);
  const asked = appliedCount > 0 || applied.origin !== null;

  useEffect(() => {
    if (asked) setHasSearched(true);
  }, [asked]);

  const resetToLanding = useCallback(() => {
    criteria.clearAll();
    setHasSearched(false);
  }, [criteria]);

  const search = useCandidateSearch(applied, hasSearched);

  /**
   * Stage id → label + canonical `stage_key`. The key is what colours the badge
   * (one colour+icon pair per status app-wide), and only master data carries it
   * — `/facets` returns display values, so inferring a key from a label there
   * would invent a second, drifting palette.
   */
  const stageLabels = useMemo(
    () =>
      Object.fromEntries(
        stages.map((stage) => [
          stage.id,
          { label: stage.label, key: stage.stageKey },
        ])
      ) as Record<number, { label: string; key: string }>,
    [stages]
  );

  const [saveOpen, setSaveOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<CandidateSearchRow | null>(null);

  const {
    resumeUrl,
    resumeFileName,
    loading: resumeLoading,
    error: resumeError,
    fetchResumeUrl,
  } = useCandidateResumeUrl(previewRow?.id);

  const handleRetryResume = useCallback(async () => {
    try {
      await fetchResumeUrl();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load candidate resume:", err);
    }
  }, [fetchResumeUrl]);

  useEffect(() => {
    if (previewRow) void fetchResumeUrl();
  }, [previewRow, fetchResumeUrl]);

  /**
   * "No postings" is a property of the account, not of this search — deriving
   * it from an empty result set would show the onboarding empty state to a
   * recruiter whose filters merely excluded everyone.
   */
  const hasAnyPostings = (facets?.postings.length ?? 0) > 0;

  /**
   * jobId → posting title, from the same `/facets` payload the Scope filter
   * uses. Rows already carry `jobIds`; only the titles were missing, so this
   * costs no extra request and cannot disagree with the filter's own labels.
   */
  const postingLabels = useMemo(
    () =>
      Object.fromEntries(
        (facets?.postings ?? []).map((posting) => [
          posting.value,
          posting.label,
        ])
      ) as Record<string, string>,
    [facets?.postings]
  );

  const handleView = useCallback(
    (row: CandidateSearchRow) => {
      navigate({
        pathname: candidateSearchDetailPath(row.id),
        search: location.search,
      });
    },
    [location.search, navigate]
  );

  const handlePreviewResume = useCallback((row: CandidateSearchRow) => {
    setPreviewRow(row);
  }, []);

  const handleViewResumeInNewPage = useCallback(
    async (row: CandidateSearchRow) => {
      const win = window.open("", "_blank");
      if (!win) {
        toast({
          title: "Pop-up blocked",
          description:
            "Please allow popups for this site to open the resume in a new tab.",
        });
        return;
      }
      win.opener = null;
      try {
        const data = await queryClient.fetchQuery({
          queryKey: ["/api/recruitment/candidates", row.id, "resume"],
          queryFn: () => api.recruitment.getResumeUrl(row.id),
          staleTime: 8 * 60 * 1000,
        });
        if (data?.url) {
          win.location.href = data.url;
        } else {
          win.close();
          toast({
            title: "Resume not found",
            description: "No resume file is available for this candidate.",
            variant: "destructive",
          });
        }
      } catch {
        win.close();
        toast({
          title: "Failed to open resume",
          description: "Could not retrieve the resume for this candidate.",
          variant: "destructive",
        });
      }
    },
    [queryClient, toast]
  );

  /** Same commit path as the JD sheet — one route from a description to criteria. */
  const { applyCriteria } = criteria;
  const handleJobDescriptionParsed = useCallback(
    (parsed: ParsedJobDescription) => {
      applyCriteria(mergeJobDescription(applied, parsed));
    },
    [applyCriteria, applied]
  );

  const runSaved = saved.run;
  const handleRunSaved = useCallback(
    async (row: SavedCandidateSearch) => {
      const fresh = await runSaved.mutateAsync(row);
      // Wholesale, not merged: a saved search is the entire question, and
      // leaving the previous filters ANDed on top would answer a different one.
      applyCriteria(savedSearchCriteria(fresh));
    },
    [applyCriteria, runSaved]
  );

  const handleSave = useCallback(
    (title: string) => {
      saved.create.mutate(
        {
          title,
          // The wire shape, so a saved search and a live one are the same thing.
          criteria: toRequestBody(applied),
          source: applied.origin ? "job_description" : "advanced",
          ...(search.meta ? { resultCountAtSave: search.meta.total } : {}),
        },
        { onSuccess: () => setSaveOpen(false) }
      );
    },
    [applied, saved.create, search.meta]
  );

  const advancedTrigger = (
    <AllFiltersSheet
      open={criteria.isDrawerOpen}
      onOpenChange={(open) =>
        open ? criteria.openDrawer() : criteria.closeDrawer()
      }
      draft={criteria.draft}
      onDraftChange={criteria.setDraft}
      onApply={criteria.commitDraft}
      onClear={criteria.clearDraft}
      facets={facets}
      facetsLoading={facetsLoading}
      trigger={<AdvancedSearchButton count={criteria.filterGroupCount} />}
    />
  );

  if (
    !recruitingActivity.jobsStatsResolved ||
    recruitingActivity.hasConfirmedNoPostedJobs
  ) {
    return <Loader fullPage message="Loading your workspace…" />;
  }

  return (
    <div className="space-y-6 px-2 py-4 sm:px-4 md:px-6">
      <SEO title="Candidate Search | Prospectly" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* Gradient heading, matching every other recruitment page title. */}
          <h1 className="bg-brand-gradient bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Candidate Search
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search across all candidates, jobs, and organizations in your
            database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Only once there is a search to save — an empty one is not a search. */}
          {hasSearched ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveOpen(true)}
              className="gap-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
            >
              <Bookmark className="h-4 w-4" aria-hidden />
              Save search
            </Button>
          ) : null}
          {advancedTrigger}
        </div>
      </div>

      <SearchLaunchCard
        query={criteria.pendingQuery}
        onQueryChange={criteria.setQuery}
        onSubmit={criteria.submitQuery}
        onJobDescriptionParsed={handleJobDescriptionParsed}
      />

      <CandidateFilterRow
        onClearField={criteria.clearField}
        applied={applied}
        facets={facets}
        facetsLoading={facetsLoading}
        onToggle={criteria.toggleQuickFilter}
        onRangeChange={criteria.setRange}
        onClearAll={resetToLanding}
        hasFilters={hasSearched}
      />

      <SavedSearchesCard
        defaultOpen
        savedSearches={saved.savedSearches}
        loading={saved.loading}
        error={saved.error}
        onRetry={saved.refetch}
        onRun={handleRunSaved}
        runningId={
          saved.run.isPending ? (saved.run.variables?.id ?? null) : null
        }
        onToggleFavorite={(row) =>
          saved.toggleFavorite.mutate({
            id: row.id,
            isFavorite: !row.isFavorite,
          })
        }
        onDelete={(row) => saved.remove.mutate(row.id)}
        deleting={saved.remove.isPending}
      />

      {hasSearched ? (
        <ResultsPanel
          rows={search.rows}
          meta={search.meta}
          coverage={search.coverage}
          showFit={appliedCount > 0}
          degraded={search.degraded}
          truncated={search.truncated}
          isLoading={search.loading}
          error={search.error}
          onRetry={search.refetch}
          chips={
            <>
              <JdOriginBanner
                criteria={applied}
                onRemove={criteria.removeJobDescription}
              />
              <AppliedChips
                criteria={applied}
                facets={facets}
                onRemove={criteria.removeChip}
                onClearAll={resetToLanding}
              />
            </>
          }
          hasAnyPostings={hasAnyPostings}
          hasCriteria={search.hasCriteria}
          query={applied.query}
          stageLabels={stageLabels}
          postingLabels={postingLabels}
          filterJobIds={applied.jobIds}
          filterStageIds={applied.stageIds}
          onView={handleView}
          onPreviewResume={handlePreviewResume}
          onViewResumeInNewPage={handleViewResumeInNewPage}
          sort={applied.sort}
          sortDir={applied.sortDir}
          onSortChange={criteria.setSort}
          onSortColumn={criteria.toggleSortColumn}
          onPageChange={criteria.setPage}
          onPageSizeChange={criteria.setPageSize}
          onPostJob={() => navigate("/recruiting/post-a-job")}
          onClearFilters={resetToLanding}
        />
      ) : (
        <StartYourSearch />
      )}

      <SaveSearchDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        saving={saved.create.isPending}
        onSubmit={handleSave}
        summary={
          search.meta
            ? `${search.meta.total.toLocaleString()} candidate${search.meta.total === 1 ? "" : "s"} match right now.`
            : undefined
        }
      />

      <ResumePreviewDialog
        open={previewRow != null}
        onOpenChange={(open) => {
          if (!open) setPreviewRow(null);
        }}
        candidateName={previewRow?.name ?? null}
        resumeFileName={resumeFileName}
        resumeUrl={resumeUrl}
        loading={resumeLoading}
        error={resumeError}
        onRetry={handleRetryResume}
      />
    </div>
  );
}
