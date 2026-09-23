import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { unmountProspectingQuickStart } from "@/lib/prospecting-quick-start";
import {
  mountDashboardQuickStart,
  unmountDashboardQuickStart,
  unmountRecruitingQuickStart,
} from "@/lib/recruiting-quick-start";

// eslint-disable-next-line react-refresh/only-export-components
export function isDashboardHomePath(pathname: string): boolean {
  return pathname === "/dashboard";
}

/**
 * Quick Start on the main dashboard — module picker (Recruiting / Prospecting)
 * then role-based guidelines for recruiting.
 */
export function DashboardQuickStartWidget() {
  const { pathname } = useLocation();
  const showOnThisPage = isDashboardHomePath(pathname);

  useEffect(() => {
    if (!showOnThisPage) {
      unmountDashboardQuickStart();
      return;
    }

    unmountRecruitingQuickStart();
    unmountProspectingQuickStart();
    mountDashboardQuickStart();
  }, [pathname, showOnThisPage]);

  return null;
}
