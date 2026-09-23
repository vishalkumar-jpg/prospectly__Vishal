import { QueryClient } from "@tanstack/react-query";
import { apiRequestForQuery } from "./api";

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: async ({ queryKey }) => {
          return apiRequestForQuery(queryKey);
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
      },
    },
  });
}

export const queryClient = createAppQueryClient();
