import { cn } from "@/lib/utils";

/**
 * Kanban column hues, mapped onto theme tokens so dots and labels follow
 * light/dark and keep contrast. Unknown keys stay muted.
 */
const STAGE_TONE: Record<string, { textClass: string; dotClass: string }> = {
  in_review: {
    textClass: "text-brand-warning",
    dotClass: "bg-brand-warning",
  },
  shortlisted: {
    textClass: "text-brand-amethyst",
    dotClass: "bg-brand-amethyst",
  },
  interview_invite_sent: {
    textClass: "text-brand-sky",
    dotClass: "bg-brand-sky",
  },
  interview_scheduled: {
    textClass: "text-brand-success",
    dotClass: "bg-brand-success",
  },
  interview_completed: {
    textClass: "text-brand-sky",
    dotClass: "bg-brand-sky",
  },
  hired: {
    textClass: "text-brand-success",
    dotClass: "bg-brand-success",
  },
  rejected: {
    textClass: "text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  not_qualified: {
    textClass: "text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

const FALLBACK = {
  textClass: "text-muted-foreground",
  dotClass: "bg-muted-foreground/50",
};

function stageStyle(stageKey: string | null) {
  return (stageKey && STAGE_TONE[stageKey]) || FALLBACK;
}

export interface StageBadgeProps {
  label: string | null;
  stageKey: string | null;
}

export function StageBadge({ label, stageKey }: StageBadgeProps) {
  if (!label) return <span className="text-muted-foreground">—</span>;

  const { textClass, dotClass } = stageStyle(stageKey);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-[10.5px] font-medium",
        textClass
      )}
    >
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)}
        aria-hidden
      />
      {label}
    </span>
  );
}
