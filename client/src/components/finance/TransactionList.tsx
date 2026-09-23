import { useState } from "react";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FinanceFilterBar } from "@/components/finance/FinanceFilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DateRangePicker,
  DateRangeValue,
  useDateRangeFilter,
} from "@/components/ui/date-range-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useTransactionHistory,
  TransactionFilters,
  Transaction,
} from "@/hooks/useTransactionHistory";
import { BountyTransactionModal } from "@/components/introduction/BountyTransactionModal";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Calendar,
  CalendarCheck,
  MessageSquare,
  AlertCircle,
  Receipt,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { Loader } from "@/components/ui/loader";

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

function getStatusBadge(transaction: Transaction) {
  // Check for refund status first
  if (transaction.isRefunded || transaction.overallStatus === "refunded") {
    return (
      <Badge
        variant="outline"
        className="bg-blue-500/15 text-blue-700 hover:bg-blue-700 hover:text-blue-50 dark:text-blue-400 border-blue-500/30 font-medium text-xs px-2 py-1 whitespace-nowrap"
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        Refunded
      </Badge>
    );
  }

  const isComplete =
    transaction.remainingPaymentStatus === "captured" ||
    transaction.remainingPaymentStatus === "succeeded";
  return isComplete ? (
    <Badge
      variant="outline"
      className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-50 dark:text-emerald-400 border-emerald-500/30 font-medium text-xs px-2 py-1 whitespace-nowrap"
    >
      Completed
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="bg-amber-500/15 text-amber-700 hover:bg-amber-700 hover:text-amber-50 dark:text-amber-400 border-amber-500/30 font-medium text-xs px-2 py-1 whitespace-nowrap"
    >
      In Progress
    </Badge>
  );
}

function getStageBadge(status: string) {
  const stageConfig: Record<
    string,
    { label: string; icon: typeof Clock; className: string }
  > = {
    pending: {
      label: "Pending",
      icon: Clock,
      className:
        "bg-slate-500/15 text-slate-700 hover:bg-slate-700 hover:text-slate-50 dark:text-slate-400 border-slate-500/30",
    },
    accepted: {
      label: "Accepted",
      icon: CheckCircle2,
      className:
        "bg-blue-500/15 text-blue-700 hover:bg-blue-700 hover:text-blue-50 dark:text-blue-400 border-blue-500/30",
    },
    declined: {
      label: "Declined",
      icon: XCircle,
      className:
        "bg-red-500/15 text-red-700 hover:bg-red-700 hover:text-red-50 dark:text-red-400 border-red-500/30",
    },
    intro_sent: {
      label: "Intro Sent",
      icon: Send,
      className:
        "bg-cyan-500/15 text-cyan-700 hover:bg-cyan-700 hover:text-cyan-50 dark:text-cyan-400 border-cyan-500/30",
    },
    meeting_scheduled: {
      label: "Scheduled",
      icon: Calendar,
      className:
        "bg-indigo-500/15 text-indigo-700 hover:bg-indigo-700 hover:text-indigo-50 dark:text-indigo-400 border-indigo-500/30",
    },
    meeting_booked: {
      label: "Booked",
      icon: CalendarCheck,
      className:
        "bg-purple-500/15 text-purple-700 hover:bg-purple-700 hover:text-purple-50 dark:text-purple-400 border-purple-500/30",
    },
    meeting_completed: {
      label: "Meeting Done",
      icon: CheckCircle2,
      className:
        "bg-teal-500/15 text-teal-700 hover:bg-teal-700 hover:text-teal-50 dark:text-teal-400 border-teal-500/30",
    },
    peer_feedback: {
      label: "Feedback",
      icon: MessageSquare,
      className:
        "bg-orange-500/15 text-orange-700 hover:bg-orange-700 hover:text-orange-50 dark:text-orange-400 border-orange-500/30",
    },
    completed: {
      label: "Completed",
      icon: CheckCircle2,
      className:
        "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-50 dark:text-emerald-400 border-emerald-500/30",
    },
    email_failed: {
      label: "Email Failed",
      icon: AlertCircle,
      className:
        "bg-red-500/15 text-red-700 hover:bg-red-700 hover:text-red-50 dark:text-red-400 border-red-500/30",
    },
  };

  const config = stageConfig[status] || {
    label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: Clock,
    className:
      "bg-slate-500/15 text-slate-700 hover:bg-slate-700 hover:text-slate-50 dark:text-slate-400 border-slate-500/30",
  };

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`gap-1 font-medium text-xs px-2 py-1 whitespace-nowrap ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function TransactionList() {
  const { search: searchInput, setSearch: setSearchInput } = useRouteSearch();
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 10,
    status: "all",
    search: "",
    sortBy: "date",
    sortOrder: "desc",
    datePreset: "all",
  });

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dateFilter = useDateRangeFilter();

  const { transactions, summary, pagination, loading, isFetching } =
    useTransactionHistory({
      ...filters,
      search: searchInput,
      ...dateFilter.getQueryParams(),
    });

  // Check if there's any data at all (regardless of filters)
  const hasAnyData = summary.transactionCount > 0 || pagination.totalItems > 0;

  // Check if any filters are active
  const hasActiveFilters =
    searchInput !== "" ||
    filters.status !== "all" ||
    dateFilter.value.preset !== "all";

  // Show search and filters only if there's data OR if filters are active (so user can clear them)
  const showFilters = hasAnyData || hasActiveFilters;

  const handleSort = (field: "date" | "amount" | "contact") => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder:
        prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc",
      page: 1,
    }));
  };

  const getSortIcon = (field: "date" | "amount" | "contact") => {
    if (filters.sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    }
    return filters.sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDateChange = (value: DateRangeValue) => {
    dateFilter.onChange(value);
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (value: "all" | "completed" | "pending") => {
    setFilters((prev) => ({ ...prev, status: value, page: 1 }));
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border border-border shadow-md bg-white">
        <CardContent className="p-4 md:p-6 pt-6 space-y-5">
          {showFilters && (
            <FinanceFilterBar
              searchValue={searchInput}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search by contact, connector, meeting title, status, or amount..."
              activeFilterCount={
                (filters.status !== "all" ? 1 : 0) +
                (dateFilter.value.preset !== "all" ? 1 : 0)
              }
              renderInlineFilters={() => (
                <Select
                  value={filters.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger
                    className="w-full rounded-xl bg-background lg:w-[130px]"
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
              )}
              renderSecondaryFilters={() => (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Date:</span>
                  </div>
                  <DateRangePicker
                    value={dateFilter.value}
                    onChange={handleDateChange}
                    testIdPrefix="transaction-date"
                  />
                </div>
              )}
            />
          )}

          {isFetching ? (
            <Loader message="Loading transactions..." size="lg" />
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                <Receipt className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                No Transactions Found
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchInput || filters.status !== "all"
                  ? "Try adjusting your search or filters"
                  : "Your transaction history will appear here once you start making introductions"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent [&_button]:text-[11px] [&_button]:uppercase [&_button]:tracking-wider [&_button]:font-bold [&_button]:text-muted-foreground [&_button:hover]:text-foreground">
                      <TableHead className="min-w-[160px]">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleSort("contact")}
                          data-testid="button-sort-contact"
                          className="flex h-auto items-center gap-1.5 p-0 transition-colors hover:bg-transparent"
                        >
                          Contact
                          {getSortIcon("contact")}
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[180px] text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          Meeting Title
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[120px] text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                        Stage
                      </TableHead>
                      <TableHead className="min-w-[110px]">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleSort("amount")}
                          data-testid="button-sort-amount"
                          className="flex h-auto items-center gap-1.5 p-0 transition-colors hover:bg-transparent"
                        >
                          Amount
                          {getSortIcon("amount")}
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[100px] text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                        Payment
                      </TableHead>
                      <TableHead className="min-w-[150px]">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleSort("date")}
                          data-testid="button-sort-date"
                          className="flex h-auto items-center gap-1.5 p-0 transition-colors hover:bg-transparent"
                        >
                          Date
                          {getSortIcon("date")}
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[70px] text-center text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow
                        key={transaction.requestId}
                        className="group cursor-pointer border-b border-border/50 transition-colors hover:bg-brand-amethyst/5"
                        onClick={() => handleViewDetails(transaction)}
                        data-testid={`row-transaction-${transaction.requestId}`}
                      >
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground truncate max-w-[140px]">
                              {transaction.contactName || "Unknown Contact"}
                            </span>
                            {transaction.connector?.fullName && (
                              <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                                via {transaction.connector.fullName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-sm text-muted-foreground truncate block max-w-[160px]">
                            {transaction.meetingTitle || "Introduction Request"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          {getStageBadge(transaction.status)}
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-semibold text-sm text-foreground">
                            {formatCurrency(
                              transaction.requesterDisplayAmount ??
                                transaction.bountyAmount
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          {getStatusBadge(transaction)}
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-sm text-foreground whitespace-nowrap">
                            {formatLocalizedShortDateTime(
                              transaction.createdAt
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(transaction);
                            }}
                            data-testid={`button-view-transaction-${transaction.requestId}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 px-1">
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {(filters.page - 1) * filters.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(
                      filters.page * filters.limit,
                      pagination.totalItems
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {pagination.totalItems}
                  </span>{" "}
                  transactions
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={filters.page <= 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>

                  <div className="flex items-center gap-1 px-2">
                    {Array.from(
                      { length: Math.min(5, pagination.totalPages || 1) },
                      (_, i) => {
                        const totalPages = pagination.totalPages || 1;
                        const currentPage = filters.page;
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-8 w-8 p-0",
                              currentPage === pageNum
                                ? "border-transparent bg-brand-gradient text-brand-foreground shadow-brand-cta hover:text-brand-foreground"
                                : "hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                            )}
                            onClick={() => handlePageChange(pageNum)}
                            data-testid={`button-page-${pageNum}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={filters.page >= pagination.totalPages}
                    data-testid="button-next-page"
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedTransaction && (
        <BountyTransactionModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setSelectedTransaction(null);
          }}
          introductionRequestId={selectedTransaction.requestId}
          prospectName={selectedTransaction.contactName}
        />
      )}
    </div>
  );
}
