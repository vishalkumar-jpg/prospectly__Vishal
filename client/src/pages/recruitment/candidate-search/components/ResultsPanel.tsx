import type { ReactNode } from "react";
import { AlertTriangle, Briefcase, Info, SearchX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  CandidateSearchCoverage,
  CandidateSearchMeta,
  CandidateSearchRow,
} from "@/lib/api/recruitment-candidate-search";
import type { CandidateSearchSort } from "@/lib/recruitment/candidate-search.criteria";
import { CandidateCard } from "./CandidateCard";
import { CandidateRow, STICKY_ACTIONS_COL } from "./CandidateRow";
import { CandidateSearchPagination } from "./CandidateSearchPagination";
import { PostingStageCell } from "./PostingStageCell";
import { resolveVisiblePostingStages } from "./posting-stage.shared";
import { ResultsToolbar, type SortDirection } from "./ResultsToolbar";
import { SortableColumnHead } from "./SortableColumnHead";

const HEAD = "h-9 border-b px-3 text-[10px] uppercase tracking-wider";

function NoticeBar({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 border-b px-3 py-2 text-xs",
        tone === "warning"
          ? "bg-brand-warning/10 text-brand-warning"
          : "bg-brand-sky/10 text-brand-sky"
      )}
    >
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-semibold">{title}</p>
        <p className="mx-auto max-w-md text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

/** Five rows shaped like real ones — avatar circle plus four bars (§9.5). */
function LoadingRows() {
  return (
    <div className="divide-y" aria-busy="true" aria-label="Loading candidates">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 p-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="hidden h-3 w-32 sm:block" />
          <Skeleton className="hidden h-3 w-24 md:block" />
          <Skeleton className="hidden h-3 w-20 lg:block" />
        </div>
      ))}
    </div>
  );
}

export interface ResultsPanelProps {
  rows: CandidateSearchRow[];
  meta: CandidateSearchMeta | null;
  coverage: CandidateSearchCoverage | null;
  /** True when any criterion is applied — gates Match % and Why (§6.2). */
  showFit: boolean;
  degraded: boolean;
  truncated: boolean;
  isLoading: boolean;
  error: unknown;
  /** Re-runs the same query; the applied criteria are untouched. */
  onRetry: () => void;
  /** AppliedChips, owned by the page. Absent from the DOM when empty. */
  chips?: ReactNode;

  /** Which of the three empty messages applies (§7.7). */
  hasAnyPostings: boolean;
  hasCriteria: boolean;
  query: string | null;

  /**
   * stageId -> its label and canonical stage_key. One map, not two parallel
   * ones: the badge needs both and they must always describe the same stage.
   */
  stageLabels: Record<number, { label: string; key: string }>;

  /**
   * jobId → posting title, resolved from the same facets payload by the page.
   * Rows carry `jobIds` already; this only supplies the names, so the column
   * costs no request and cannot drift from the Scope filter's labels.
   */
  postingLabels: Record<string, string>;
  /** Applied scope/stage filters — hide non-matching application lines only. */
  filterJobIds: string[];
  filterStageIds: number[];
  onView: (row: CandidateSearchRow) => void;
  onPreviewResume: (row: CandidateSearchRow) => void;
  onViewResumeInNewPage: (row: CandidateSearchRow) => void;

  sort: CandidateSearchSort;
  sortDir: SortDirection;
  onSortChange: (sort: CandidateSearchSort, dir: SortDirection) => void;
  onSortColumn: (sort: CandidateSearchSort) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;

  onPostJob?: () => void;
  onClearFilters?: () => void;
}

export function ResultsPanel({
  rows,
  meta,
  coverage,
  showFit,
  degraded,
  truncated,
  isLoading,
  error,
  onRetry,
  chips,
  hasAnyPostings,
  hasCriteria,
  query,
  stageLabels,
  postingLabels,
  filterJobIds,
  filterStageIds,
  onView,
  onPreviewResume,
  onViewResumeInNewPage,
  sort,
  sortDir,
  onSortChange,
  onSortColumn,
  onPageChange,
  onPageSizeChange,
  onPostJob,
  onClearFilters,
}: ResultsPanelProps) {
  /**
   * A posting soft-deleted since indexing has no label — drop it rather than
   * link the recruiter to a page that no longer exists.
   */
  const applicationsFor = (row: CandidateSearchRow) => {
    const applications =
      row.applications.length > 0
        ? row.applications
        : row.jobIds.map((jobId) => ({
            id: `${row.id}:${jobId}`,
            jobId,
            stageId: row.stageId,
          }));
    return resolveVisiblePostingStages(
      applications,
      postingLabels,
      stageLabels,
      filterJobIds,
      filterStageIds
    );
  };

  const stageKeyForActions = (row: CandidateSearchRow) =>
    row.stageId == null ? null : (stageLabels[row.stageId]?.key ?? null);

  return (
    <section className="rounded-xl border bg-card">
      {chips}

      {degraded ? (
        <NoticeBar>
          AI ranking is temporarily unavailable — showing keyword matches.
        </NoticeBar>
      ) : null}

      {truncated ? (
        <NoticeBar tone="warning">
          Showing the top matches only — narrow your filters to see the rest.
        </NoticeBar>
      ) : null}

      <ResultsToolbar
        total={meta?.total ?? rows.length}
        coverage={coverage}
        sort={sort}
        sortDir={sortDir}
        onSortChange={onSortChange}
        showFit={showFit}
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="text-lg font-semibold">
              Something went wrong loading these candidates
            </p>
            <p className="mx-auto max-w-md text-xs text-muted-foreground">
              Your filters are still here — try the search again.
            </p>
          </div>
          <Button
            variant="outline"
            className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
            onClick={onRetry}
          >
            Try Again
          </Button>
        </div>
      ) : isLoading ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        !hasAnyPostings ? (
          <EmptyState
            icon={Briefcase}
            title="You don't have any job postings yet"
            description="Candidate search looks across the people who applied to your postings. Post a job to start building that pool."
            action={
              onPostJob ? (
                <Button
                  variant="outline"
                  className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
                  onClick={onPostJob}
                >
                  Post a job
                </Button>
              ) : undefined
            }
          />
        ) : query ? (
          <EmptyState
            icon={SearchX}
            title={`No candidates match “${query}”`}
            description="Try dropping a term — “kubernetes” rather than “production kubernetes operator experience”."
          />
        ) : hasCriteria ? (
          <EmptyState
            icon={SearchX}
            title="No candidates match these filters"
            description="The narrowest filters are the ones to drop first — remove a chip above, or clear them all."
            action={
              onClearFilters ? (
                <Button
                  variant="outline"
                  className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
                  onClick={onClearFilters}
                >
                  Clear all filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No candidates yet"
            description="Nobody has applied to your postings so far. New applicants show up here automatically."
          />
        )
      ) : (
        <>
          {/* Desktop table. The wide table scrolls inside its own container —
              the page itself never scrolls sideways (§9.7). Actions stays
              pinned on the right so it remains reachable while other columns
              slide underneath. */}
          <div className="hidden md:block">
            <Table className="min-w-max border-separate border-spacing-0">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col" className={cn(HEAD, "min-w-[180px]")}>
                    Candidate
                  </TableHead>
                  <TableHead scope="col" className={cn(HEAD, "min-w-[140px]")}>
                    Current title
                  </TableHead>
                  {showFit ? (
                    <SortableColumnHead
                      label="Match %"
                      sortKey="fit"
                      activeSort={sort}
                      sortDir={sortDir}
                      onSort={onSortColumn}
                      className={cn(HEAD, "min-w-[80px]")}
                    />
                  ) : null}
                  {showFit ? (
                    <TableHead
                      scope="col"
                      className={cn(HEAD, "min-w-[200px]")}
                    >
                      Why this person
                    </TableHead>
                  ) : null}
                  <SortableColumnHead
                    label="Experience"
                    sortKey="experience"
                    activeSort={sort}
                    sortDir={sortDir}
                    onSort={onSortColumn}
                    className={cn(HEAD, "hidden xl:table-cell")}
                  />
                  <TableHead
                    scope="col"
                    className={cn(HEAD, "hidden xl:table-cell")}
                  >
                    Location
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={cn(HEAD, "hidden min-w-[220px] md:table-cell")}
                  >
                    Job posting
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={cn(HEAD, "hidden xl:table-cell")}
                  >
                    Applied
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={cn(HEAD, STICKY_ACTIONS_COL, "text-right")}
                  >
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <CandidateRow
                    key={row.id}
                    row={row}
                    showFit={showFit}
                    postingStages={applicationsFor(row)}
                    stageKey={stageKeyForActions(row)}
                    onView={onView}
                    onPreviewResume={onPreviewResume}
                    onViewResumeInNewPage={onViewResumeInNewPage}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* < 768px: the table becomes a card list (§9.7). */}
          <div className="space-y-2 p-3 md:hidden">
            {rows.map((row) => (
              <CandidateCard
                key={row.id}
                row={row}
                showFit={showFit}
                postingStages={applicationsFor(row)}
                stageKey={stageKeyForActions(row)}
                onView={onView}
                onPreviewResume={onPreviewResume}
                onViewResumeInNewPage={onViewResumeInNewPage}
              />
            ))}
          </div>

          {meta ? (
            <CandidateSearchPagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              pageSize={meta.limit}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
