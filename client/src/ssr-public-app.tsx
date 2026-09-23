import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { StaticRouter } from "react-router-dom/server";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import PublicJobPage from "@/pages/recruitment/PublicJobPage";
import PublicRequestPage from "@/pages/PublicRequestPage";

type SsrPublicAppProps = {
  location: string;
  queryClient: QueryClient;
};

/** Minimal app shell for public SSR routes — avoids App Suspense + lazy route tree. */
export function SsrPublicApp({ location, queryClient }: SsrPublicAppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider ssrMode>
          <StaticRouter location={location}>
            <Routes>
              <Route path="/jobs/:shareCode" element={<PublicJobPage />} />
              <Route
                path="/request/:requestId/:sharerCode"
                element={<PublicRequestPage />}
              />
            </Routes>
          </StaticRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
