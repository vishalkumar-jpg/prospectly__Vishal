import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface RecruitmentFinanceTabItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface RecruitmentFinancePipelineTabsProps {
  tabs: RecruitmentFinanceTabItem[];
  className?: string;
}

export function RecruitmentFinancePipelineTabs({
  tabs,
  className,
}: RecruitmentFinancePipelineTabsProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-3.5">
        <TabsList
          className={cn(
            "flex h-auto w-full flex-nowrap items-center justify-start gap-1 overflow-x-auto rounded-xl border border-border bg-muted p-1 thin-scroll",
            "shadow-none"
          )}
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground sm:px-5",
                "data-[state=active]:bg-card data-[state=active]:text-brand-amethyst data-[state=active]:shadow-sm"
              )}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </div>
  );
}
