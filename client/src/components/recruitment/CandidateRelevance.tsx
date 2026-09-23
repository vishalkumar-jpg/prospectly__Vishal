import { Check, HelpCircle, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  ResumeSearchConditionState,
  ResumeSearchMatch,
  ResumeSearchMatchKind,
} from "@/lib/api/recruitment";
import {
  RELEVANCE_TIER_LABEL,
  relevanceTier,
  type RelevanceTier,
} from "@/lib/recruitment/resume-search.utils";
import {
  buildRelevanceStrip,
  type RelevanceItem,
} from "@/lib/recruitment/candidate-relevance.utils";
import { RelevanceOverflow } from "@/components/recruitment/RelevanceOverflow";

/**
 * Emerald / blue / slate rather than a red-amber-green traffic light: amber
 * would collide with the "Partial" badge sitting on the same row, and red
 * would brand a genuinely relevant candidate as a failure — the colour the ✗
 * condition chips beside it already use for exactly that.
 */
const TIER_STYLES: Record<RelevanceTier, string> = {
  strong: "border-emerald-200 bg-emerald-50 text-emerald-700",
  good: "border-blue-200 bg-blue-50 text-blue-700",
  related: "border-slate-200 bg-slate-50 text-slate-600",
};

const CHIP_STYLES: Record<ResumeSearchMatchKind, string> = {
  keyword: "border-blue-200 bg-blue-50 text-blue-700",
  related: "border-slate-200 bg-slate-50 text-slate-600",
  semantic: "border-slate-200 bg-slate-50 italic text-slate-600",
};

const CONDITION_STYLES: Record<ResumeSearchConditionState, string> = {
  met: "border-emerald-200 bg-emerald-50 text-emerald-700",
  missing: "border-red-200 bg-red-50 text-red-700",
  unknown: "border-amber-200 bg-amber-50 text-amber-700",
};

const CONDITION_ICONS: Record<ResumeSearchConditionState, typeof Check> = {
  met: Check,
  missing: X,
  unknown: HelpCircle,
};

const CONDITION_HINT: Record<ResumeSearchConditionState, string> = {
  met: "Found in this resume",
  missing: "Not found in this resume",
  unknown: "Could not be checked — this resume is not fully indexed",
};

function itemKey(item: RelevanceItem): string {
  return `${item.kind}-${item.label}`;
}

function EvidenceChip({ item }: { item: RelevanceItem }) {
  if (item.kind === "term") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "max-w-full text-[10px] font-normal",
          CHIP_STYLES[item.termKind]
        )}
      >
        <span className="truncate">{item.label}</span>
      </Badge>
    );
  }

  const Icon = CONDITION_ICONS[item.state];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "max-w-full gap-0.5 text-[10px] font-normal",
            CONDITION_STYLES[item.state]
          )}
        >
          <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden />
          <span className="truncate">{item.label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{CONDITION_HINT[item.state]}</TooltipContent>
    </Tooltip>
  );
}

interface CandidateRelevanceRowProps {
  match: ResumeSearchMatch;
  topScore: number;
}

/**
 * One wrapping row, not a stack. Everything here competes with the candidate's
 * own name for space at the top of the card, so the rank leads, the stated
 * requirements take the remaining slots — they answer what was actually asked —
 * and incidental keywords collapse into the overflow chip.
 */
export function CandidateRelevanceRow({
  match,
  topScore,
}: CandidateRelevanceRowProps) {
  const tier = relevanceTier(match.score, topScore);
  const { visible, hidden, showPartial } = buildRelevanceStrip(match);
  const hasSemantic = visible.some(
    (item) => item.kind === "term" && item.termKind === "semantic"
  );

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1">
      <Badge
        variant="outline"
        className={cn(
          "gap-1 text-[10px] uppercase tracking-wider",
          TIER_STYLES[tier]
        )}
      >
        <Sparkles className="h-3 w-3" aria-hidden />#{match.rank}{" "}
        {RELEVANCE_TIER_LABEL[tier]}
      </Badge>

      {showPartial ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Shortened from "Partial match" — it is the widest badge here and
                the full label costs a chip its slot. */}
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-[10px] uppercase tracking-wider text-amber-700"
            >
              Partial
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Doesn&apos;t meet every requirement in your search
          </TooltipContent>
        </Tooltip>
      ) : null}

      {visible.map((item) => (
        <EvidenceChip key={itemKey(item)} item={item} />
      ))}

      <RelevanceOverflow items={hidden} />

      {hasSemantic ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="cursor-help text-[10px] text-muted-foreground underline decoration-dotted"
              aria-label="Why this matched"
            >
              why?
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-56">
            Matched on the overall meaning of this resume, not an exact term.
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
