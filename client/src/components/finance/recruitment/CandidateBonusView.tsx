import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";
import {
  useDateRangeFilter,
  DateRangeValue,
} from "@/components/ui/date-range-picker";
import {
  useCandidateBonus,
  type CandidateBonusFilters as CandidateBonusFiltersType,
} from "@/hooks/useCandidateBonus";
import { CandidateBonusFilters } from "./CandidateBonusFilters";
import { CandidateBonusTable } from "./CandidateBonusTable";
import { CandidateBonusModal } from "./CandidateBonusModal";
import { Loader } from "@/components/ui/loader";

interface CandidateBonusViewProps {
  isActive: boolean;
}

export function CandidateBonusView({ isActive }: CandidateBonusViewProps) {
  const [filters, setFilters] = useState<CandidateBonusFiltersType>({
    page: 1,
    limit: 10,
    status: "all",
    search: "",
    sortBy: "date",
    sortOrder: "desc",
    datePreset: "all",
  });

  const [searchInput, setSearchInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dateFilter = useDateRangeFilter();

  const { bonuses, pagination, isFetching } = useCandidateBonus(
    { ...filters, ...dateFilter.getQueryParams() },
    { enabled: isActive }
  );

  const hasAnyData = pagination.total > 0;
  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    dateFilter.value.preset !== "all";
  const showFilters = hasAnyData || hasActiveFilters;

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value, page: 1 }));
  };

  const handleDateChange = (value: DateRangeValue) => {
    dateFilter.onChange(value);
    setFilters((prev) => ({ ...prev, page: 1 }));
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
            <CandidateBonusFilters
              search={searchInput}
              status={filters.status ?? "all"}
              dateValue={dateFilter.value}
              onSearchChange={handleSearchChange}
              onStatusChange={handleStatusChange}
              onDateChange={handleDateChange}
            />
          )}

          {isFetching && !bonuses.length ? (
            <Loader message="Loading your bonuses..." size="lg" />
          ) : bonuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                <Award className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Bonuses Yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Your success bonuses will appear here once you're hired and onboarded"}
              </p>
            </div>
          ) : (
            <CandidateBonusTable
              bonuses={bonuses}
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

      <CandidateBonusModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setSelectedId(null);
        }}
        bonusId={selectedId}
      />
    </>
  );
}
