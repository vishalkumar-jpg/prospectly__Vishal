import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareDealPopover } from "./ShareDealPopover";
import {
  Building2,
  Globe,
  Linkedin,
  Users,
  Eye,
  CheckCircle,
  ArrowRight,
  Share2,
  Gift,
  Zap,
} from "lucide-react";
import type { MarketplaceDeal } from "./MarketplaceCard";
import { UserOrganizationsSection } from "@/components/shared/UserOrganizationsSection";
import {
  type DealShareAnalytics,
  getInitials,
  DealBountyBreakdown,
  DealShareAnalyticsSection,
} from "./deal-details";

export type { DealShareAnalytics } from "./deal-details";

interface DealDetailsModalProps {
  deal: MarketplaceDeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaim?: (deal: MarketplaceDeal) => void;
  onShare?: (
    dealId: string,
    platform: "facebook" | "twitter" | "linkedin" | "copy"
  ) => Promise<{ sharerCode: string; shareUrl: string } | null>;
  shareAnalytics?: DealShareAnalytics;
  sharerCode?: string;
}

export function DealDetailsModal({
  deal,
  open,
  onOpenChange,
  onClaim,
  onShare,
  shareAnalytics,
  sharerCode = "demo123",
}: DealDetailsModalProps) {
  if (!deal) return null;

  const getUrgencyBadge = () => {
    const baseClass =
      "bg-white/20 text-white border-white/30 font-semibold text-xs backdrop-blur-sm";
    switch (deal.urgency) {
      case "urgent":
        return (
          <Badge className={baseClass}>
            <div className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
            Urgent
          </Badge>
        );
      case "high":
        return (
          <Badge className={baseClass}>
            <Zap className="h-3 w-3 mr-1" />
            High Priority
          </Badge>
        );
      case "normal":
        return <Badge className={baseClass}>Normal</Badge>;
      case "flexible":
        return <Badge className={baseClass}>Flexible</Badge>;
      default:
        return null;
    }
  };

  const viewCount =
    Math.abs(
      deal.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 80
    ) + 50;
  const connectorEarnings = Math.floor(deal.bountyAmount * 0.5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {/* Hero Section */}
          <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-6 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                    Deal Opportunity
                  </p>
                  <div className="flex items-center gap-2">
                    {getUrgencyBadge()}
                    <Badge className="bg-white/20 text-white border-white/30 font-semibold text-xs backdrop-blur-sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                  <Gift className="h-6 w-6" />
                  <span className="text-4xl font-black tracking-tight">
                    ${deal.bountyAmount.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-white/80 mt-3">
                  Total Referral Payout · Earn{" "}
                  <span className="font-bold">${connectorEarnings}</span> (50%)
                  when someone claims
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Prospect Section */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Prospect
              </p>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 ring-2 ring-offset-2 ring-amber-200">
                  <AvatarImage
                    src={deal.prospect.photoUrl}
                    alt={deal.prospect.name}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 text-xl font-bold">
                    {getInitials(deal.prospect.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-foreground">
                    {deal.prospect.name}
                  </h3>
                  <p className="text-muted-foreground">{deal.prospect.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-600">
                      {deal.prospect.company}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {deal.prospect.linkedinUrl && (
                    <a
                      href={deal.prospect.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center h-10 w-10 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl transition-all duration-200"
                      title="LinkedIn Profile"
                    >
                      <Linkedin className="h-5 w-5" />
                    </a>
                  )}
                  {deal.prospect.website && (
                    <a
                      href={deal.prospect.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center h-10 w-10 bg-slate-600 hover:bg-slate-700 text-white rounded-xl transition-all duration-200"
                      title="Company Website"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {deal.contactOrganizations &&
              deal.contactOrganizations.length > 0 && (
                <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                  <UserOrganizationsSection
                    organizations={deal.contactOrganizations}
                    variant="purple"
                  />
                </div>
              )}

            {/* Meeting Request */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                What They're Looking For
              </p>
              <p className="font-semibold text-foreground mb-2">
                "{deal.meetingAgenda.title}"
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {deal.meetingAgenda.description}
              </p>
            </div>

            <DealBountyBreakdown bountyAmount={deal.bountyAmount} />
            {shareAnalytics && (
              <DealShareAnalyticsSection analytics={shareAnalytics} />
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">
                    {deal.interestedCount} interested
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">{viewCount} views</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShareDealPopover
                  deal={{
                    dealId: deal.id,
                    sharerCode,
                    prospectName: deal.prospect.name,
                    prospectCompany: deal.prospect.company,
                    bountyAmount: deal.bountyAmount,
                    meetingTitle: deal.meetingAgenda.title,
                  }}
                  onShareClick={
                    onShare
                      ? (dealId, platform) => onShare(dealId, platform)
                      : undefined
                  }
                  trigger={
                    <Button variant="outline" size="lg" className="gap-2 h-12">
                      <Share2 className="h-4 w-4" />
                      Share Deal
                    </Button>
                  }
                />
                {onClaim && (
                  <Button
                    size="lg"
                    className="flex-1 gap-2 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-amber-200/50"
                    onClick={() => onClaim(deal)}
                  >
                    <CheckCircle className="h-5 w-5" />
                    Claim & Introduce
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DealDetailsModal;
