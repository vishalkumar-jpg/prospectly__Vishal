import { cn } from "@/lib/utils";

interface StatItem {
  value: number;
  label: string;
  variant: "blue" | "green" | "amber";
}

interface ImportModalStatsGridProps {
  stats: StatItem[];
  className?: string;
  /** Uses HSL tokens from `getting-started-tokens.css` (--gs-sky, --gs-success, --gs-warning). */
  palette?: "default" | "getting-started";
}

/** Matches client/design/getting_started.html `.m-stat.*` */
const variantCell: Record<StatItem["variant"], string> = {
  blue: "border-[rgba(36,170,222,0.12)] bg-[rgba(36,170,222,0.06)]",
  green: "border-[rgba(0,182,122,0.12)] bg-[rgba(0,182,122,0.06)]",
  amber: "border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.06)]",
};

const variantCellGs: Record<StatItem["variant"], string> = {
  blue: "border-[hsl(var(--gs-sky)/0.14)] bg-[hsl(var(--gs-sky)/0.08)]",
  green: "border-[hsl(var(--gs-success)/0.14)] bg-[hsl(var(--gs-success)/0.08)]",
  amber: "border-[hsl(var(--gs-warning)/0.14)] bg-[hsl(var(--gs-warning)/0.08)]",
};

const variantNum: Record<StatItem["variant"], string> = {
  blue: "text-[#24AADE]",
  green: "text-[#00B67A]",
  amber: "text-[#D97706]",
};

const variantNumGs: Record<StatItem["variant"], string> = {
  blue: "text-[hsl(var(--gs-sky))]",
  green: "text-[hsl(var(--gs-success))]",
  amber: "text-[hsl(var(--gs-warning))]",
};

export function ImportModalStatsGrid({
  stats,
  className,
  palette = "default",
}: ImportModalStatsGridProps) {
  const cells = palette === "getting-started" ? variantCellGs : variantCell;
  const nums = palette === "getting-started" ? variantNumGs : variantNum;

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={cn(
            "rounded-[10px] border px-2 py-3 text-center",
            cells[stat.variant]
          )}
        >
          <div
            className={cn(
              "font-mono text-[22px] font-extrabold leading-none",
              nums[stat.variant]
            )}
          >
            {stat.value.toLocaleString()}
          </div>
          <div className="mt-[3px] text-[10px] text-muted-foreground">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
