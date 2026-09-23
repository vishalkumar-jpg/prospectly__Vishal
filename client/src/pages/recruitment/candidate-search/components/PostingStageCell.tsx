import { Link } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PostingStageLine } from "./posting-stage.shared";
import { StageBadge } from "./StageBadge";

const POSTING_LINK =
  "rounded-sm underline-offset-2 hover:text-brand-amethyst hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst";

function PostingStageLineRow({
  line,
  className,
}: {
  line: PostingStageLine;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 text-[11.5px]",
        className
      )}
    >
      <Link
        to={`/recruiting/my-job-posts/${line.jobId}`}
        className={cn(POSTING_LINK, "truncate")}
      >
        {line.title}
      </Link>
      <span className="shrink-0 text-muted-foreground" aria-hidden>
        :
      </span>
      <StageBadge label={line.stageLabel} stageKey={line.stageKey} />
    </span>
  );
}

export function PostingStageCell({
  lines,
  className,
  maxInline = 2,
}: {
  lines: PostingStageLine[];
  className?: string;
  maxInline?: number;
}) {
  if (lines.length === 0)
    return <span className={cn("text-muted-foreground", className)}>—</span>;

  if (lines.length <= maxInline) {
    return (
      <span className={cn("flex flex-col gap-1", className)}>
        {lines.map((line) => (
          <PostingStageLineRow key={line.id} line={line} />
        ))}
      </span>
    );
  }

  const inline = lines.slice(0, maxInline);
  const rest = lines.slice(maxInline);

  return (
    <Popover>
      <span className={cn("flex flex-col gap-1", className)}>
        {inline.map((line) => (
          <PostingStageLineRow key={line.id} line={line} />
        ))}
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-fit rounded-sm text-left text-[10.5px] text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst"
          >
            +{rest.length} more
          </button>
        </PopoverTrigger>
      </span>
      <PopoverContent align="start" className="w-72 p-2">
        <p className="px-1 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          {lines.length} applications
        </p>
        <ul className="space-y-1">
          {lines.map((line) => (
            <li key={line.id}>
              <PostingStageLineRow line={line} className="px-1 py-0.5" />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
