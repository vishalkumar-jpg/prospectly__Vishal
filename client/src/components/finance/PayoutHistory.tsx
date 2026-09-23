import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DateRangePicker,
  DateRangeValue,
  useDateRangeFilter,
} from "@/components/ui/date-range-picker";
import { Card, CardContent } from "@/components/ui/card";
import { UnifiedStatCard } from "./UnifiedStatCard";
import { PayoutDetailsDrawer } from "./PayoutDetailsDrawer";
import { StripeConnectModal } from "./StripeConnectModal";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { FinanceFilterBar } from "@/components/finance/FinanceFilterBar";
import {
  TrendingUp,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  User,
  Percent,
  CreditCard,
  CalendarDays,
  Shield,
} from "lucide-react";
import { usePayoutHistory, PayoutRecord } from "@/hooks/useTransactionHistory";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getStripePayoutStatusQueryKey,
  isStripePayoutSetupComplete,
} from "@/lib/stripe-connect";
import type { PayoutStatus } from "@/lib/api/payments";
import { api } from "@/lib/api";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { toast } from "@/hooks/use-toast";

const formatCurrency = (amount: number | string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

function getStatusBadge(payout: PayoutRecord) {
  if (payout.payoutReleased) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-50 dark:text-emerald-400 border-emerald-500/30 font-medium text-xs"
      >
        Paid
      </Badge>
    );
  }
  // Note: payoutError relates to requester's payment issues, not connector's
  // Show as "Pending" since connector is waiting for their payout
  return (
    <Badge
      variant="outline"
      className="bg-amber-500/15 text-amber-700 hover:bg-amber-700 hover:text-amber-50 dark:text-amber-400 border-amber-500/30 font-medium text-xs"
    >
      Pending
    </Badge>
  );
}

export function PayoutHistory() {
  const { search, setSearch } = useRouteSearch();
  const { user } = useAuth();
  const userId = user?.id;
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "completed"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const dateFilter = useDateRangeFilter();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { payouts, summary, pagination, loading, error } = usePayoutHistory({
    page: currentPage,
    limit: 10,
    status: statusFilter,
    search: search,
    ...dateFilter.getQueryParams(),
  });

  const { data: stripeStatus, isLoading: stripeStatusLoading } =
    useQuery<PayoutStatus>({
      queryKey:
        userId != null
          ? getStripePayoutStatusQueryKey(userId)
          : (["/api/stripe/payouts/status", "pending"] as const),
      queryFn: () => api.stripe.getPayoutStatus(),
      staleTime: 30 * 1000,
      enabled: userId != null,
    });

  const isStripeConnected = isStripePayoutSetupComplete(stripeStatus);

  const isStripePartiallyConnected =
    stripeStatus?.isConnected && !isStripeConnected;

  const getButtonText = () => {
    if (!stripeStatus?.isConnected) return "Set Up Payouts";
    if (isStripePartiallyConnected) return "Complete Your Setup";
    return "Manage Account";
  };

  const isPageLoading = loading || stripeStatusLoading;

  // Check if there's any data at all (regardless of filters)
  const hasAnyData = summary.pendingPayouts > 0 || summary.completedPayouts > 0;

  // Check if any filters are active
  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "all" ||
    dateFilter.value.preset !== "all";

  // Show search and filters only if there's data OR if filters are active (so user can clear them)
  const showFilters = hasAnyData || hasActiveFilters;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: "all" | "pending" | "completed") => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleViewDetails = (payout: PayoutRecord) => {
    setSelectedPayout(payout);
    setIsModalOpen(true);
  };

  const handleDateChange = (value: DateRangeValue) => {
    dateFilter.onChange(value);
    setCurrentPage(1);
  };

  const handleConnectSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: ["/api/stripe/payouts/status"],
    });
    setShowConnectModal(false);
  };

  // Handle success status from Stripe redirect
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      // Clean up URL immediately so this runs once.
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("status");
      setSearchParams(newSearchParams, { replace: true });

      // Authoritatively reconcile onboarding on return, THEN refresh status.
      // account-link makes Stripe report "already onboarded" for completed
      // accounts, which the server persists; the returned URL is ignored.
      void (async () => {
        try {
          await api.stripe.getPayoutAccountLink();
        } catch {
          // ignore — invalidate below still reflects latest server state
        }
        queryClient.invalidateQueries({
          queryKey: ["/api/stripe/payouts/status"],
        });
      })();

      toast.success("Bank account added successfully!");
    }
  }, [searchParams, queryClient, setSearchParams]);

  const columns: DataTableColumn<PayoutRecord>[] = [
    {
      key: "contact",
      header: "Contact",
      minWidth: "160px",
      render: (payout) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground truncate max-w-[140px]">
            {payout.contactName || "Unknown Contact"}
          </span>
          {payout.requester?.fullName && (
            <span className="text-xs text-muted-foreground truncate max-w-[140px] flex items-center gap-1">
              <User className="h-3 w-3" />
              {payout.requester.fullName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "meetingTitle",
      header: "Meeting Title",
      minWidth: "180px",
      render: (payout) => (
        <span className="text-sm text-foreground truncate max-w-[160px] block">
          {payout.meetingTitle || "-"}
        </span>
      ),
    },
    {
      key: "grossAmount",
      header: "Gross Amount",
      minWidth: "120px",
      render: (payout) => (
        <span className="font-medium text-foreground">
          {formatCurrency(payout.grossAmount)}
        </span>
      ),
    },
    {
      key: "creditsApplied",
      header: "Credits",
      minWidth: "100px",
      render: (payout) =>
        payout.creditsApplied && payout.creditsApplied > 0 ? (
          <span className="font-medium text-purple-600 dark:text-purple-400">
            +{formatCurrency(payout.creditsApplied)}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
    {
      key: "netAmount",
      header: "Net Payout",
      minWidth: "120px",
      render: (payout) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          +{formatCurrency(payout.netAmount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      minWidth: "100px",
      render: (payout) => getStatusBadge(payout),
    },
    {
      key: "date",
      header: "Payout Date",
      minWidth: "150px",
      render: (payout) => (
        <div className="flex flex-col">
          {payout.payoutReleased && payout.payoutReleasedAt ? (
            <span className="text-sm text-foreground whitespace-nowrap">
              {formatLocalizedShortDateTime(payout.payoutReleasedAt)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Pending
            </span>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      minWidth: "70px",
      headerClassName: "text-center",
      cellClassName: "text-center",
      render: (payout) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs font-medium"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails(payout);
          }}
          data-testid={`button-view-payout-${payout.requestId}`}
        >
          View
        </Button>
      ),
    },
  ];

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 bg-muted/20 rounded-xl">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium">Failed to load payout history</p>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!stripeStatusLoading && (
        <>
          {!stripeStatus?.isConnected ? (
            <Alert className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-background dark:from-amber-950/20 dark:to-background">
              <CreditCard className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <AlertDescription>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Set Up Payouts: Add Your Bank Account
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      To receive payouts directly to your bank account, choose
                      your country and add your bank account.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowConnectModal(true)}
                    size="sm"
                    className="sm:ml-6 shrink-0 w-full sm:w-auto bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
                  >
                    {getButtonText()}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : isStripePartiallyConnected ? (
            <Alert className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-background dark:from-amber-950/20 dark:to-background">
              <CreditCard className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <AlertDescription>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Complete Your Setup
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Your payout account is connected but requires additional
                      setup to start receiving payouts.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowConnectModal(true)}
                    size="sm"
                    className="sm:ml-6 shrink-0 w-full sm:w-auto bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
                  >
                    {getButtonText()}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <AlertDescription>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                      Payout Account Connected
                    </p>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                      Your bank account is connected. Manage your payout
                      settings and review your account status.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowConnectModal(true)}
                    size="sm"
                    className="shrink-0 w-full lg:w-auto bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
                  >
                    {getButtonText()}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      <DataTable
        data={payouts}
        columns={columns}
        loading={isPageLoading}
        emptyIcon={<DollarSign className="h-8 w-8" />}
        emptyTitle="No Payouts Found"
        emptyDescription={
          search || statusFilter !== "all"
            ? "Try adjusting your filters"
            : "Your payout history will appear here when you earn from introductions"
        }
        showSearch={false}
        pagination={pagination}
        onPageChange={handlePageChange}
        getRowKey={(payout) => payout.requestId}
        onRowClick={handleViewDetails}
        testIdPrefix="payout"
        headerContent={
          showFilters ? (
            <FinanceFilterBar
              searchValue={search}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search by contact, meeting, requester, amount, or status..."
              activeFilterCount={
                (statusFilter !== "all" ? 1 : 0) +
                (dateFilter.value.preset !== "all" ? 1 : 0)
              }
              renderInlineFilters={() => (
                <Select
                  value={statusFilter}
                  onValueChange={(v: "all" | "pending" | "completed") =>
                    handleStatusChange(v)
                  }
                >
                  <SelectTrigger
                    className="w-full rounded-xl bg-background lg:w-[140px]"
                    data-testid="select-payout-status"
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
                    testIdPrefix="payout-date"
                  />
                </div>
              )}
            />
          ) : undefined
        }
      />

      <PayoutDetailsDrawer
        payout={selectedPayout}
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedPayout(null);
          }
        }}
      />

      <StripeConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onSuccess={handleConnectSuccess}
      />
    </div>
  );
}
