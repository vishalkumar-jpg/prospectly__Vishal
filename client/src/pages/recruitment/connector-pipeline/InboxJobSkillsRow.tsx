import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SKILL_CHIP_GAP_PX = 6;
const SKILL_OVERFLOW_TOOLTIP_CLASS =
  "w-[350px] max-h-[250px] overflow-y-auto overflow-x-hidden px-3 py-2.5";

interface InboxJobSkillsRowProps {
  skills: string[];
  className?: string;
  /** Opens job details drawer when the +N skill overflow badge is clicked. */
  onOverflowClick?: () => void;
}

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

export function InboxJobSkillsRow({
  skills,
  className,
  onOverflowClick,
}: InboxJobSkillsRowProps) {
  const normalizedSkills = useMemo(
    () => skills.filter((skill) => skill.trim().length > 0),
    [skills]
  );

  const skillsContainerRef = useRef<HTMLDivElement>(null);
  const skillsMeasureRef = useRef<HTMLDivElement>(null);
  const overflowBadgeMeasureRef = useRef<HTMLSpanElement>(null);
  const [visibleSkillCount, setVisibleSkillCount] = useState(
    normalizedSkills.length
  );

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
  }, [normalizedSkills]);

  if (normalizedSkills.length === 0) return null;

  const hiddenSkillCount = Math.max(
    0,
    normalizedSkills.length - visibleSkillCount
  );
  const hiddenSkills = normalizedSkills.slice(visibleSkillCount);
  const visibleSkills = normalizedSkills.slice(0, visibleSkillCount);

  return (
    <div ref={skillsContainerRef} className={className ?? "relative mb-3 h-6"}>
      <div
        ref={skillsMeasureRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex h-6 flex-nowrap gap-1.5 opacity-0"
      >
        {normalizedSkills.map((skill) => (
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
                  className="inline-flex shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={
                    onOverflowClick
                      ? `View job details with ${hiddenSkillCount} additional ${
                          hiddenSkillCount === 1 ? "skill" : "skills"
                        }`
                      : `Show ${hiddenSkillCount} more ${
                          hiddenSkillCount === 1 ? "skill" : "skills"
                        }`
                  }
                  onClick={(event) => {
                    stopPropagation(event);
                    onOverflowClick?.();
                  }}
                  onMouseDown={stopPropagation}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 items-center rounded-lg border border-brand-amethyst/20 bg-brand-amethyst/10 px-2.5 text-[11px] font-bold text-brand-amethyst",
                      onOverflowClick
                        ? "cursor-pointer transition-colors hover:border-brand-amethyst/40 hover:bg-brand-amethyst/20"
                        : "cursor-default"
                    )}
                  >
                    +{hiddenSkillCount} skill
                  </span>
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
  );
}
