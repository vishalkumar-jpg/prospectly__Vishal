import { cn } from "@/lib/utils";

/**
 * Tab list shared with IntroductionPipeline `PipelineTabs` (white card, border, gap between segments).
 */
export const pipelineTabsListClassName =
  "inline-flex h-auto w-full min-w-0 items-stretch justify-center gap-2 rounded-lg border border-border bg-card p-1 text-muted-foreground focus:outline-none focus-visible:outline-none";

/** Same list + bottom margin for contact import modals */
export const importMethodTabsListClassName = cn(
  "mb-6",
  pipelineTabsListClassName
);

/** Shared trigger shell; pair with section-specific active gradient classes. */
export const pipelineTabsTriggerBaseClassName =
  "flex min-w-[120px] md:min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-4 md:px-3 py-2.5 text-sm font-semibold shadow-none transition-all duration-300 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:text-white data-[state=active]:shadow-lg";

const pipelineTabsTriggerBlueActive =
  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:shadow-blue-500/30";

/** Import modals: blue gradient active pill like PipelineTabs inbox tab. */
export const importMethodTabsTriggerClassName = cn(
  pipelineTabsTriggerBaseClassName,
  pipelineTabsTriggerBlueActive
);
