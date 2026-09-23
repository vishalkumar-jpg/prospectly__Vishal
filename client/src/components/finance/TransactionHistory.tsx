import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import {
  useTransactionHistory,
  Transaction,
  useRequestTransactionDetails,
} from "@/hooks/useTransactionHistory";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getTransactionIcon = (
  role: "requester" | "connector",
  status: string | null,
  payoutReleased: boolean
) => {
  if (role === "requester") {
    return <ArrowUpRight className="h-4 w-4 text-destructive" />;
  }
  if (payoutReleased) {
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  }
  return <TrendingDown className="h-4 w-4 text-muted-foreground" />;
};

const getPaymentStatusBadge = (transaction: Transaction) => {
  const isRequester = transaction.role === "requester";

  if (isRequester) {
    const status =
      transaction.remainingPaymentStatus ||
      transaction.initialPaymentStatus ||
      transaction.paymentStatus;
    if (
      status === "captured" ||
      status === "succeeded" ||
      transaction.paymentStatus === "paid"
    ) {
      return (
        <Badge
          variant="default"
          data-testid={`badge-status-${transaction.requestId}`}
        >
          Paid
        </Badge>
      );
    }
    if (status === "requires_capture" || status === "authorized") {
      return (
        <Badge
          variant="secondary"
          data-testid={`badge-status-${transaction.requestId}`}
        >
          Authorized
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge
          variant="secondary"
          data-testid={`badge-status-${transaction.requestId}`}
        >
          Pending
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        data-testid={`badge-status-${transaction.requestId}`}
      >
        {status || "Unknown"}
      </Badge>
    );
  } else {
    if (transaction.payoutReleased) {
      return (
        <Badge
          variant="default"
          data-testid={`badge-status-${transaction.requestId}`}
        >
          Paid Out
        </Badge>
      );
    }
    if (transaction.payoutStatus === "pending") {
      return (
        <Badge
          variant="secondary"
          data-testid={`badge-status-${transaction.requestId}`}
        >
          Pending
        </Badge>
      );
    }
    if (transaction.payoutError) {
      return (
        <Badge
          variant="destructive"
          data-testid={`badge-status-${transaction.requestId}`}
        >
          Failed
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        data-testid={`badge-status-${transaction.requestId}`}
      >
        Awaiting
      </Badge>
    );
  }
};

function TransactionDetailsDialog({ requestId }: { requestId: string }) {
  const { details, loading, error } = useRequestTransactionDetails(requestId);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex items-center gap-2 text-destructive p-4">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load transaction details</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Contact</p>
          <p className="font-medium" data-testid="text-contact-name">
            {details.contactName}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Your Role</p>
          <Badge variant="outline" data-testid="badge-user-role">
            {details.userRole === "requester" ? "Requester" : "Connector"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Referral Payout</span>
            <span className="font-medium" data-testid="text-total-bounty">
              {formatCurrency(details.bountyAmount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Initial Charge ({details.initialChargePercentage}%)
            </span>
            <span data-testid="text-initial-charge">
              {formatCurrency(details.initialChargeAmount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Remaining Charge ({details.remainingChargePercentage}%)
            </span>
            <span data-testid="text-remaining-charge">
              {formatCurrency(details.remainingChargeAmount)}
            </span>
          </div>
          <div className="hidden border-t pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Escrow Fee ({details.platformCommissionPercentage}%)
              </span>
              <span
                className="text-destructive"
                data-testid="text-platform-fee"
              >
                -{formatCurrency(details.platformCommissionAmount)}
              </span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-medium">
                Connector Payout ({details.connectorPayoutPercentage}%)
              </span>
              <span
                className="font-medium text-green-600"
                data-testid="text-connector-payout"
              >
                {formatCurrency(details.connectorPayoutAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {details.paymentEvents.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 rounded-full p-1 ${
                    event.status === "captured" ||
                    event.status === "succeeded" ||
                    event.status === "completed"
                      ? "bg-green-100 dark:bg-green-900"
                      : event.status === "pending" ||
                          event.status === "requires_capture"
                        ? "bg-yellow-100 dark:bg-yellow-900"
                        : "bg-muted"
                  }`}
                >
                  {event.status === "captured" ||
                  event.status === "succeeded" ||
                  event.status === "completed" ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : event.status === "pending" ||
                    event.status === "requires_capture" ? (
                    <Clock className="h-3 w-3 text-yellow-600" />
                  ) : (
                    <Loader2 className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className="font-medium text-sm"
                    data-testid={`text-event-${idx}`}
                  >
                    {event.description}
                  </p>
                  {event.timestamp && (
                    <p className="text-xs text-muted-foreground">
                      {formatLocalizedShortDateTime(event.timestamp)}
                    </p>
                  )}
                  {event.amount && (
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(event.amount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {details.userRole === "connector" && details.payoutError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span data-testid="text-payout-error">{details.payoutError}</span>
        </div>
      )}
    </div>
  );
}

export function TransactionHistory() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "debit" | "credit">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "completed"
  >("all");

  const { transactions, summary, loading, error } = useTransactionHistory({
    search,
    status: statusFilter,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Transaction History</h2>
          <p className="text-muted-foreground">
            View all your earnings, payments, and payouts
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Transaction History</h2>
          <p className="text-muted-foreground">
            View all your earnings, payments, and payouts
          </p>
        </div>
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-lg font-medium">Failed to load transactions</p>
            <p className="text-muted-foreground">Please try again later</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Transaction History</h2>
        <p className="text-muted-foreground">
          View all your earnings, payments, and payouts
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ArrowUpRight className="h-4 w-4" />
              <span>Total Payments</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-debits">
              {formatCurrency(summary.totalDebits)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Total Earnings</span>
            </div>
            <p
              className="text-2xl font-bold text-green-600"
              data-testid="text-total-credits"
            >
              {formatCurrency(summary.totalCredits)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>Completed Payouts</span>
            </div>
            <p
              className="text-2xl font-bold"
              data-testid="text-completed-payouts"
            >
              {summary.completedPayouts}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span>Pending Payouts</span>
            </div>
            <p
              className="text-2xl font-bold"
              data-testid="text-pending-payouts"
            >
              {summary.pendingPayouts}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your latest financial activities across introductions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by contact or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) =>
                setTypeFilter(v as "all" | "debit" | "credit")
              }
            >
              <SelectTrigger
                className="w-[140px]"
                data-testid="select-type-filter"
              >
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="debit">Payments</SelectItem>
                <SelectItem value="credit">Earnings</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as "all" | "pending" | "completed")
              }
            >
              <SelectTrigger
                className="w-[140px]"
                data-testid="select-status-filter"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const isCredit = transaction.role === "connector";
                  const amount = isCredit
                    ? transaction.connectorPayoutAmount ||
                      transaction.bountyAmount * 0.8
                    : transaction.bountyAmount;

                  return (
                    <TableRow
                      key={transaction.requestId}
                      data-testid={`row-transaction-${transaction.requestId}`}
                    >
                      <TableCell>
                        {getTransactionIcon(
                          transaction.role,
                          transaction.paymentStatus,
                          transaction.payoutReleased
                        )}
                      </TableCell>
                      <TableCell
                        className="font-medium"
                        data-testid={`text-contact-${transaction.requestId}`}
                      >
                        {transaction.contactName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {transaction.role === "requester"
                            ? "Requester"
                            : "Connector"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatLocalizedShortDateTime(transaction.createdAt)}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(transaction)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${isCredit ? "text-green-600" : ""}`}
                      >
                        {isCredit ? "+" : "-"}
                        {formatCurrency(amount)}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-view-${transaction.requestId}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Transaction Details</DialogTitle>
                            </DialogHeader>
                            <TransactionDetailsDialog
                              requestId={transaction.requestId}
                            />
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
