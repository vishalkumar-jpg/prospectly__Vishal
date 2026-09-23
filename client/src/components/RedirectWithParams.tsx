import { Navigate, useParams, useLocation } from "react-router-dom";
import { generatePath } from "react-router-dom";

interface RedirectWithParamsProps {
  to: string;
  replace?: boolean;
}

/**
 * A component that redirects while preserving URL parameters and query strings.
 * This is useful for legacy redirects that need to maintain the original route params.
 */
export function RedirectWithParams({ to, replace = true }: RedirectWithParamsProps) {
  const params = useParams();
  const location = useLocation();
  
  // Generate the new path with the current parameters
  const generatedPath = generatePath(to, params);
  
  // Append the query string to preserve it
  const destination = generatedPath + location.search;
  
  return <Navigate to={destination} replace={replace} />;
}
