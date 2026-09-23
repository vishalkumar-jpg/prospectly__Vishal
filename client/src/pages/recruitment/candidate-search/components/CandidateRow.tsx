import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { utcDayjs } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import type { CandidateSearchRow } from "@/lib/api/recruitment-candidate-search";
import { CandidateRowActions } from "./CandidateRowActions";
import { MatchScoreCell } from "./MatchScoreCell";
import { PostingStageCell } from "./PostingStageCell";
import type { PostingStageLine } from "./posting-stage.shared";
import { WhyThisPersonCell } from "./WhyThisPersonCell";

const TINTS = [
  "bg-brand-rose/15 text-brand-rose",
  "bg-brand-amethyst/15 text-brand-amethyst",
  "bg-brand-success/15 text-brand-success",
  "bg-brand-warning/15 text-brand-warning",
];

function initialsOf(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function tintOf(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1)
    hash = (hash + seed.charCodeAt(i)) % 997;
  return TINTS[hash % TINTS.length];
}

export interface CandidateRowProps {
  row: CandidateSearchRow;
  showFit: boolean;
  postingStages: PostingStageLine[];
  stageKey: string | null;
  onView: (row: CandidateSearchRow) => void;
  onPreviewResume: (row: CandidateSearchRow) => void;
  onViewResumeInNewPage: (row: CandidateSearchRow) => void;
}

const CELL = "border-b p-3 align-middle";

export const STICKY_ACTIONS_COL =
  "sticky right-0 z-20 whitespace-nowrap bg-card";

export function CandidateRow({
  row,
  showFit,
  postingStages,
  stageKey,
  onView,
  onPreviewResume,
  onViewResumeInNewPage,
}: CandidateRowProps) {
  const name = row.name ?? "Unnamed candidate";
  const applied = row.appliedAt
    ? utcDayjs(row.appliedAt).format("DD MMM YYYY")
    : "—";
  const experience =
    row.experienceYears == null ? "—" : `${row.experienceYears} yrs`;

  return (
    <TableRow className="group transition-colors duration-200 hover:bg-muted/50">
      <TableCell className={CELL}>
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11.5px] font-bold",
              tintOf(row.id)
            )}
          >
            {initialsOf(row.name)}
          </span>
          <span className="min-w-0">
            <button
              type="button"
              onClick={() => onView(row)}
              className="block max-w-full truncate text-left text-[13px] font-bold text-brand-amethyst transition-colors hover:underline hover:text-brand-amethyst/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst cursor-pointer"
            >
              {name}
            </button>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {row.email ?? "—"}
            </span>
            <span className="block truncate text-[11px] tabular-nums text-muted-foreground xl:hidden">
              {[row.location, experience, applied]
                .filter((part) => part && part !== "—")
                .join(" · ") || "—"}
            </span>
          </span>
        </div>
      </TableCell>

      <TableCell className={CELL}>
        <span className="block truncate text-[13px]">
          {row.currentTitle ?? "—"}
        </span>
        <span className="block truncate text-[11.5px] text-muted-foreground">
          {row.company ?? "—"}
        </span>
      </TableCell>

      {showFit ? (
        <TableCell className={CELL}>
          <MatchScoreCell fit={row.fit} />
        </TableCell>
      ) : null}

      {showFit ? (
        <TableCell className={CELL}>
          <WhyThisPersonCell
            signals={row.fit?.signals ?? []}
            maxMet={2}
            maxMissed={1}
            className="xl:hidden"
          />
          <WhyThisPersonCell
            signals={row.fit?.signals ?? []}
            className="hidden xl:flex"
          />
        </TableCell>
      ) : null}

      <TableCell className={cn(CELL, "hidden tabular-nums xl:table-cell")}>
        {experience}
      </TableCell>

      <TableCell className={cn(CELL, "hidden xl:table-cell")}>
        {row.location ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[160px] cursor-default truncate">
                {row.location}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {row.location}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="block text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className={cn(CELL, "hidden max-w-[280px] md:table-cell")}>
        <PostingStageCell lines={postingStages} />
      </TableCell>

      <TableCell
        className={cn(
          CELL,
          "hidden tabular-nums text-muted-foreground xl:table-cell"
        )}
      >
        {applied}
      </TableCell>

      <TableCell
        className={cn(
          CELL,
          STICKY_ACTIONS_COL,
          "text-right group-hover:bg-gradient-to-b group-hover:from-muted/50 group-hover:to-muted/50"
        )}
      >
        <div className="flex items-center justify-end">
          <CandidateRowActions
            row={row}
            stageKey={stageKey}
            name={name}
            onView={onView}
            onPreviewResume={onPreviewResume}
            onViewResumeInNewPage={onViewResumeInNewPage}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
