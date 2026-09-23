import { ExternalLink, FileText, MoreVertical, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { CandidateSearchRow } from "@/lib/api/recruitment-candidate-search";

export function CandidateRowActions({
  row,
  stageKey,
  name,
  onView,
  onPreviewResume,
  onViewResumeInNewPage,
}: {
  row: CandidateSearchRow;
  stageKey: string | null;
  name: string;
  onView: (row: CandidateSearchRow) => void;
  onPreviewResume: (row: CandidateSearchRow) => void;
  onViewResumeInNewPage: (row: CandidateSearchRow) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground transition-colors hover:bg-brand-amethyst/10 hover:text-brand-amethyst focus-visible:ring-2 focus-visible:ring-brand-amethyst"
          aria-label={`Actions for ${name}`}
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
  );
}
