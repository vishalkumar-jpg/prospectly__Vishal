import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { withoutRouteSearch } from "./useRouteSearch";

type SlugMap = Record<string, string>;
type TabToSlugMap = Record<string, string>;

interface UseRouteTabOptions<T extends string> {
  basePath: string;
  /** Internal tab ids */
  allowedTabs: readonly T[];
  defaultTab: T;
  /** URL slug → internal tab id (when slugs differ from ids) */
  slugToTab?: SlugMap;
  /** Internal tab id → URL slug */
  tabToSlug?: TabToSlugMap;
  paramName?: string;
  /** When false, skip URL sync (for unused tab hooks on same page) */
  enabled?: boolean;
  /** Clear `?search=` when switching tabs (default: true) */
  clearSearchOnTabChange?: boolean;
}

function resolveTabFromSlug<T extends string>(
  slug: string | undefined,
  allowedTabs: readonly T[],
  defaultTab: T,
  slugToTab?: SlugMap
): T {
  if (!slug) return defaultTab;

  if (slugToTab?.[slug]) {
    const mapped = slugToTab[slug] as T;
    if (allowedTabs.includes(mapped)) return mapped;
  }

  if (allowedTabs.includes(slug as T)) return slug as T;
  return defaultTab;
}

function tabToPathSlug<T extends string>(
  tab: T,
  tabToSlug?: TabToSlugMap
): string {
  return tabToSlug?.[tab] ?? tab;
}

function isValidSlug(
  slug: string,
  allowedTabs: readonly string[],
  slugToTab?: SlugMap
): boolean {
  if (allowedTabs.includes(slug)) return true;
  if (slugToTab?.[slug] && allowedTabs.includes(slugToTab[slug])) return true;
  return false;
}

export function useRouteTab<T extends string>({
  basePath,
  allowedTabs,
  defaultTab,
  slugToTab,
  tabToSlug,
  paramName = "tab",
  enabled = true,
  clearSearchOnTabChange = true,
}: UseRouteTabOptions<T>) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const slugFromParam = params[paramName];
  const slugFromPath = location.pathname
    .slice(basePath.length)
    .replace(/^\//, "");
  const slug = slugFromParam || slugFromPath || undefined;

  const activeTab = useMemo(() => {
    if (!enabled) return defaultTab;
    return resolveTabFromSlug(slug, allowedTabs, defaultTab, slugToTab);
  }, [enabled, slug, allowedTabs, defaultTab, slugToTab]);

  useEffect(() => {
    if (!enabled) return;

    if (!slug) {
      navigate(`${basePath}/${tabToPathSlug(defaultTab, tabToSlug)}`, {
        replace: true,
      });
      return;
    }

    if (!isValidSlug(slug, allowedTabs as readonly string[], slugToTab)) {
      navigate(`${basePath}/${tabToPathSlug(defaultTab, tabToSlug)}`, {
        replace: true,
      });
    }
  }, [
    enabled,
    slug,
    basePath,
    defaultTab,
    allowedTabs,
    slugToTab,
    tabToSlug,
    navigate,
  ]);

  const setActiveTab = useCallback(
    (tab: T) => {
      if (!enabled || !allowedTabs.includes(tab)) return;
      const search = clearSearchOnTabChange
        ? withoutRouteSearch(location.search)
        : location.search;
      navigate({
        pathname: `${basePath}/${tabToPathSlug(tab, tabToSlug)}`,
        search,
      });
    },
    [
      enabled,
      allowedTabs,
      basePath,
      navigate,
      tabToSlug,
      location.search,
      clearSearchOnTabChange,
    ]
  );

  return [activeTab, setActiveTab] as const;
}
