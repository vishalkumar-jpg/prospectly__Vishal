import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { Wallet, Clock, ArrowUpRight, Sparkles } from "lucide-react";

export function PayoutDashboard() {
  const { summary } = useFinancialSummary();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const canRequestPayout = summary.availableBalance >= 50;

  return (
    <Card className="border-none shadow-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-transparent to-teal-600/20 animate-pulse"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl"></div>

      <CardContent className="p-8 relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Earnings Dashboard</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Available Balance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/80">
              <Wallet className="h-4 w-4" />
              <p className="text-sm font-medium">Available Balance</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-1">
                {formatCurrency(summary.availableBalance)}
              </p>
              <p className="text-sm text-white/80">Ready to payout</p>
            </div>
            {canRequestPayout && (
              <Button className="w-full mt-3 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm shadow-lg">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Request Payout
              </Button>
            )}
            {!canRequestPayout && (
              <Badge
                variant="secondary"
                className="mt-3 bg-white/10 text-white border-white/20"
              >
                $50 minimum required
              </Badge>
            )}
          </div>

          {/* Pending Balance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/80">
              <Clock className="h-4 w-4" />
              <p className="text-sm font-medium">Pending Balance</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-1">
                {formatCurrency(summary.pendingPayouts)}
              </p>
              <p className="text-sm text-white/80">In escrow</p>
            </div>
          </div>
        </div>

        {/* Payout Schedule Info */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="flex items-center justify-between text-sm">
            <p className="text-white/80">Payout Schedule:</p>
            <Badge className="bg-white/20 text-white border-white/30">
              Weekly on Fridays
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
