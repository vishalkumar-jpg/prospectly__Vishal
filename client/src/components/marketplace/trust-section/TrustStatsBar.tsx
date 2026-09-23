import { Card, CardContent } from "@/components/ui/card";
import { Users, Handshake, DollarSign, CheckCircle } from "lucide-react";
import type { PlatformStats } from "./types";

interface TrustStatsBarProps {
  stats: PlatformStats;
}

export function TrustStatsBar({ stats }: TrustStatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-primary/20">
        <CardContent className="p-4 text-center">
          <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
          <p className="text-2xl font-bold text-foreground">{stats.users}</p>
          <p className="text-sm text-muted-foreground">Active Users</p>
        </CardContent>
      </Card>
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-primary/20">
        <CardContent className="p-4 text-center">
          <Handshake className="h-6 w-6 mx-auto mb-2 text-green-600" />
          <p className="text-2xl font-bold text-foreground">
            {stats.introductions}
          </p>
          <p className="text-sm text-muted-foreground">Introductions Made</p>
        </CardContent>
      </Card>
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-primary/20">
        <CardContent className="p-4 text-center">
          <DollarSign className="h-6 w-6 mx-auto mb-2 text-purple-600" />
          <p className="text-2xl font-bold text-foreground">
            {stats.payoutTotal}
          </p>
          <p className="text-sm text-muted-foreground">Paid to Connectors</p>
        </CardContent>
      </Card>
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur border-primary/20">
        <CardContent className="p-4 text-center">
          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
          <p className="text-2xl font-bold text-foreground">
            {stats.successRate}
          </p>
          <p className="text-sm text-muted-foreground">Success Rate</p>
        </CardContent>
      </Card>
    </div>
  );
}
