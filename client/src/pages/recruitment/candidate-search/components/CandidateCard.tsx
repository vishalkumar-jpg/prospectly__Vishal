import { ExternalLink, FileText, MoreVertical, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { utcDayjs } from "@/lib/dayjs";
import type { CandidateSearchRow } from "@/lib/api/recruitment-candidate-search";
import { MatchScoreCell } from "./MatchScoreCell";
import { PostingStageCell } from "./PostingStageCell";
import type { PostingStageLine } from "./posting-stage.shared";
import { WhyThisPersonCell } from "./WhyThisPersonCell";

export interface CandidateCardProps {
  row: CandidateSearchRow;
  showFit: boolean;
  postingStages: PostingStageLine[];
  stageKey: string | null;
  onView: (row: CandidateSearchRow) => void;
  onPreviewResume: (row: CandidateSearchRow) => void;
  onViewResumeInNewPage: (row: CandidateSearchRow) => void;
}

/** The < 768px form of a result row (§9.7): name + title, match, two chips. */
export function CandidateCard({
  row,
  showFit,
  postingStages,
  stageKey,
  onView,
  onPreviewResume,
  onViewResumeInNewPage,
}: CandidateCardProps) {
  const applied = row.appliedAt
    ? utcDayjs(row.appliedAt).format("DD MMM YYYY")
    : "—";

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3 transition-all duration-200 hover:shadow-md">
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onView(row)}
          className="block max-w-full truncate text-left text-[13px] font-bold text-brand-amethyst transition-colors hover:underline hover:text-brand-amethyst/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst cursor-pointer"
        >
          {row.name ?? "Unnamed candidate"}
        </button>
        <p className="truncate text-[11.5px] text-muted-foreground">
          {row.currentTitle ?? "—"}
          {row.company ? ` · ${row.company}` : ""}
        </p>
      </div>

      {showFit ? <MatchScoreCell fit={row.fit} /> : null}

      {showFit ? (
        <WhyThisPersonCell
          signals={row.fit?.signals ?? []}
          maxMet={2}
          maxMissed={0}
          className="max-w-none"
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <PostingStageCell lines={postingStages} className="text-xs" />
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {applied}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground transition-colors hover:bg-brand-amethyst/10 hover:text-brand-amethyst focus-visible:ring-2 focus-visible:ring-brand-amethyst"
                aria-label={`Actions for ${row.name ?? "candidate"}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {row.hasResume && stageKey !== "processing" ? (
                <>
                  <DropdownMenuItem
                    onClick={() => onPreviewResume(row)}
                    className="cursor-pointer gap-2"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>View resume</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onViewResumeInNewPage(row)}
                    className="cursor-pointer gap-2"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span>View resume in new page</span>
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuItem
                onClick={() => onView(row)}
                className="cursor-pointer gap-2"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>View candidate details</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
