import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  mountRecruitingQuickStart,
  unmountRecruitingQuickStart,
} from "@/lib/recruiting-quick-start";
import { unmountProspectingQuickStart } from "@/lib/prospecting-quick-start";

const RECRUITING_MODULE_PREFIXES = [
  "/recruiting/post-a-job",
  "/recruiting/my-job-posts",
  "/recruiting/refer-candidates",
  "/recruiting/job-marketplace",
  "/recruiting/transactions",
  "/recruiting/my-applications",
] as const;

// eslint-disable-next-line react-refresh/only-export-components
export function isRecruitingModulePath(pathname: string): boolean {
  return RECRUITING_MODULE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Floating Quick Start walkthrough on all 6 recruiting modules.
 * Loaded as a typed TS module (not /public script).
 */
export function RecruitingQuickStartWidget() {
  const { pathname } = useLocation();
  const showOnThisPage = isRecruitingModulePath(pathname);

  useEffect(() => {
    if (!showOnThisPage) {
      unmountRecruitingQuickStart();
      return;
    }

    // Prospecting QS uses the same DOM ids — tear it down before mounting recruiting.
    unmountProspectingQuickStart();
    mountRecruitingQuickStart();
    return () => {
      unmountRecruitingQuickStart();
    };
  }, [pathname, showOnThisPage]);

  return null;
}
