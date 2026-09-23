import type { ComponentType } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Briefcase,
  Building2,
  GraduationCap,
  MapPin,
  Wrench,
} from "lucide-react";
import type {
  GapAnalysisPayload,
  GapDimension,
  GapDimensionKey,
  ScoreBreakdownDimension,
} from "@/lib/recruitment/gap-analysis.types";
import {
  dimensionHasExpandableContent,
  dimensionStatus,
  gapStatusLabel,
  iconBoxStatusClass,
  scoreBreakdownByKey,
} from "@/lib/recruitment/gap-analysis.utils";
import { cn } from "@/lib/utils";
import {
  GapAnalysisSectionBody,
  GapAnalysisStatusBadge,
} from "./GapAnalysisSectionBody";

const DIMENSION_ICONS: Record<
  GapDimensionKey,
  ComponentType<{ className?: string }>
> = {
  skillsMatch: Wrench,
  experienceMatch: Briefcase,
  educationMatch: GraduationCap,
  domainKnowledge: Building2,
  workEligibility: MapPin,
  employmentTypeCompatibility: Briefcase,
};

interface GapAnalysisAccordionProps {
  data: GapAnalysisPayload;
}

function DimensionRowHeader({
  dimension,
  breakdown,
  layout = "static",
}: {
  dimension: GapDimension;
  breakdown?: ScoreBreakdownDimension;
  layout?: "trigger" | "static";
}) {
  const Icon = DIMENSION_ICONS[dimension.key];
  // Resolved once so the tile, the badge colour and the badge wording all come
  // from the same place as the points chip.
  const status = dimensionStatus(dimension, breakdown);

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 max-sm:gap-1.5 sm:gap-3",
        layout === "trigger" ? "flex-1" : "w-full"
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          iconBoxStatusClass(status)
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium tracking-tight text-foreground">
          {dimension.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {dimension.subtitle}
        </span>
      </span>
      {breakdown && (
        // Neutral on purpose: this is data, and the status badge beside it
        // already carries the colour signal for this row.
        <span
          className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground max-sm:hidden"
          title={`${String(breakdown.pointsEarned)} of ${String(breakdown.weight)} points earned`}
        >
          {breakdown.pointsEarned}/{breakdown.weight}
        </span>
      )}
      <GapAnalysisStatusBadge
        label={gapStatusLabel(status)}
        status={status}
        className="status-badge shrink-0"
      />
    </div>
  );
}

export function GapAnalysisAccordion({ data }: GapAnalysisAccordionProps) {
  const breakdownByKey = scoreBreakdownByKey(data);

  /**
   * A lost-points reason is expandable content in its own right. Without this,
   * a dimension with no chips (common for work eligibility) would render as a
   * static row and its reason would be unreachable.
   */
  const isExpandable = (dimension: GapDimension) =>
    dimensionHasExpandableContent(dimension) ||
    (breakdownByKey?.get(dimension.key)?.pointsLost ?? 0) > 0;

  const defaultOpen =
    data.dimensions.find((dimension) => isExpandable(dimension))?.key ??
    undefined;

  return (
    <div className="flex min-w-0 flex-1 flex-col md:min-h-0">
      <div className="min-w-0 overflow-x-hidden px-4 py-5 max-sm:px-3 max-sm:py-4 sm:px-6 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain">
        <Accordion
          type="single"
          collapsible
          defaultValue={defaultOpen}
          className="space-y-2.5"
        >
          {data.dimensions.map((dimension) => {
            const expandable = isExpandable(dimension);
            const breakdown = breakdownByKey?.get(dimension.key);

            if (!expandable) {
              return (
                <AccordionItem
                  key={dimension.key}
                  value={`${dimension.key}-static`}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="px-4 py-3.5">
                    <DimensionRowHeader
                      dimension={dimension}
                      breakdown={breakdown}
                      layout="static"
                    />
                  </div>
                </AccordionItem>
              );
            }

            return (
              <AccordionItem
                key={dimension.key}
                value={dimension.key}
                className="overflow-hidden rounded-2xl border border-border bg-card data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="min-w-0 gap-2 px-4 py-3.5 hover:bg-muted/30 hover:no-underline max-sm:px-3 max-sm:py-3 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
                  <DimensionRowHeader
                    dimension={dimension}
                    breakdown={breakdown}
                    layout="trigger"
                  />
                </AccordionTrigger>
                <AccordionContent className="pb-0 pt-0">
                  <GapAnalysisSectionBody
                    dimension={dimension}
                    breakdown={breakdown}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
