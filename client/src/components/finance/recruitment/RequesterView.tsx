import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import {
  useDateRangeFilter,
  DateRangeValue,
} from "@/components/ui/date-range-picker";
import {
  useRequesterSpending,
  type RequesterSpendingFilters,
} from "@/hooks/useRequesterSpending";
import { RequesterSpendingFilters as Filters } from "./RequesterSpendingFilters";
import { RequesterSpendingTable } from "./RequesterSpendingTable";
import { RequesterSpendingModal } from "./RequesterSpendingModal";
import { Loader } from "@/components/ui/loader";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";

interface RequesterViewProps {
  isActive: boolean;
}

export function RequesterView({ isActive }: RequesterViewProps) {
  const navigate = useNavigate();
  const { search: searchInput, setSearch: setSearchInput } = useRouteSearch();
  const [filters, setFilters] = useState<RequesterSpendingFilters>({
    page: 1,
    limit: 10,
    status: "all",
    search: "",
    sortBy: "date",
    sortOrder: "desc",
    datePreset: "all",
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dateFilter = useDateRangeFilter();

  const { jobs, pagination, isFetching } = useRequesterSpending(
    { ...filters, search: searchInput, ...dateFilter.getQueryParams() },
    { enabled: isActive }
  );

  const hasAnyData = pagination.total > 0;
  const hasActiveFilters =
    searchInput !== "" ||
    filters.status !== "all" ||
    dateFilter.value.preset !== "all";
  const showFilters = hasAnyData || hasActiveFilters;

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value, page: 1 }));
  };

  const handleDateChange = (value: DateRangeValue) => {
    dateFilter.onChange(value);
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleViewDetail = (id: string) => {
    setSelectedId(id);
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className="rounded-2xl border border-border shadow-md bg-white">
        <CardContent className="p-4 md:p-6 pt-6 space-y-5">
          {showFilters && (
            <Filters
              search={searchInput}
              status={filters.status ?? "all"}
              dateValue={dateFilter.value}
              onSearchChange={handleSearchChange}
              onStatusChange={handleStatusChange}
              onDateChange={handleDateChange}
            />
          )}

          {isFetching && !jobs.length ? (
            <Loader message="Loading spending records..." size="lg" />
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                <Receipt className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                No Spending Records Found
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Your spending history will appear here once you shortlist candidates"}
              </p>
              {!hasActiveFilters && (
                <Button
                  variant="brand"
                  className="mt-4"
                  onClick={() => navigate(TAB_ROUTE_BASES.myJobPosts)}
                >
                  My Job Posts
                </Button>
              )}
            </div>
          ) : (
            <RequesterSpendingTable
              jobs={jobs}
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              onViewDetail={handleViewDetail}
            />
          )}
        </CardContent>
      </Card>

      <RequesterSpendingModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setSelectedId(null);
        }}
        transactionId={selectedId}
      />
    </>
  );
}
