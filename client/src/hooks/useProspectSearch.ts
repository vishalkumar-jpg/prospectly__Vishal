import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UseProspectSearchParams {
  name?: string;
  title?: string;
  company?: string;
  website?: string;
  location?: string;
  linkedinUrl?: string;
  email?: string;
  limit?: number;
  enabled?: boolean;
  engine?: "typesense" | "global";
}

export function getProspectSearchQueryKey({
  name,
  title,
  company,
  website,
  location,
  linkedinUrl,
  email,
  limit = 50,
  engine = "typesense",
}: UseProspectSearchParams) {
  const path =
    engine === "global"
      ? "/api/contacts/search-global"
      : "/api/typesense/search/contacts";
  return [
    path,
    { name, title, company, website, location, linkedinUrl, email, limit },
  ] as const;
}

export function useProspectSearch(params: UseProspectSearchParams) {
  const {
    name,
    title,
    company,
    website,
    location,
    linkedinUrl,
    email,
    limit = 50,
    enabled = false,
    engine = "typesense",
  } = params;

  const {
    data,
    isLoading,
    error,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: getProspectSearchQueryKey({
      name,
      title,
      company,
      website,
      location,
      linkedinUrl,
      email,
      limit,
      engine,
    }),
    queryFn: ({ pageParam }) => {
      if (engine === "global") {
        return api.contacts
          .searchGlobal({
            linkedinUrl,
            name,
            email,
            company,
            website,
            limit,
          })
          .then((response) => ({
            contacts: response.contacts,
            count: response.count,
            query: response.query,
            hasNextPage: false,
          }));
      }

      return api.contacts.searchTypesense({
        name,
        title,
        company,
        website,
        location,
        linkedinUrl,
        limit,
        page: pageParam,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNextPage ? lastPageParam + 1 : undefined,
    enabled,
    staleTime: 60 * 1000,
  });

  const contacts = data?.pages.flatMap((page) => page.contacts) ?? [];
  const pageCount = data?.pages.length ?? 0;

  return {
    contacts,
    pageCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error,
    isError,
  };
}
