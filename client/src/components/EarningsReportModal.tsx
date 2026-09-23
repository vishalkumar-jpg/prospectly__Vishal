import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { toUTC } from "@/lib/dayjs";
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar as CalendarIcon,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";

interface EarningsData {
  period: string;
  totalEarnings: number;
  successfulIntroductions: number;
  avgCommission: number;
  growth: number;
  transactions: {
    id: string;
    date: string;
    contact: string;
    amount: number;
    status: "completed" | "pending" | "processing";
    type: "introduction" | "bonus" | "referral";
  }[];
}

interface EarningsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockEarningsData: Record<string, EarningsData> = {
  "this-month": {
    period: "January 2024",
    totalEarnings: 4200,
    successfulIntroductions: 7,
    avgCommission: 600,
    growth: 23,
    transactions: [
      {
        id: "1",
        date: "2024-01-16",
        contact: "Sarah Johnson → TechCorp",
        amount: 1200,
        status: "completed",
        type: "introduction",
      },
      {
        id: "2",
        date: "2024-01-14",
        contact: "Alex Thompson → StartupX",
        amount: 800,
        status: "completed",
        type: "introduction",
      },
      {
        id: "3",
        date: "2024-01-12",
        contact: "Mike Chen → FinanceHub",
        amount: 1500,
        status: "pending",
        type: "introduction",
      },
      {
        id: "4",
        date: "2024-01-10",
        contact: "Lisa Rodriguez → MarketingPro",
        amount: 700,
        status: "completed",
        type: "introduction",
      },
    ],
  },
  "last-month": {
    period: "December 2023",
    totalEarnings: 3420,
    successfulIntroductions: 6,
    avgCommission: 570,
    growth: 15,
    transactions: [
      {
        id: "5",
        date: "2023-12-28",
        contact: "David Kim → ConsultingFirm",
        amount: 900,
        status: "completed",
        type: "introduction",
      },
      {
        id: "6",
        date: "2023-12-25",
        contact: "Maria Garcia → TechSolutions",
        amount: 650,
        status: "completed",
        type: "introduction",
      },
      {
        id: "7",
        date: "2023-12-22",
        contact: "James Wilson → InnovateLab",
        amount: 1200,
        status: "completed",
        type: "introduction",
      },
      {
        id: "8",
        date: "2023-12-20",
        contact: "Referral Bonus",
        amount: 500,
        status: "completed",
        type: "bonus",
      },
      {
        id: "9",
        date: "2023-12-18",
        contact: "Emily Chen → GrowthCorp",
        amount: 170,
        status: "completed",
        type: "introduction",
      },
    ],
  },
  "this-year": {
    period: "2024 YTD",
    totalEarnings: 4200,
    successfulIntroductions: 7,
    avgCommission: 600,
    growth: 23,
    transactions: [
      {
        id: "10",
        date: "2024-01-16",
        contact: "Sarah Johnson → TechCorp",
        amount: 1200,
        status: "completed",
        type: "introduction",
      },
      {
        id: "11",
        date: "2024-01-14",
        contact: "Alex Thompson → StartupX",
        amount: 800,
        status: "completed",
        type: "introduction",
      },
      {
        id: "12",
        date: "2024-01-12",
        contact: "Mike Chen → FinanceHub",
        amount: 1500,
        status: "pending",
        type: "introduction",
      },
      {
        id: "13",
        date: "2024-01-10",
        contact: "Lisa Rodriguez → MarketingPro",
        amount: 700,
        status: "completed",
        type: "introduction",
      },
    ],
  },
};

export default function EarningsReportModal({
  isOpen,
  onClose,
}: EarningsReportModalProps) {
  const [selectedPeriod, setSelectedPeriod] =
    useState<keyof typeof mockEarningsData>("this-month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showCustomDate, setShowCustomDate] = useState(false);

  const currentData = mockEarningsData[selectedPeriod];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "processing":
        return <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "introduction":
        return "bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-blue-100";
      case "bonus":
        return "bg-green-100 text-green-700 hover:bg-green-700 hover:text-green-100";
      case "referral":
        return "bg-purple-100 text-purple-700 hover:bg-purple-700 hover:text-purple-100";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-700 hover:text-gray-100";
    }
  };

  const handleExportReport = () => {
    // Simulate PDF/CSV export
    const data = currentData;

    // Create downloadable content
    const reportContent = `
Earnings Report - ${data.period}
==============================

Summary:
- Total Earnings: $${data.totalEarnings.toLocaleString()}
- Successful Introductions: ${data.successfulIntroductions}
- Average Commission: $${data.avgCommission.toLocaleString()}
- Growth: ${data.growth}%

Transactions:
${data.transactions
  .map((t) => `${t.date} | ${t.contact} | $${t.amount} | ${t.status}`)
  .join("\n")}
    `;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings-report-${selectedPeriod}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Earnings Report</DialogTitle>
            <Button onClick={handleExportReport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </DialogHeader>

        <Tabs value="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview & Analytics</TabsTrigger>
            <TabsTrigger value="transactions">Transaction Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Period Selector */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={
                  selectedPeriod === "this-month" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setSelectedPeriod("this-month")}
              >
                This Month
              </Button>
              <Button
                variant={
                  selectedPeriod === "last-month" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setSelectedPeriod("last-month")}
              >
                Last Month
              </Button>
              <Button
                variant={selectedPeriod === "this-year" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("this-year")}
              >
                This Year
              </Button>
              <Popover open={showCustomDate} onOpenChange={setShowCustomDate}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Custom Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    ${currentData.totalEarnings.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Earnings
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    +{currentData.growth}% from last period
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {currentData.successfulIntroductions}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Successful Intros
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    ${currentData.avgCommission.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg Commission
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <ArrowUpRight className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {currentData.growth}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Growth Rate
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Performance Summary - {currentData.period}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Highest Single Commission:
                      </span>
                      <span className="font-bold ml-2">
                        $
                        {Math.max(
                          ...currentData.transactions.map((t) => t.amount)
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Pending Earnings:
                      </span>
                      <span className="font-bold ml-2 text-yellow-600">
                        $
                        {currentData.transactions
                          .filter((t) => t.status === "pending")
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Tax Information</h4>
                    <p className="text-sm text-muted-foreground">
                      All earnings shown are gross amounts. You'll receive a
                      1099 form for tax reporting if your annual earnings exceed
                      $600. Consider setting aside 25-30% for taxes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="space-y-3">
              {currentData.transactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(transaction.status)}
                        <div>
                          <p className="font-medium">{transaction.contact}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatLocalizedShortDateTime(
                              toUTC(transaction.date)
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className={getTypeColor(transaction.type)}
                        >
                          {transaction.type}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            transaction.status === "completed"
                              ? "bg-green-100 text-green-700 hover:bg-green-700 hover:text-green-100"
                              : transaction.status === "pending"
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-700 hover:text-yellow-100"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-blue-100"
                          }
                        >
                          {transaction.status}
                        </Badge>
                        <span className="font-bold text-green-600">
                          +${transaction.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {currentData.transactions.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No transactions found for this period
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
