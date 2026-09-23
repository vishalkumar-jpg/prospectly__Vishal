import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "@/components/ui/loader";
import { AppModule, hasModuleAccess } from "@/lib/modules";
import ModuleAccessDenied from "@/pages/ModuleAccessDenied";

interface ModuleAccessRouteProps {
  module: AppModule;
  children: React.ReactNode;
}

/**
 * Guards a group of routes behind organisation module access. Renders a
 * friendly "access restricted" page instead of the route when the user's
 * organisation has not been granted the module. Always nest this inside
 * `ProtectedRoute` so authentication is already resolved.
 */
export function ModuleAccessRoute({
  module,
  children,
}: ModuleAccessRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader fullPage />;
  }

  if (!hasModuleAccess(user?.accessibleModules, module)) {
    return <ModuleAccessDenied />;
  }

  return <>{children}</>;
}
