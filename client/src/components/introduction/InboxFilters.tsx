import { SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InboxFiltersProps {
  className?: string;
}

const STATUS_OPTIONS: Array<{
  label: string;
  dotClass: string;
  count: number;
}> = [
  { label: "Booked", dotClass: "bg-brand-amethyst", count: 1 },
  { label: "Pending", dotClass: "bg-amber-500", count: 1 },
  { label: "Intro Sent", dotClass: "bg-blue-500", count: 1 },
];

const PAYOUT_OPTIONS = ["$500+", "$50 – $500", "Under $50"];

const INDUSTRY_OPTIONS = ["Real Estate", "Engineering", "Finance", "SaaS"];

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function InboxFilters({ className }: InboxFiltersProps) {
  return (
    <aside
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-brand-card lg:sticky lg:top-4",
        className
      )}
    >
      <div className="mb-5 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-brand-amethyst" />
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          Filters
        </h3>
      </div>

      {/* Status */}
      <div className="mb-6">
        <GroupLabel>Status</GroupLabel>
        <div className="space-y-2.5">
          {STATUS_OPTIONS.map(({ label, dotClass, count }) => (
            <label
              key={label}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground"
            >
              <Checkbox />
              <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} />
              <span className="flex-1">{label}</span>
              <Badge variant="secondary" className="rounded-full px-2 py-0">
                {count}
              </Badge>
            </label>
          ))}
        </div>
      </div>

      {/* Referral Payout */}
      <div className="mb-6">
        <GroupLabel>Referral Payout</GroupLabel>
        <div className="space-y-2.5">
          {PAYOUT_OPTIONS.map((label) => (
            <label
              key={label}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground"
            >
              <Checkbox />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Industry */}
      <div className="mb-6">
        <GroupLabel>Industry</GroupLabel>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_OPTIONS.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="cursor-pointer rounded-full border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-brand-amethyst/40 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Trust Score */}
      <div className="mb-5">
        <GroupLabel>Trust Score</GroupLabel>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
          <Checkbox />
          <span>Verified requester only</span>
        </label>
      </div>

      <div className="border-t border-border pt-3">
        <Button
          variant="link"
          className="h-auto p-0 text-sm font-semibold text-brand-rose hover:no-underline hover:opacity-70"
        >
          Clear all filters
        </Button>
      </div>
    </aside>
  );
}
