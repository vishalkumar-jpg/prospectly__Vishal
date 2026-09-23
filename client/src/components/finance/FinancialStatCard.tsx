import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface FinancialStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  sparklineData?: number[];
  gradient: string;
  isLoading?: boolean;
}

export function FinancialStatCard({
  title,
  value,
  icon: Icon,
  trend,
  sparklineData = [],
  gradient,
  isLoading = false,
}: FinancialStatCardProps) {
  const formatValue =
    typeof value === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value)
      : value;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-none shadow-lg transition-all hover:shadow-xl hover:-translate-y-1",
        "bg-gradient-to-br",
        gradient
      )}
    >
      {/* Animated background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              "bg-white/20 backdrop-blur-sm border border-white/30"
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          {trend !== undefined && (
            <div
              className={cn(
                "px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
                trend >= 0
                  ? "bg-green-500/20 text-green-100"
                  : "bg-red-500/20 text-red-100"
              )}
            >
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div className="space-y-1 mb-4">
          <p className="text-white/80 text-sm font-medium">{title}</p>
          {isLoading ? (
            <div className="h-10 w-32 bg-white/20 animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold text-white">{formatValue}</p>
          )}
        </div>

        {sparklineData.length > 0 && (
          <div className="h-12 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData.map((v, i) => ({ value: v }))}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="rgba(255, 255, 255, 0.5)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
