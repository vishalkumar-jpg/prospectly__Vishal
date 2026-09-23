import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { cn } from "@/lib/utils";
import {
  Clock,
  MousePointerClick,
  UserPlus,
  Trophy,
  ChevronDown,
  Users,
  Loader2,
  Building2,
} from "lucide-react";
import type { SharedDeal } from "./types";
import { SharedDealClaimers } from "./SharedDealClaimers";
import { SharedDealAnalytics } from "./SharedDealAnalytics";

interface SharedDealCardProps {
  deal: SharedDeal;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function SharedDealCard({
  deal,
  isExpanded,
  onToggleExpand,
}: SharedDealCardProps) {
  const claimersCount = deal.claimers?.length || 0;

  // Prefer contact data from contacts table, fallback to introduction request data
  const jobTitle = deal.prospect.jobTitle || deal.prospect.title || "";
  const company = deal.prospect.company || "";

  const getStatusBadge = (status: SharedDeal["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-50 border-emerald-200 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Active
          </Badge>
        );
      case "claimed":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-700 hover:text-amber-50 border-amber-200 font-medium">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 font-medium shadow-sm">
            <Trophy className="h-3 w-3 mr-1" />
            Won
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="text-slate-500 border-slate-300">
            <Clock className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 border-0 shadow-md hover:shadow-lg",
        isExpanded && "ring-2 ring-amber-500/30 shadow-xl"
      )}
    >
      {/* Collapsed Header */}
      <button
        type="button"
        className="w-full p-4 sm:p-5 cursor-pointer hover:bg-slate-50/50 transition-colors appearance-none text-left border-0 bg-transparent"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-controls="expanded-details"
      >
        {/* Mobile/Tablet: Layout matching Browse tab */}
        <div className="lg:hidden">
          {/* Profile Section */}
          <div className="flex items-start gap-4">
            <PremiumAvatar
              name={deal.prospect.name}
              size="md"
              imageUrl={deal.prospect.photoUrl}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h4 className="font-bold text-lg text-foreground">
                  {deal.prospect.name}
                </h4>
                {jobTitle && (
                  <Badge
                    variant="secondary"
                    className="px-2 py-0.5 h-auto min-h-[20px] text-[10px] font-medium bg-blue-100 text-blue-700 hover:!bg-blue-700 hover:!text-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:!bg-blue-400 dark:hover:!text-blue-900 border-none max-w-full break-words"
                    title={jobTitle}
                  >
                    <span className="line-clamp-2">{jobTitle}</span>
                  </Badge>
                )}
              </div>
              {company && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="text-sm font-medium text-muted-foreground truncate">
                    {company}
                  </span>
                </div>
              )}
            </div>
            {getStatusBadge(deal.status)}
          </div>

          {/* Meeting Title Box - Below Profile Section */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-sm font-semibold text-foreground mb-1 line-clamp-1">
              "{deal.meetingTitle}"
            </p>
            {deal.meetingDescription && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {deal.meetingDescription}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MousePointerClick className="h-3.5 w-3.5" />
              <span className="font-medium">
                {deal.analytics.totalClicks}
              </span>{" "}
              clicks
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <UserPlus className="h-3.5 w-3.5" />
              <span className="font-medium">
                {deal.analytics.signupAttempts}
              </span>{" "}
              signups
            </div>
            {claimersCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium">{claimersCount}</span> claimers
              </div>
            )}
          </div>

          {/* Mobile/Tablet: Referral Payout and Chevron */}
          <div className="flex items-center justify-between mt-4">
            <div className="px-3 py-3 rounded-lg bg-[#F5F7FF] border border-blue-100/50 shadow-sm text-center flex flex-col justify-center min-w-[140px]">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Referral Payout Amount
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-[32px] font-bold text-primary">$</span>
                <span className="text-[32px] font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent leading-none">
                  {deal.connectorEarnings.toLocaleString()}
                </span>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-300",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </div>

        {/* Desktop: Original layout */}
        <div className="hidden lg:flex lg:flex-row lg:items-start gap-4">
          <PremiumAvatar
            name={deal.prospect.name}
            size="md"
            imageUrl={deal.prospect.photoUrl}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-bold text-foreground">
                {deal.prospect.name}
              </h4>
              {getStatusBadge(deal.status)}
            </div>
            {company && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{company}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1 truncate italic">
              "{deal.meetingTitle}"
            </p>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MousePointerClick className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {deal.analytics.totalClicks}
                </span>{" "}
                clicks
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <UserPlus className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {deal.analytics.signupAttempts}
                </span>{" "}
                signups
              </div>
              {claimersCount > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium">{claimersCount}</span> claimers
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            {/* Referral Payout Amount Section - Matching Browse Tab Style */}
            <div className="px-3 py-3 rounded-lg bg-[#F5F7FF] border border-blue-100/50 shadow-sm text-center flex flex-col justify-center w-full sm:w-auto sm:min-w-[140px]">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Referral Payout Amount
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-[32px] font-bold text-primary">$</span>
                <span className="text-[32px] sm:text-[32px] font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent leading-none">
                  {deal.connectorEarnings.toLocaleString()}
                </span>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-300 mx-auto sm:mr-0",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div 
          id="expanded-details"
          role="region"
          className="px-5 pb-4 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white"
        >
          <div className="pt-4 space-y-4">
            {deal.claimers && deal.claimers.length > 0 && (
              <SharedDealClaimers claimers={deal.claimers} dealId={deal.id} />
            )}

            <SharedDealAnalytics analytics={deal.analytics} />
          </div>
        </div>
      )}
    </Card>
  );
}
