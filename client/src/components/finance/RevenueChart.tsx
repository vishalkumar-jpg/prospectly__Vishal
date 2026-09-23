import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFinancialCharts, TimeRange } from "@/hooks/useFinancialCharts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

export function RevenueChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const { chartData, isLoading } = useFinancialCharts(timeRange);

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
    { value: "1y", label: "1Y" },
    { value: "all", label: "All" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="h-full border border-border shadow-md bg-white">
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Financial Overview
          </CardTitle>
          <div className="flex flex-wrap gap-0.5 justify-center sm:justify-end">
            {timeRanges.map((range) => (
              <Button
                key={range.value}
                variant="outline"
                size="sm"
                onClick={() => setTimeRange(range.value)}
                className={cn(
                  "h-8 px-3",
                  timeRange === range.value &&
                    "border-transparent bg-brand-amethyst text-brand-foreground hover:bg-brand-amethyst/90 hover:text-brand-foreground"
                )}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <p className="text-muted-foreground">
              No data available for the selected period
            </p>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={formatCurrency}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                />
                <Legend />
                <Bar
                  dataKey="credits"
                  name="Earnings"
                  fill="hsl(142 76% 36%)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="debits"
                  name="Spending"
                  fill="hsl(0 84% 60%)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
