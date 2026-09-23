import { RouteSearchInput } from "@/components/ui/route-search-input";

interface MarketplaceSearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  urgencyFilter: string[];
  setUrgencyFilter: (filter: string[]) => void;
  onClearFilters: () => void;
}

export function MarketplaceSearchBar({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  filtersOpen,
  setFiltersOpen,
  urgencyFilter,
  setUrgencyFilter,
  onClearFilters,
}: MarketplaceSearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Search */}
      <RouteSearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search by name, company, or meeting topic..."
        className="flex-1"
        inputClassName="h-12 pl-11"
        aria-label="Search opportunities"
      />
    </div>
  );
}
