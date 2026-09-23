import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  recruitmentCandidateSearchApi,
  type CreateSavedSearchInput,
  type SavedCandidateSearch,
} from "@/lib/api/recruitment-candidate-search";
import {
  blankCriteria,
  type CandidateSearchCriteria,
} from "@/lib/recruitment/candidate-search.criteria";

/**
 * Its own key, not a child of the search key: the search invalidates on every
 * applied change and the saved list has no reason to refetch with it.
 */
export const SAVED_SEARCHES_QUERY_KEY =
  "/api/recruitment/cross-job-candidate-search/saved";

const EMPTY: SavedCandidateSearch[] = [];

/**
 * A stored criteria object filled out to the shape the page needs.
 *
 * Stored criteria can predate a field — a search saved before `workModes`
 * existed has no `workModes` key — and spreading a partial straight into the URL
 * encoder would throw on the first `.join()`. `blankCriteria()` is the same
 * "off" definition the rest of the feature uses, so a stale search degrades to a
 * valid search instead of taking the page down.
 */
export function savedSearchCriteria(
  saved: SavedCandidateSearch
): CandidateSearchCriteria {
  return { ...blankCriteria(), ...saved.criteria, page: 1 };
}

function failed(title: string) {
  return (error: unknown) =>
    toast({
      variant: "destructive",
      title,
      description:
        error instanceof Error
          ? error.message
          : "Please try again in a moment.",
    });
}

/**
 * The recruiter's saved candidate searches, plus the four writes the card needs.
 *
 * Every mutation invalidates the one list key — favourite reorders it, rename
 * retitles it, delete removes a row, and create adds one, so none of them can be
 * settled from the local copy alone.
 */
export function useSavedSearches(enabled = true) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [SAVED_SEARCHES_QUERY_KEY] });

  const query = useQuery({
    queryKey: [SAVED_SEARCHES_QUERY_KEY],
    queryFn: () => recruitmentCandidateSearchApi.listSavedSearches(),
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const create = useMutation({
    mutationFn: (input: CreateSavedSearchInput) =>
      recruitmentCandidateSearchApi.createSavedSearch(input),
    onSuccess: (saved) => {
      invalidate();
      toast({
        title: "Search saved",
        description: `“${saved?.title ?? "Your search"}” is ready to rerun.`,
      });
    },
    onError: failed("Could not save this search"),
  });

  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      recruitmentCandidateSearchApi.renameSavedSearch(id, title),
    onSuccess: invalidate,
    onError: failed("Could not rename this search"),
  });

  const toggleFavorite = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      recruitmentCandidateSearchApi.favoriteSavedSearch(id, isFavorite),
    onSuccess: invalidate,
    onError: failed("Could not update this search"),
  });

  /**
   * Records the run server-side and hands back the row to apply. The response
   * wins over the local copy when it carries criteria, so a search edited in
   * another tab reruns as it now stands, not as this tab last saw it.
   */
  const run = useMutation({
    mutationFn: (saved: SavedCandidateSearch) =>
      recruitmentCandidateSearchApi
        .runSavedSearch(saved.id)
        .then((fresh) => fresh ?? saved)
        // A failed bookkeeping call must not stop the recruiter running their
        // own search — the criteria are already on the client.
        .catch(() => saved),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      recruitmentCandidateSearchApi.deleteSavedSearch(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Saved search deleted" });
    },
    onError: failed("Could not delete this search"),
  });

  return {
    // A list endpoint that has not shipped yet, or a shape change, must render
    // as "none saved" rather than crash the page it sits on.
    savedSearches: Array.isArray(query.data) ? query.data : EMPTY,
    loading: enabled && query.isLoading,
    error: enabled ? query.error : null,
    refetch: query.refetch,
    create,
    rename,
    toggleFavorite,
    run,
    remove,
  } as const;
}
