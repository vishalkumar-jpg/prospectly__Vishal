import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import {
  useDateRangeFilter,
  DateRangeValue,
} from "@/components/ui/date-range-picker";
import {
  useConnectorEarning,
  type ConnectorEarningFilters as ConnectorEarningFiltersType,
} from "@/hooks/useConnectorEarning";
import { ConnectorEarningFilters } from "./ConnectorEarningFilters";
import { ConnectorEarningTable } from "./ConnectorEarningTable";
import { ConnectorEarningModal } from "./ConnectorEarningModal";
import { Loader } from "@/components/ui/loader";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";

interface ConnectorViewProps {
  isActive: boolean;
}

export function ConnectorView({ isActive }: ConnectorViewProps) {
  const navigate = useNavigate();
  const { search: searchInput, setSearch: setSearchInput } = useRouteSearch();
  const [filters, setFilters] = useState<ConnectorEarningFiltersType>({
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

  const { jobs, pagination, isFetching } = useConnectorEarning(
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

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder:
        prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc",
      page: 1,
    }));
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
            <ConnectorEarningFilters
              search={searchInput}
              status={filters.status ?? "all"}
              dateValue={dateFilter.value}
              onSearchChange={handleSearchChange}
              onStatusChange={handleStatusChange}
              onDateChange={handleDateChange}
            />
          )}

          {isFetching && !jobs.length ? (
            <Loader message="Loading your earnings..." size="lg" />
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                <Wallet className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Earnings Yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Your earnings will appear here once a candidate you connected is shortlisted"}
              </p>
              {!hasActiveFilters && (
                <Button
                  variant="brand"
                  className="mt-4"
                  onClick={() =>
                    navigate(`${TAB_ROUTE_BASES.referCandidates}/inbox`)
                  }
                >
                  Refer Candidates
                </Button>
              )}
            </div>
          ) : (
            <ConnectorEarningTable
              jobs={jobs}
              sortBy={filters.sortBy ?? "date"}
              sortOrder={filters.sortOrder ?? "desc"}
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onSort={handleSort}
              onPageChange={handlePageChange}
              onViewDetail={handleViewDetail}
            />
          )}
        </CardContent>
      </Card>

      <ConnectorEarningModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setSelectedId(null);
        }}
        earningId={selectedId}
      />
    </>
  );
}
