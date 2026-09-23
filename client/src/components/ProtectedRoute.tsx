import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Loader } from "@/components/ui/loader";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = "/signin",
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader fullPage />;
  }

  if (!user) {
    const requested = location.pathname + location.search;
    const target =
      requested && requested !== "/"
        ? `${redirectTo}?returnTo=${encodeURIComponent(requested)}`
        : redirectTo;
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
