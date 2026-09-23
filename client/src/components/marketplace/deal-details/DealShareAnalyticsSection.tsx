import { Badge } from "@/components/ui/badge";
import {
  Share2,
  MousePointerClick,
  UserPlus,
  Trophy,
  ArrowRight,
} from "lucide-react";
import type { DealShareAnalytics } from "./types";

interface DealShareAnalyticsSectionProps {
  analytics: DealShareAnalytics;
}

export function DealShareAnalyticsSection({
  analytics,
}: DealShareAnalyticsSectionProps) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
      <p className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-4">
        Your Share Performance
      </p>

      {/* Analytics Funnel */}
      <div className="flex items-center justify-between bg-white/80 rounded-xl p-4 mb-4">
        <FunnelStep
          icon={Share2}
          value={analytics.totalShares}
          label="Shares"
          bg="bg-purple-100"
          color="text-purple-600"
        />
        <ArrowRight className="h-4 w-4 text-purple-300" />
        <FunnelStep
          icon={MousePointerClick}
          value={analytics.totalClicks}
          label="Clicks"
          bg="bg-blue-100"
          color="text-blue-600"
        />
        <ArrowRight className="h-4 w-4 text-purple-300" />
        <FunnelStep
          icon={UserPlus}
          value={analytics.signupAttempts}
          label="Sign-ups"
          bg="bg-green-100"
          color="text-green-600"
        />
        <ArrowRight className="h-4 w-4 text-purple-300" />
        <FunnelStep
          icon={Trophy}
          value={analytics.successfulClaims}
          label="Claims"
          bg="bg-amber-100"
          color="text-amber-600"
        />
      </div>

      {/* Platform Breakdown */}
      <div className="flex items-center gap-2 justify-center flex-wrap">
        <span className="text-xs text-muted-foreground">Shared via:</span>
        {analytics.sharesByPlatform.linkedin > 0 && (
          <Badge className="bg-[#0A66C2] text-white text-[10px] font-medium">
            LinkedIn ({analytics.sharesByPlatform.linkedin})
          </Badge>
        )}
        {analytics.sharesByPlatform.twitter > 0 && (
          <Badge className="bg-black text-white text-[10px] font-medium">
            X ({analytics.sharesByPlatform.twitter})
          </Badge>
        )}
        {analytics.sharesByPlatform.facebook > 0 && (
          <Badge className="bg-[#1877F2] text-white text-[10px] font-medium">
            Facebook ({analytics.sharesByPlatform.facebook})
          </Badge>
        )}
        {analytics.sharesByPlatform.copy > 0 && (
          <Badge className="bg-slate-500 text-white text-[10px] font-medium">
            Copied ({analytics.sharesByPlatform.copy})
          </Badge>
        )}
      </div>
    </div>
  );
}

function FunnelStep({
  icon: Icon,
  value,
  label,
  bg,
  color,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <div className="text-center flex-1">
      <div
        className={`h-10 w-10 rounded-full ${bg} mx-auto mb-2 flex items-center justify-center`}
      >
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}
