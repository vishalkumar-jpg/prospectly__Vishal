import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { htmlToPlainText } from "@/lib/rich-text";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MarketplaceJob } from "@/types/marketplace";
import { MapPin, Building2, Eye, Calendar } from "lucide-react";
import { ConnectorJobActionButtons } from "@/components/recruitment/ConnectorJobActionButtons";
import { formatLocalizedShortDate } from "@/utils/dateFormatter";
import {
  formatSalaryPeriod,
  formatCompactSalaryRange,
  isValidSalaryRange,
} from "@/utils/formatter";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

const SKILL_CHIP_GAP_PX = 6;
const SKILL_OVERFLOW_TOOLTIP_CLASS =
  "w-[350px] max-h-[250px] overflow-y-auto overflow-x-hidden px-3 py-2.5";

interface JobCardProps {
  job: MarketplaceJob;
  onViewJob: (job: MarketplaceJob) => void;
  onShareJob: (job: MarketplaceJob) => void;
  onUploadResume: (job: MarketplaceJob) => void;
}

function stopCardActivation(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
}

export default function JobCard({
  job,
  onViewJob,
  onShareJob,
  onUploadResume,
}: JobCardProps) {
  const handleViewJob = useCallback(() => {
    onViewJob(job);
  }, [job, onViewJob]);

  const handleShareJobClick = useCallback(() => {
    onShareJob(job);
  }, [job, onShareJob]);

  const handleReferClick = useCallback(() => {
    onUploadResume(job);
  }, [job, onUploadResume]);

  const handleTitleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      stopCardActivation(event);
      handleViewJob();
    },
    [handleViewJob]
  );

  const handleOverflowSkillClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      stopCardActivation(event);
      handleViewJob();
    },
    [handleViewJob]
  );

  const skills = useMemo(() => job.requiredSkills ?? [], [job.requiredSkills]);

  const skillsContainerRef = useRef<HTMLDivElement>(null);
  const skillsMeasureRef = useRef<HTMLDivElement>(null);
  const overflowBadgeMeasureRef = useRef<HTMLSpanElement>(null);
  const [visibleSkillCount, setVisibleSkillCount] = useState(skills.length);

  useLayoutEffect(() => {
    const container = skillsContainerRef.current;
    const measureEl = skillsMeasureRef.current;
    const overflowBadgeMeasure = overflowBadgeMeasureRef.current;
    if (!container || !measureEl || !overflowBadgeMeasure) return;

    const measure = () => {
      const containerWidth = container.clientWidth;
      const chips = Array.from(
        measureEl.querySelectorAll<HTMLElement>("[data-skill]")
      );

      if (chips.length === 0) {
        setVisibleSkillCount(0);
        return;
      }

      const measureOverflowBadgeWidth = (hiddenCount: number) => {
        overflowBadgeMeasure.textContent = `+${hiddenCount} skill`;
        return overflowBadgeMeasure.offsetWidth;
      };

      let visible = 0;
      for (let candidate = chips.length; candidate >= 0; candidate--) {
        const hiddenCount = chips.length - candidate;
        let rowWidth = 0;

        for (let index = 0; index < candidate; index++) {
          if (index > 0) rowWidth += SKILL_CHIP_GAP_PX;
          rowWidth += chips[index].offsetWidth;
        }

        if (hiddenCount > 0) {
          if (candidate > 0) rowWidth += SKILL_CHIP_GAP_PX;
          rowWidth += measureOverflowBadgeWidth(hiddenCount);
        }

        if (rowWidth <= containerWidth) {
          visible = candidate;
          break;
        }
      }

      setVisibleSkillCount(visible);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [skills]);

  const hiddenSkillCount = Math.max(0, skills.length - visibleSkillCount);
  const hiddenSkills = skills.slice(visibleSkillCount);
  const visibleSkills = skills.slice(0, visibleSkillCount);

  const salaryMin = Number(job.salaryRangeMin);
  const salaryMax = Number(job.salaryRangeMax);
  const hasValidSalary = isValidSalaryRange(salaryMin, salaryMax);

  return (
    <Card
      onClick={handleViewJob}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand-card"
    >
      <CardContent className="flex flex-1 flex-col p-[18px]">
        <button
          type="button"
          onClick={handleTitleClick}
          aria-label={`View details for ${job.title}`}
          className="mb-2 line-clamp-2 min-h-[2.6rem] w-full rounded-md text-left text-[15px] font-medium leading-snug tracking-tight text-foreground transition-colors hover:text-brand-amethyst focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group-hover:text-brand-amethyst"
        >
          {job.title}
        </button>

        <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3 shrink-0" />
            {job.companyName}
          </span>
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {job.location}
            </span>
          )}
        </div>

        <p className="mb-3 line-clamp-2 min-h-[2.5rem] text-[12.4px] leading-relaxed text-muted-foreground">
          {htmlToPlainText(job.description)}
        </p>

        <div ref={skillsContainerRef} className="relative mb-3 h-6">
          <div
            ref={skillsMeasureRef}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 flex h-6 flex-nowrap gap-1.5 opacity-0"
          >
            {skills.map((skill) => (
              <Badge
                key={`measure-${skill}`}
                data-skill
                variant="outline"
                className="inline-flex h-6 shrink-0 items-center rounded-lg border-border bg-muted/60 px-2.5 text-[11px] font-bold text-foreground/70"
              >
                {skill}
              </Badge>
            ))}
          </div>
          <span
            ref={overflowBadgeMeasureRef}
            aria-hidden
            className="pointer-events-none invisible absolute left-0 top-0 inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-lg border border-brand-amethyst/20 bg-brand-amethyst/10 px-2.5 text-[11px] font-bold"
          />

          <div className="flex h-6 flex-nowrap items-center gap-1.5 overflow-hidden">
            {visibleSkills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="inline-flex h-6 shrink-0 items-center rounded-lg border-border bg-muted/60 px-2.5 text-[11px] font-bold text-foreground/70"
              >
                {skill}
              </Badge>
            ))}
            {hiddenSkillCount > 0 && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`View job details with ${hiddenSkillCount} additional ${
                        hiddenSkillCount === 1 ? "skill" : "skills"
                      }`}
                      onClick={handleOverflowSkillClick}
                      onMouseDown={stopCardActivation}
                      className="inline-flex h-6 shrink-0 cursor-pointer items-center rounded-lg border border-brand-amethyst/20 bg-brand-amethyst/10 px-2.5 text-[11px] font-bold text-brand-amethyst transition-colors hover:border-brand-amethyst/40 hover:bg-brand-amethyst/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      +{hiddenSkillCount} skill
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className={SKILL_OVERFLOW_TOOLTIP_CLASS}
                  >
                    <p className="text-xs leading-relaxed text-popover-foreground">
                      {hiddenSkills.join(", ")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div className="mb-2.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-[11px] border border-brand-amethyst/15 bg-brand-amethyst/5 px-3 py-2">
          <div className="shrink-0">
            <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
              Connector Referral Payout
            </p>
            <p className="text-[13px] font-semibold leading-snug text-brand-amethyst">
              ${formatMoneyWithCommas(Number(job.connectorPayout))}
            </p>
          </div>
          {hasValidSalary && (
            <div className="min-w-0 sm:max-w-[65%] sm:text-right">
              <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                Salary Range
              </p>
              <p className="break-words text-[13px] font-semibold leading-snug text-foreground">
                {formatCompactSalaryRange(
                  salaryMin,
                  salaryMax,
                  job.salaryCurrency
                )}
                {job.salaryPeriod && (
                  <span className="inline-block whitespace-nowrap text-[11px] font-normal text-muted-foreground">
                    {" "}
                    / {formatSalaryPeriod(job.salaryPeriod)}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-dashed border-border pt-3">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="h-3 w-3 shrink-0" />
              Posted {formatLocalizedShortDate(job.createdAt)}
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Eye className="h-3 w-3 shrink-0" />
              {job.viewCount} views
            </span>
          </div>
          <ConnectorJobActionButtons
            referCount={job.myReferCount}
            hasSharedLink={job.hasSharedLink}
            onRefer={handleReferClick}
            onShare={handleShareJobClick}
            layout="card"
            stopPropagation
          />
        </div>
      </CardContent>
    </Card>
  );
}
