import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinancialCharts } from "@/hooks/useFinancialCharts";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

const COLORS = {
  Credit: "hsl(142 76% 36%)",
  Debit: "hsl(0 84% 60%)",
  Refund: "hsl(217 91% 60%)",
  Escrow: "hsl(215 16% 47%)",
};

export function TransactionBreakdownChart() {
  const { breakdownData, isLoading } = useFinancialCharts("30d");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Ensure breakdownData is an array and handle loading/empty states
  const safeBreakdownData = Array.isArray(breakdownData) ? breakdownData : [];
  // Filter out Escrow entries
  const filteredData = safeBreakdownData.filter(
    (item) => item?.name !== "Escrow"
  );
  const totalTransactions = filteredData.reduce(
    (sum, item) => sum + (item?.value || 0),
    0
  );

  if (isLoading) {
    return (
      <Card className="h-full border border-border shadow-md bg-white">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Transaction Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="h-[300px] w-full flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border border-border shadow-md bg-white">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Transaction Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filteredData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {filteredData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      COLORS[entry?.name as keyof typeof COLORS] ||
                      "hsl(var(--muted))"
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">Total Volume</p>
          <p className="text-2xl font-bold">
            {formatCurrency(totalTransactions)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
