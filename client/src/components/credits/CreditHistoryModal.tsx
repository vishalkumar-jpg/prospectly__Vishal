import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Coins, X } from "lucide-react";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import type {
  CreditHistoryItem,
  CreditHistoryResponse,
} from "@/lib/api/credits";
import { toUTC } from "@/lib/dayjs";

interface CreditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getProviderLabel = (provider: string) => {
  const labels: Record<string, string> = {
    google: "Google Contacts",
    apple: "Apple Contacts",
    microsoft: "Microsoft Contacts",
    linkedin: "LinkedIn",
  };
  return labels[provider.toLowerCase()] || provider;
};

const getImportEvidenceThreshold = (
  evidence: CreditHistoryItem["evidence"]
): number | undefined => {
  if (!evidence || typeof evidence !== "object" || !("threshold" in evidence)) {
    return undefined;
  }
  const raw = (evidence as { threshold?: unknown }).threshold;
  if (raw === undefined || raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

const formatImportEarnedContactsLine = (
  item: CreditHistoryItem
): string | null => {
  const threshold = getImportEvidenceThreshold(item.evidence);
  if (threshold === undefined) return null;
  return `Threshold: ${String(threshold)} contacts`;
};

export function CreditHistoryModal({
  isOpen,
  onClose,
}: CreditHistoryModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading, isError, isFetching } =
    useQuery<CreditHistoryResponse>({
      queryKey: ["/api/credits/me/history", currentPage, itemsPerPage],
      queryFn: async () => {
        return api.credits.getMyHistory(
          itemsPerPage,
          (currentPage - 1) * itemsPerPage
        );
      },
      enabled: isOpen,
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    });

  // Reset to page 1 when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [isOpen]);

  const history = data?.history || [];
  const pagination = data?.pagination;
  const displayHistory = isLoading || isFetching ? [] : history;
  const totalPages = pagination?.totalPages || 1;
  const hasNextPage = pagination?.hasNextPage || false;
  const hasPrevPage = pagination?.hasPrevPage || false;

  const getVisiblePages = () => {
    const pages: number[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push(-1);
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push(-1);
      }
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        mobileFullscreen
        hideCloseButton
      >
        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3.5 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Coins className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                Credit History
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-relaxed text-white/90">
                A detailed log of your earned and used credits.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-auto p-5 sm:p-6">
            <Table className="w-full max-sm:min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="max-sm:w-[96px] max-sm:px-2">
                    Date
                  </TableHead>
                  <TableHead className="max-sm:w-[100px] max-sm:px-2">
                    Type
                  </TableHead>
                  <TableHead className="max-sm:min-w-[220px] max-sm:px-2">
                    Details
                  </TableHead>
                  <TableHead className="text-right max-sm:w-[110px] max-sm:px-2">
                    Amount
                  </TableHead>
                  <TableHead className="text-right max-sm:w-[100px] max-sm:px-2">
                    Balance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isFetching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : displayHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      {isError
                        ? "Failed to load credit history."
                        : "No credit history found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayHistory.map((item, index) => {
                    const importContactsLine =
                      formatImportEarnedContactsLine(item);
                    return (
                      <TableRow key={`${item.id}-${index}`}>
                        <TableCell className="whitespace-nowrap max-sm:px-2 max-sm:py-3">
                          {formatLocalizedShortDateTime(toUTC(item.createdAt))}
                        </TableCell>
                        <TableCell className="max-sm:px-2 max-sm:py-3">
                          <Badge
                            className={cn(
                              item.transactionType === "earned"
                                ? "bg-brand-success/15 text-brand-success hover:bg-brand-success hover:text-brand-foreground"
                                : "bg-brand-warning/15 text-brand-warning hover:bg-brand-warning hover:text-brand-foreground"
                            )}
                          >
                            {item.transactionType === "earned"
                              ? "Earned"
                              : "Used"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs max-sm:min-w-[220px] max-sm:px-2 max-sm:py-3">
                          {item.transactionType === "earned" ? (
                            <div className="space-y-0.5">
                              <div className="font-medium text-foreground">
                                {item.provider
                                  ? getProviderLabel(item.provider)
                                  : "Contact Import"}
                              </div>
                              {importContactsLine && (
                                <div className="text-sm text-muted-foreground">
                                  {importContactsLine}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="font-medium text-foreground">
                                {item.introductionTitle ||
                                  "Introduction Payout"}
                              </div>
                              {item.requesterName && (
                                <div className="text-sm text-muted-foreground">
                                  Requester: {item.requesterName}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap max-sm:px-2 max-sm:py-3">
                          <span
                            className={cn(
                              "font-medium",
                              item.transactionType === "earned"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-orange-600 dark:text-orange-400"
                            )}
                          >
                            {item.transactionType === "earned" ? "+" : "-"}
                            {formatCurrency(item.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold whitespace-nowrap max-sm:px-2 max-sm:py-3">
                          {formatCurrency(item.balanceAfter)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination Controls */}
          {history.length > 0 && (
            <div className="flex shrink-0 items-center justify-center border-t border-border bg-card p-4 sm:justify-end">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      className={cn(
                        !hasPrevPage || isLoading || isFetching
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                      )}
                    />
                  </PaginationItem>
                  {getVisiblePages().map((page, index) => {
                    if (page === -1) {
                      return (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className={cn(
                            "cursor-pointer hover:bg-brand-amethyst/10 hover:text-brand-amethyst",
                            "aria-[current=page]:border-transparent aria-[current=page]:bg-brand-gradient aria-[current=page]:text-brand-foreground aria-[current=page]:shadow-brand-cta aria-[current=page]:hover:text-brand-foreground"
                          )}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      className={cn(
                        !hasNextPage || isLoading || isFetching
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
