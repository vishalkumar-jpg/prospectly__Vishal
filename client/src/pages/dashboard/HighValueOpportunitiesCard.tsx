import { Trophy, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, useNavigate } from "react-router-dom";
import { DASHBOARD_MESSAGES } from "@/constants/dashboard.constants";

interface Opportunity {
  id: number | string;
  title: string;
  description: string;
  bountyAmount: number;
  isUrgent?: boolean;
}

interface HighValueOpportunitiesCardProps {
  opportunities: Opportunity[];
  loading: boolean;
  error: unknown;
}

export function HighValueOpportunitiesCard({
  opportunities,
  loading,
  error,
}: HighValueOpportunitiesCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-brand-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-warning/10 text-brand-warning">
              <Trophy className="h-5 w-5" />
            </div>
            <CardTitle className="whitespace-normal text-lg font-bold tracking-tight sm:whitespace-nowrap">
              High-Value Opportunities
            </CardTitle>
          </div>
          <div className="flex justify-end">
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="text-brand-rose hover:bg-brand-rose/10 hover:text-brand-rose"
            >
              <Link to="/prospecting/opportunities">
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pt-0 md:px-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-4 rounded-xl border border-border bg-secondary/40 p-4"
              >
                <div className="h-12 w-20 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {DASHBOARD_MESSAGES.ERROR.FAILED_TO_LOAD_OPPORTUNITIES_INLINE}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No high-value opportunities available
          </div>
        ) : (
          opportunities.map((opportunity) => (
            <div
              key={opportunity.id}
              className="group flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-border bg-secondary/40 p-3 transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-brand-card sm:gap-4 sm:p-4"
              onClick={() => navigate("/prospecting/opportunities")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/prospecting/opportunities");
                }
              }}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="relative min-w-[80px] flex-shrink-0 rounded-xl border border-brand-amethyst/15 bg-brand-amethyst/5 px-2 py-3 text-center sm:min-w-[100px] sm:px-3">
                  {opportunity.isUrgent && (
                    <div className="absolute -right-1 -top-1 z-10 animate-pulse rounded-full bg-brand-rose px-1.5 py-0.5 text-[8px] font-semibold text-brand-foreground shadow-lg">
                      Urgent
                    </div>
                  )}
                  <div className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Reward
                  </div>
                  <span className="font-mono text-lg font-extrabold text-brand-gradient">
                    ${opportunity.bountyAmount.toLocaleString()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex min-w-0 items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                            {opportunity.title}
                          </p>
                        </TooltipTrigger>
                        {opportunity.title.length > 50 && (
                          <TooltipContent>
                            <p className="max-w-xs">{opportunity.title}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {opportunity.description}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-[18px] w-[18px] flex-shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-brand-rose" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
