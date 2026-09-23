import { Link } from "react-router-dom";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

const POSTING_LINK =
  "rounded-sm underline-offset-2 hover:text-brand-amethyst hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst";

export function PostingLinks({
  postings,
  className,
}: {
  postings: { id: string; title: string }[];
  className?: string;
}) {
  if (postings.length === 0)
    return <span className={cn("text-muted-foreground", className)}>—</span>;

  const list = (
    <span className={cn("block truncate", className)}>
      {postings.map((posting, index) => (
        <span key={posting.id}>
          {index > 0 ? ", " : null}
          <Link
            to={`/recruiting/my-job-posts/${posting.id}`}
            className={POSTING_LINK}
          >
            {posting.title}
          </Link>
        </span>
      ))}
    </span>
  );

  if (postings.length === 1) return list;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>{list}</HoverCardTrigger>
      <HoverCardContent align="start" className="w-64 p-2">
        <p className="px-1 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          On {postings.length} postings
        </p>
        <ul className="space-y-0.5">
          {postings.map((posting) => (
            <li key={posting.id}>
              <Link
                to={`/recruiting/my-job-posts/${posting.id}`}
                className={cn(POSTING_LINK, "block truncate px-1 py-1 text-xs")}
              >
                {posting.title}
              </Link>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
