import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  RefreshCw,
  CreditCard,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ResponsivePagination } from "@/components/ui/responsive-pagination";
import { api } from "@/lib/api";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { AnyType } from "@/types/common";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  transactionType: string;
  fromPlan: { id: string; name: string } | null;
  toPlan: { id: string; name: string } | null;
  amount: number | null;
  currency?: string | null;
  stripeEventId: string | null;
  metadata: {
    interval?: string;
    from_interval?: string;
    [key: string]: AnyType;
  };
  createdAt: string;
}

interface SubscriptionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionHistoryDialog({
  open,
  onOpenChange,
}: SubscriptionHistoryDialogProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery<{
    transactions: Transaction[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/subscriptions/history", page, limit],
    queryFn: async () => {
      return api.subscriptions.getHistory(page, limit);
    },
    enabled: open,
  });

  const meta = data?.meta;
  const transactions = data?.transactions || [];

  // Clamp page to valid range when meta or limit changes
  useEffect(() => {
    if (meta) {
      if (meta.total === 0) {
        if (page !== 1) setPage(1);
      } else {
        const clampedPage = Math.max(1, Math.min(page, meta.totalPages || 1));
        if (clampedPage !== page) {
          setPage(clampedPage);
        }
      }
    }
  }, [meta?.total, meta?.totalPages, page]);

  const formatDate = (dateString: string) => {
    return formatLocalizedShortDateTime(dateString);
  };

  const getTypeBadge = (type: string) => {
    const baseClasses =
      "px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider transition-all";
    switch (type.toLowerCase()) {
      case "created":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClasses,
              "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-emerald-50 border-emerald-100"
            )}
          >
            Created
          </Badge>
        );
      case "upgraded":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClasses,
              "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-blue-50 border-blue-100"
            )}
          >
            Upgraded
          </Badge>
        );
      case "downgraded":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClasses,
              "bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-orange-50 border-orange-100"
            )}
          >
            Downgraded
          </Badge>
        );
      case "canceled":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClasses,
              "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-rose-50 border-rose-100"
            )}
          >
            Canceled
          </Badge>
        );
      case "renewed":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClasses,
              "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-indigo-50 border-indigo-100"
            )}
          >
            Renewed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className={baseClasses}>
            {type}
          </Badge>
        );
    }
  };

  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, meta?.total ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl w-full max-lg:inset-0 max-lg:left-0 max-lg:top-0 max-lg:translate-x-0 max-lg:translate-y-0 max-lg:max-w-full max-lg:h-full max-lg:rounded-none flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl lg:w-[95vw] lg:h-[90vh]"
        mobileFullscreen
      >
        <DialogHeader className="pt-6 px-4 sm:pt-8 sm:px-6 lg:p-8 pb-0 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 ring-8 ring-primary/5 group">
                <History className="h-6 w-6 text-primary transition-transform group-hover:rotate-12" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                  Subscription History
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500">
                  Track your billing lifecycle and plan transitions
                  pro-actively.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-5">
              <div className="relative">
                <RefreshCw className="h-12 w-12 text-primary animate-spin opacity-20" />
                <History className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Gathering records...
              </p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center p-12 animate-in fade-in zoom-in duration-300">
              <div className="h-24 w-24 rounded-[2rem] bg-rose-50 flex items-center justify-center mb-2 ring-8 ring-rose-50/30">
                <AlertTriangle className="h-10 w-10 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800">
                  Failed to Load History
                </h3>
                <p className="text-sm font-medium text-slate-500 max-w-sm">
                  {error instanceof Error
                    ? error.message
                    : "An unexpected error occurred while fetching your subscription history."}
                </p>
              </div>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="mt-2 border-rose-200 hover:bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-rose-50 hover:text-rose-700 font-semibold px-8 h-11"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : transactions.length > 0 ? (
            <>
              {/* Desktop Table View - Hidden on mobile/tablet */}
              <div className="hidden lg:block overflow-auto">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="py-4 px-8 text-sm font-semibold text-slate-600 w-[220px]">
                        Date
                      </TableHead>
                      <TableHead className="py-4 px-8 text-sm font-semibold text-slate-600 text-center">
                        Event
                      </TableHead>
                      <TableHead className="py-4 px-8 text-sm font-semibold text-slate-600 text-center w-[350px]">
                        Plan Transition
                      </TableHead>
                      <TableHead className="py-4 px-8 text-sm font-semibold text-slate-600 text-center">
                        Value
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow
                        key={tx.id}
                        className="group transition-colors border-b border-border/50 hover:bg-muted/30 cursor-default"
                      >
                        <TableCell className="py-4 px-8 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-600 group-hover:text-primary transition-colors">
                            {formatDate(tx.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 px-8 text-center">
                          <div className="flex justify-center">
                            {getTypeBadge(tx.transactionType)}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-8 text-center">
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 max-w-[240px] mx-auto">
                            <div className="flex flex-col items-start min-w-[90px]">
                              <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-0.5">
                                From
                              </span>
                              <div
                                className={cn(
                                  "text-xs font-semibold px-2 py-1.5 rounded-lg border w-[90px] h-[40px] flex flex-col items-center justify-center gap-0.5",
                                  tx.fromPlan
                                    ? "text-foreground bg-muted border-border"
                                    : "bg-muted/50 border-transparent"
                                )}
                              >
                                {tx.fromPlan ? (
                                  <span>{tx.fromPlan.name}</span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/70 font-normal uppercase leading-none ">
                                    None
                                  </span>
                                )}
                                {tx.fromPlan && tx.metadata?.from_interval && (
                                  <span className="text-[10px] text-muted-foreground/70 font-normal uppercase leading-none">
                                    (
                                    {tx.metadata.from_interval === "year"
                                      ? "Yearly"
                                      : "Monthly"}
                                    )
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-center pt-2 px-1">
                              <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                            </div>

                            <div className="flex flex-col items-start text-left min-w-[90px]">
                              <span className="text-[10px] font-bold tracking-wider uppercase text-primary mb-0.5">
                                To
                              </span>
                              <div className="text-xs font-bold text-slate-900 bg-primary/10 text-primary border border-primary/20 px-2 py-1.5 rounded-lg uppercase tracking-tight w-[90px] h-[40px] flex flex-col items-center justify-center gap-0.5">
                                <span>
                                  {tx.toPlan ? tx.toPlan.name : "N/A"}
                                </span>
                                {tx.toPlan && tx.metadata?.interval && (
                                  <span className="text-[10px] text-primary/70 font-normal uppercase leading-none">
                                    (
                                    {tx.metadata.interval === "year"
                                      ? "Yearly"
                                      : "Monthly"}
                                    )
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-8 text-center">
                          <div className="inline-flex flex-col">
                            <span className="text-sm font-bold text-blue-600 hover:bg-blue-600 hover:text-blue-50 bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100/50">
                              {tx.amount !== null
                                ? tx.amount.toLocaleString(undefined, {
                                    style: "currency",
                                    currency: (
                                      tx.currency ?? "USD"
                                    ).toUpperCase(),
                                    currencyDisplay: "narrowSymbol",
                                  })
                                : "—"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet Card View - Hidden on desktop */}
              <div className="lg:hidden overflow-auto px-2 sm:px-4 py-4 space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 mb-1">
                          {formatDate(tx.createdAt)}
                        </p>
                        <div className="flex items-center gap-2">
                          {getTypeBadge(tx.transactionType)}
                        </div>
                      </div>
                      {tx.amount !== null && (
                        <div className="text-right">
                          <span className="text-base font-bold text-blue-600 bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100/50">
                            {tx.amount.toLocaleString(undefined, {
                              style: "currency",
                              currency: (tx.currency ?? "USD").toUpperCase(),
                              currencyDisplay: "narrowSymbol",
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border/50">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                            From
                          </span>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-primary">
                            To
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={cn(
                              "flex-1 text-xs font-semibold px-2 py-1.5 rounded-lg border h-[48px] flex flex-col items-center justify-center gap-0.5",
                              tx.fromPlan
                                ? "text-foreground bg-muted border-border"
                                : "bg-muted/50 border-transparent"
                            )}
                          >
                            {tx.fromPlan ? (
                              <span>{tx.fromPlan.name}</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/70 font-normal uppercase leading-none">
                                None
                              </span>
                            )}
                            {tx.fromPlan && tx.metadata?.from_interval && (
                              <span className="text-[10px] text-muted-foreground/70 font-normal uppercase leading-none">
                                (
                                {tx.metadata.from_interval === "year"
                                  ? "Yearly"
                                  : "Monthly"}
                                )
                              </span>
                            )}
                          </div>

                          <ArrowRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />

                          <div className="flex-1 text-xs font-bold text-slate-900 bg-primary/10 text-primary border border-primary/20 px-2 py-1.5 rounded-lg uppercase tracking-tight h-[48px] flex flex-col items-center justify-center gap-0.5">
                            <span>{tx.toPlan ? tx.toPlan.name : "N/A"}</span>
                            {tx.toPlan && tx.metadata?.interval && (
                              <span className="text-[10px] text-primary/70 font-normal uppercase leading-none">
                                (
                                {tx.metadata.interval === "year"
                                  ? "Yearly"
                                  : "Monthly"}
                                )
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
              <div className="h-24 w-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center mb-6 ring-8 ring-indigo-50/30">
                <CreditCard className="h-10 w-10 text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                No Records Found
              </h3>
              <p className="text-sm font-medium text-slate-500 max-w-xs mt-2">
                We haven't recorded any transaction or plan change activity yet.
              </p>
            </div>
          )}
        </div>

        {meta && meta.total > 0 && (
          <ResponsivePagination
            currentPage={page}
            totalPages={meta.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            totalItems={meta.total}
            startIndex={startIndex}
            endIndex={endIndex}
            onItemsPerPageChange={(v) => {
              setLimit(Number(v));
              setPage(1);
            }}
            itemLabel="records"
            itemsPerPageSelectId="subscription-history-items-per-page"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
