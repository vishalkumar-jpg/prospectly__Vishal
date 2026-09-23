import { Card, CardContent } from "@/components/ui/card";
import { Clock, Share2, MousePointerClick, Trophy } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/innovative";
import type { SharedDeal } from "./types";

interface SharedDealsStatsProps {
  sharedDeals: SharedDeal[];
}

export function SharedDealsStats({ sharedDeals }: SharedDealsStatsProps) {
  const totalEarnings = sharedDeals
    .filter((d) => d.status === "completed")
    .reduce((sum, d) => sum + d.connectorEarnings, 0);
  const pendingEarnings = sharedDeals
    .filter((d) => d.status === "claimed")
    .reduce((sum, d) => sum + d.connectorEarnings, 0);
  const totalClicks = sharedDeals.reduce(
    (sum, d) => sum + d.analytics.totalClicks,
    0
  );
  const totalShares = sharedDeals.reduce(
    (sum, d) => sum + d.analytics.totalShares,
    0
  );
  const completedDeals = sharedDeals.filter(
    (d) => d.status === "completed"
  ).length;
  const activeDeals = sharedDeals.filter(
    (d) => d.status === "active" || d.status === "claimed"
  ).length;

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <CardContent className="relative p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatItem
            icon={Trophy}
            label="Earned"
            value={totalEarnings}
            prefix="$"
            subtitle={`from ${completedDeals} completed ${completedDeals === 1 ? "deal" : "deals"}`}
          />
          <StatItem
            icon={Clock}
            label="Pending"
            value={pendingEarnings}
            prefix="$"
            subtitle={`${activeDeals} ${activeDeals === 1 ? "deal" : "deals"} in progress`}
          />
          <StatItem
            icon={Share2}
            label="Shares"
            value={totalShares}
            subtitle={`across ${sharedDeals.length} deals`}
          />
          <StatItem
            icon={MousePointerClick}
            label="Clicks"
            value={totalClicks}
            subtitle={`${totalShares > 0 ? Math.round((totalClicks / totalShares) * 10) / 10 : 0} per share avg`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  prefix = "",
  subtitle,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  prefix?: string;
  subtitle: string;
}) {
  return (
    <div className="text-white">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-white/80">{label}</span>
      </div>
      <AnimatedCounter
        value={value}
        prefix={prefix}
        duration={1200}
        className="text-3xl text-white"
      />
      <p className="text-xs text-white/60 mt-1">{subtitle}</p>
    </div>
  );
}
