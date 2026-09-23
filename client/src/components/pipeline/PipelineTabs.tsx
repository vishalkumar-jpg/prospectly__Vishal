import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RefreshCw, Search } from "lucide-react";
import { RouteSearchInput } from "@/components/ui/route-search-input";

export interface PipelineTab {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  color: "blue" | "purple" | "emerald" | "red";
}

interface PipelineTabsProps {
  tabs: PipelineTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  filterContainerId?: string;
  showFilter?: boolean;
  /** Search box to the left of filter (when shown) and refresh */
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Renders immediately to the right of the search input (e.g. country filter). */
  searchSuffix?: React.ReactNode;
  className?: string;
  containerMinWidth?: string;
  tabsListMinWidth?: string;
  tabsListMaxWidth?: string;
  /** Optional actions to render after refresh button */
  actions?: React.ReactNode;
}

export function PipelineTabs({
  tabs,
  activeTab,
  onTabChange,
  isRefreshing = false,
  onRefresh,
  filterContainerId,
  showFilter = false,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  searchSuffix,
  className,
  tabsListMinWidth = "min-w-[600px]",
  tabsListMaxWidth = "max-w-3xl",
  actions,
}: PipelineTabsProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-3.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          {/* Tabs + refresh (refresh sits beside the tabs) */}
          <div className="flex items-center gap-2">
            {/* Tabs — own horizontal scroll lane on small screens */}
            <div className="-mx-0.5 min-w-0 flex-1 overflow-x-auto px-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent md:flex-none">
              <TabsList
                className={cn(
                  "inline-flex",
                  tabsListMinWidth,
                  tabsListMaxWidth,
                  "h-10 w-full gap-1 rounded-xl border border-border bg-muted p-[3px] max-md:!max-w-none md:h-auto md:w-auto"
                )}
              >
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "group flex-1 min-w-[110px] md:min-w-0 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground",
                      "data-[state=active]:bg-card data-[state=active]:text-brand-amethyst data-[state=active]:shadow-sm"
                    )}
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                    {tab.badge !== undefined && (
                      <Badge
                        variant="secondary"
                        className="ml-1 rounded-full border-0 bg-card px-2 py-0.5 text-[11px] font-bold text-muted-foreground group-data-[state=active]:bg-brand-amethyst/10 group-data-[state=active]:text-brand-amethyst"
                      >
                        {tab.badge}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {/* Refresh — beside the tabs on mobile only (icon-only) */}
            {onRefresh && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-16 shrink-0 rounded-xl border border-border bg-card px-3 shadow-sm transition-all hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst disabled:pointer-events-none disabled:opacity-50 sm:w-auto md:hidden"
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      aria-label="Refresh"
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          isRefreshing && "animate-spin"
                        )}
                      />
                      <span className="hidden sm:ml-1.5 sm:inline">
                        Refresh
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {/* Search + filter + actions */}
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-none md:justify-end">
            <div className="flex w-full items-center gap-2 sm:gap-3">
              {/* Search + suffix — inline from md up */}
              <div className="hidden shrink-0 items-center gap-2 md:flex">
                {showSearch && onSearchChange && (
                  <RouteSearchInput
                    value={searchValue}
                    onChange={onSearchChange}
                    placeholder={searchPlaceholder}
                    className="w-64 lg:w-80"
                  />
                )}
                {searchSuffix}
              </div>
              {/* Filter portal — single instance, always rendered */}
              {showFilter && filterContainerId && (
                <div
                  id={filterContainerId}
                  className="hidden shrink-0 md:block"
                />
              )}
              {/* Search — collapsed behind a button on mobile */}
              {showSearch && onSearchChange && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 flex-1 gap-2 rounded-xl border border-border bg-card px-3 shadow-sm transition-all hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst md:hidden md:h-10 md:flex-none"
                      aria-label="Search"
                    >
                      <Search className="h-4 w-4" />
                      Search
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[min(20rem,calc(100vw-2rem))] rounded-xl"
                  >
                    <RouteSearchInput
                      value={searchValue}
                      onChange={onSearchChange}
                      placeholder={searchPlaceholder}
                    />
                  </PopoverContent>
                </Popover>
              )}
              {/* Primary actions stay visible on every breakpoint */}
              {actions && (
                <div className="flex flex-1 [&>*]:h-10 [&>*]:w-full md:flex-none md:[&>*]:w-auto">
                  {actions}
                </div>
              )}
              {/* Refresh — last item on desktop */}
              {onRefresh && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden h-10 shrink-0 gap-2 rounded-xl border border-border bg-card px-3 shadow-sm transition-all hover:border-brand-amethyst/20 hover:bg-brand-amethyst/10 hover:text-brand-amethyst disabled:pointer-events-none disabled:opacity-50 md:inline-flex"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        aria-label="Refresh"
                      >
                        <RefreshCw
                          className={cn(
                            "h-4 w-4",
                            isRefreshing && "animate-spin"
                          )}
                        />
                        <span className="ml-1.5">Refresh</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {searchSuffix && (
              <div className="w-full md:hidden">{searchSuffix}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
