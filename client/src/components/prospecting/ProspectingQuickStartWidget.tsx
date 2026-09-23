import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  mountProspectingQuickStart,
  unmountProspectingQuickStart,
} from "@/lib/prospecting-quick-start";
import { unmountRecruitingQuickStart } from "@/lib/recruiting-quick-start";

const PROSPECTING_MODULE_PREFIXES = [
  "/prospecting/find-prospects",
  "/prospecting/my-prospects",
  "/prospecting/incoming-requests",
  "/prospecting/opportunities",
  "/prospecting/transactions",
] as const;

// eslint-disable-next-line react-refresh/only-export-components
export function isProspectingModulePath(pathname: string): boolean {
  return PROSPECTING_MODULE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Floating Quick Start walkthrough on all prospecting modules.
 * Loaded as a typed TS module (not /public script).
 */
export function ProspectingQuickStartWidget() {
  const { pathname } = useLocation();
  const showOnThisPage = isProspectingModulePath(pathname);

  useEffect(() => {
    if (!showOnThisPage) {
      unmountProspectingQuickStart();
      return;
    }

    // Recruiting QS uses the same DOM ids — tear it down before mounting prospecting.
    unmountRecruitingQuickStart();
    mountProspectingQuickStart();
    return () => {
      unmountProspectingQuickStart();
    };
  }, [pathname, showOnThisPage]);

  return null;
}
