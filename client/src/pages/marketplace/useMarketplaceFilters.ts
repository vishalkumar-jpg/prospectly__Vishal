import { useState, useMemo } from "react";
import { useMarketplaceBrowse } from "@/hooks/useMarketplaceBrowse";
import { transformBackendRequestsToFrontend } from "@/lib/marketplace-transformers";
import { useRouteSearch } from "@/hooks/useRouteSearch";

export function useMarketplaceFilters() {
  const { search: searchTerm, setSearch: setSearchTerm } = useRouteSearch();
  const [urgencyFilter, setUrgencyFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("bounty-high");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch data from API with filters
  const { requests, total, loading, error, refetch } = useMarketplaceBrowse({
    page,
    limit: 50, // Fetch more to allow client-side search filtering
    sortBy,
    urgency: urgencyFilter.length > 0 ? urgencyFilter[0] : undefined,
  });

  // Transform backend data to frontend format
  const transformedRequests = useMemo(() => {
    return transformBackendRequestsToFrontend(requests as never[]);
  }, [requests]);

  // Apply client-side search filtering (backend doesn't support text search)
  const filteredDeals = useMemo(() => {
    if (!searchTerm) return transformedRequests;

    const searchLower = searchTerm.toLowerCase();
    return transformedRequests.filter((request) => {
      return (
        request.prospect.name.toLowerCase().includes(searchLower) ||
        request.prospect.company.toLowerCase().includes(searchLower) ||
        request.prospect.title.toLowerCase().includes(searchLower) ||
        request.meetingAgenda.title.toLowerCase().includes(searchLower) ||
        request.meetingAgenda.description.toLowerCase().includes(searchLower)
      );
    });
  }, [transformedRequests, searchTerm]);

  const clearFilters = () => {
    setSearchTerm("");
    setUrgencyFilter([]);
    setPage(1);
  };

  const hasActiveFilters: boolean = !!searchTerm || urgencyFilter.length > 0;

  return {
    // Filter state
    searchTerm,
    setSearchTerm,
    urgencyFilter,
    setUrgencyFilter,
    sortBy,
    setSortBy,
    filtersOpen,
    setFiltersOpen,
    // Pagination
    page,
    setPage,
    total,
    // Derived
    filteredDeals,
    totalDeals: transformedRequests.length,
    hasActiveFilters,
    clearFilters,
    // Loading/error state
    loading,
    error,
    refetch,
  };
}
