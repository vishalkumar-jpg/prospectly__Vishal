import { useState } from "react";
import { cn } from "@/lib/utils";

// Design-only filter rail. The visual toggle state lives here locally and is
// intentionally NOT wired to the marketplace query — the filter API does not
// exist yet. Once it ships, lift this state up and feed it into useMarketplaceJobs.

const WORK_TYPES = ["Remote", "Hybrid", "On-site"];
const PAYOUT_RANGES = ["$500+", "$50 – $500"];
const TOP_SKILLS = [
  "React",
  "Python",
  "TypeScript",
  "Docker",
  "GraphQL",
  "Communication",
];

interface MarketplaceFilterRailProps {
  className?: string;
}

export default function MarketplaceFilterRail({
  className,
}: MarketplaceFilterRailProps) {
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [payouts, setPayouts] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  const toggle = (
    value: string,
    list: string[],
    setList: (next: string[]) => void
  ) => {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  };

  const clearAll = () => {
    setWorkTypes([]);
    setPayouts([]);
    setSkills([]);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Work Type */}
      <div>
        <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Work Type
        </p>
        <div className="flex flex-col">
          {WORK_TYPES.map((option) => {
            const on = workTypes.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(option, workTypes, setWorkTypes)}
                className="flex items-center gap-2.5 py-1.5 text-left text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
              >
                <span
                  className={cn(
                    "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition-all",
                    on
                      ? "border-transparent bg-brand-gradient text-brand-foreground"
                      : "border-border bg-card"
                  )}
                >
                  {on && (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Referral Payout */}
      <div>
        <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Referral Payout
        </p>
        <div className="flex flex-col">
          {PAYOUT_RANGES.map((option) => {
            const on = payouts.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(option, payouts, setPayouts)}
                className="flex items-center gap-2.5 py-1.5 text-left text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
              >
                <span
                  className={cn(
                    "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition-all",
                    on
                      ? "border-transparent bg-brand-gradient text-brand-foreground"
                      : "border-border bg-card"
                  )}
                >
                  {on && (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Skills */}
      <div>
        <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Top Skills
        </p>
        <div className="flex flex-wrap gap-2">
          {TOP_SKILLS.map((skill) => {
            const on = skills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(skill, skills, setSkills)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                  on
                    ? "border-brand-amethyst bg-brand-amethyst/10 text-brand-amethyst"
                    : "border-border bg-card text-foreground/70 hover:border-brand-amethyst/40 hover:text-brand-amethyst"
                )}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={clearAll}
        className="self-start text-xs font-bold text-brand-rose transition-opacity hover:opacity-80"
      >
        Clear all filters
      </button>
    </div>
  );
}
