import type { CSSProperties } from "react";

interface RangeFieldProps {
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  from: number | null;
  to: number | null;
  onChange: (from: number | null, to: number | null) => void;
  format: (value: number) => string;
}

/**
 * Two native range inputs — arrow-key operable, one aria-label per thumb.
 */
export function RangeField({
  label,
  hint,
  min,
  max,
  step,
  from,
  to,
  onChange,
  format,
}: RangeFieldProps) {
  const lo = from ?? min;
  const hi = to ?? max;
  const span = max - min || 1;
  const loPct = ((lo - min) / span) * 100;
  const hiPct = ((hi - min) / span) * 100;

  const commit = (nextLo: number, nextHi: number) => {
    onChange(nextLo <= min ? null : nextLo, nextHi >= max ? null : nextHi);
  };

  const thumb =
    "pointer-events-none absolute inset-x-0 top-0 h-7 w-full appearance-none bg-transparent focus-visible:outline-none " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-brand-amethyst [&::-webkit-slider-thumb]:shadow-[0_1px_4px_hsl(var(--foreground)/0.45),0_0_0_1px_hsl(var(--brand-amethyst)/0.35)] " +
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-brand-amethyst [&::-moz-range-thumb]:shadow-[0_1px_4px_hsl(var(--foreground)/0.45),0_0_0_1px_hsl(var(--brand-amethyst)/0.35)] " +
    "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-brand-amethyst focus-visible:[&::-moz-range-thumb]:ring-2 focus-visible:[&::-moz-range-thumb]:ring-brand-amethyst";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {from === null && to === null
            ? "Any"
            : `${format(lo)} – ${format(hi)}`}
        </span>
      </div>

      <div
        className="relative h-7 [--range-hi:0%] [--range-lo:0%]"
        style={
          {
            "--range-lo": `${loPct}%`,
            "--range-hi": `${100 - hiPct}%`,
          } as CSSProperties
        }
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-amethyst/15" />
        <div className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-gradient left-[var(--range-lo)] right-[var(--range-hi)]" />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={`Minimum ${label.toLowerCase()}`}
          aria-valuetext={format(lo)}
          onChange={(event) =>
            commit(Math.min(Number(event.target.value), hi), hi)
          }
          className={thumb}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={`Maximum ${label.toLowerCase()}`}
          aria-valuetext={format(hi)}
          onChange={(event) =>
            commit(lo, Math.max(Number(event.target.value), lo))
          }
          className={thumb}
        />
      </div>

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
