import scoreRingTrack from "./gap-analysis-score-ring-track.svg?raw";
import { InlineAssetSvg } from "@/assets/getting-started/inline-asset-svg";
import {
  matchScoreRingColor,
  scoreRingOffset,
} from "@/lib/recruitment/gap-analysis.utils";
import { cn } from "@/lib/utils";

const CIRCUMFERENCE = 276;

const RING_CONFIG = {
  default: {
    box: 104,
    scoreClass: "text-xl",
    labelClass: "max-w-[4rem] text-[7px]",
  },
  compact: {
    box: 80,
    scoreClass: "text-lg",
    labelClass: "max-w-[3.25rem] text-[6.5px]",
  },
} as const;

interface GapAnalysisScoreRingProps {
  score: number;
  size?: keyof typeof RING_CONFIG;
  className?: string;
}

export function GapAnalysisScoreRing({
  score,
  size = "default",
  className,
}: GapAnalysisScoreRingProps) {
  const config = RING_CONFIG[size];
  const offset = scoreRingOffset(score, CIRCUMFERENCE);
  const stroke = matchScoreRingColor(score);

  return (
    <div
      className={cn(
        "relative mx-auto text-muted",
        size === "default" && "my-3 sm:my-4",
        className
      )}
      style={{ width: config.box, height: config.box }}
    >
      <InlineAssetSvg
        svg={scoreRingTrack}
        className="absolute inset-0 h-full w-full -rotate-90 text-muted"
        aria-hidden
      />
      <svg
        width={config.box}
        height={config.box}
        viewBox="0 0 104 104"
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx="52"
          cy="52"
          r="44"
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span
          className={cn(
            "font-semibold leading-none text-foreground",
            config.scoreClass
          )}
        >
          {Math.round(score)}%
        </span>
        <span
          className={cn(
            "mt-1 font-medium uppercase leading-tight tracking-wide text-muted-foreground",
            config.labelClass
          )}
        >
          overall match
        </span>
      </div>
    </div>
  );
}
