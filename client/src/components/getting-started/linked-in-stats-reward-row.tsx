export type LinkedInStatsRewardRowProps = {
  imported: number;
  totalFetched: number;
  duplicates: number;
  isCompleted: boolean;
};

export function LinkedInStatsRewardRow({
  imported,
  totalFetched,
  duplicates,
  isCompleted,
}: LinkedInStatsRewardRowProps) {
  const foundLine =
    totalFetched > 0
      ? `${totalFetched.toLocaleString()} found${
          duplicates ? ` · ${duplicates.toLocaleString()} merged` : ""
        }`
      : isCompleted
        ? "Last sync complete"
        : null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
      {/* <div className="flex min-w-0 items-center gap-x-1">
        <span
          className={cn(
            "text-sm font-bold tabular-nums leading-tight",
            isTrustEarned ? "text-emerald-200" : "text-white/90"
          )}
        >
          {isTrustEarned
            ? formatTrustScoreEarned(trustPoints)
            : formatTrustScoreDisplayShort(trustPoints)}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 rounded-full text-white/45 hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="About Trust Score Points"
              onClick={onStopPropagation}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Info className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs leading-snug text-muted-foreground">
              {trustTooltip}
            </p>
          </TooltipContent>
        </Tooltip>
      </div> */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold leading-tight text-white">
          {imported.toLocaleString()} imported
        </p>
        {foundLine ? (
          <p className="mt-0.5 text-[11px] text-white/60">{foundLine}</p>
        ) : null}
      </div>
    </div>
  );
}
