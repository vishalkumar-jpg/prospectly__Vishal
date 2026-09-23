import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Zap,
  Video,
  Download,
  Send,
  ChevronRight,
} from "lucide-react";
import BankAccountModal from "@/components/BankAccountModal";
import EarningsReportModal from "@/components/EarningsReportModal";
import { BuyCreditsModal } from "@/components/BuyCreditsModal";
import { TransferFunds } from "@/components/finance/TransferFunds";

const mockTransactions = [
  {
    id: 1,
    type: "intro_commission",
    amount: 250,
    date: "2024-01-15",
    status: "completed",
    description: "Introduction: Tech Corp → Sales Lead",
  },
  {
    id: 2,
    type: "meeting_credit",
    amount: -10,
    date: "2024-01-14",
    status: "completed",
    description: "Meeting scheduled with prospect",
  },
  {
    id: 3,
    type: "ai_credit",
    amount: -5,
    date: "2024-01-14",
    status: "completed",
    description: "AI campaign generation",
  },
  {
    id: 4,
    type: "intro_commission",
    amount: 500,
    date: "2024-01-13",
    status: "pending",
    description: "Introduction: Finance Co → CFO",
  },
];

export function FinancesEarnings() {
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [showEarningsReportModal, setShowEarningsReportModal] = useState(false);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "intro_commission":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case "meeting_credit":
        return <Video className="h-4 w-4 text-blue-500" />;
      case "ai_credit":
        return <Zap className="h-4 w-4 text-purple-500" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Financial Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full -mr-16 -mt-16" />
          <div className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <Badge
                variant="outline"
                className="bg-green-100 dark:bg-green-900/30 text-green-700 hover:bg-green-700 hover:text-green-100 dark:text-green-300 dark:hover:bg-green-300 dark:hover:text-green-900 border-green-300 dark:border-green-700"
              >
                Available
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Available Balance
              </p>
              <p className="text-3xl font-bold text-foreground">$2,450.00</p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full -mr-16 -mt-16" />
          <div className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <Badge
                variant="outline"
                className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 hover:bg-amber-700 hover:text-amber-100 dark:text-amber-300 dark:hover:bg-amber-300 dark:hover:text-amber-900 border-amber-300 dark:border-amber-700"
              >
                Pending
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Pending Earnings
              </p>
              <p className="text-3xl font-bold text-foreground">$750.00</p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-16 -mt-16" />
          <div className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge
                variant="outline"
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 hover:bg-blue-700 hover:text-blue-100 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-blue-900 border-blue-300 dark:border-blue-700"
              >
                +12% MTD
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                This Month
              </p>
              <p className="text-3xl font-bold text-foreground">$3,200.00</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Quick Actions
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Button
              className="h-auto py-4 flex-col gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-hero"
              onClick={() => setShowTransferModal(true)}
            >
              <Send className="h-5 w-5" />
              <span>Transfer to Bank</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 hover:bg-muted"
              onClick={() => setShowBankAccountModal(true)}
            >
              <Wallet className="h-5 w-5" />
              <span>Bank Accounts</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 hover:bg-muted"
              onClick={() => setShowEarningsReportModal(true)}
            >
              <Download className="h-5 w-5" />
              <span>Earnings Report</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="shadow-card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Recent Transactions
            </h3>
            <Button variant="ghost" size="sm" className="text-primary">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {mockTransactions.map((transaction, index) => (
              <div key={transaction.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${transaction.amount > 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}`}
                    >
                      {transaction.amount > 0 ? "+" : ""}
                      {transaction.amount > 0 ? "$" : ""}
                      {Math.abs(transaction.amount)}
                      {transaction.amount < 0 ? " credits" : ""}
                    </p>
                    <Badge
                      variant={
                        transaction.status === "completed"
                          ? "outline"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
                {index < mockTransactions.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Modals */}
      <BankAccountModal
        isOpen={showBankAccountModal}
        onClose={() => setShowBankAccountModal(false)}
      />
      <EarningsReportModal
        isOpen={showEarningsReportModal}
        onClose={() => setShowEarningsReportModal(false)}
      />
      <BuyCreditsModal
        isOpen={showBuyCreditsModal}
        onClose={() => setShowBuyCreditsModal(false)}
      />
      {showTransferModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Transfer Funds</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTransferModal(false)}
                >
                  Close
                </Button>
              </div>
              <TransferFunds />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
