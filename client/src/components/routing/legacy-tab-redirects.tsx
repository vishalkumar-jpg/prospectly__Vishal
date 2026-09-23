import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { APP_MODULES, hasModuleAccess } from "@/lib/modules";
import {
  MY_PROSPECTS_TAB_TO_SLUG,
  PROSPECTING_FINANCE_TAB_TO_SLUG,
  PROFILE_SECTION_TO_SLUG,
  RECRUITING_FINANCE_TAB_TO_SLUG,
  TAB_ROUTE_BASES,
} from "@/lib/tab-routes";

/** /transactions?section=&tab= → /prospecting|recruiting/transactions/:tab */
export function LegacyTransactionsRedirect() {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const section = searchParams.get("section") ?? "prospecting";
  const tab = searchParams.get("tab") ?? "overview";
  const canAccessRecruiting = hasModuleAccess(
    user?.accessibleModules,
    APP_MODULES.RECRUITING
  );

  if (section === "recruitment" && authLoading) {
    return null;
  }

  if (section === "recruitment" && canAccessRecruiting) {
    const internal =
      tab === "requester" || tab === "requester-spending"
        ? "requester"
        : "connector";
    const slug =
      RECRUITING_FINANCE_TAB_TO_SLUG[
        internal as keyof typeof RECRUITING_FINANCE_TAB_TO_SLUG
      ];
    return (
      <Navigate
        to={`${TAB_ROUTE_BASES.recruitingTransactions}/${slug}`}
        replace
      />
    );
  }

  // Recruitment section denied — fall back to prospecting (develop behaviour)
  if (section === "recruitment" && !canAccessRecruiting) {
    const prospectingSlug =
      PROSPECTING_FINANCE_TAB_TO_SLUG[
        tab as keyof typeof PROSPECTING_FINANCE_TAB_TO_SLUG
      ] ?? "overview";
    return (
      <Navigate
        to={`${TAB_ROUTE_BASES.prospectingTransactions}/${prospectingSlug}`}
        replace
      />
    );
  }

  const slug =
    PROSPECTING_FINANCE_TAB_TO_SLUG[
      tab as keyof typeof PROSPECTING_FINANCE_TAB_TO_SLUG
    ] ?? "overview";

  return (
    <Navigate
      to={`${TAB_ROUTE_BASES.prospectingTransactions}/${slug}`}
      replace
    />
  );
}

/** /profile?section= → /profile/:slug */
export function LegacyProfileRedirect() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section");
  const legacyTab = searchParams.get("tab");

  const tabToSection: Record<string, string> = {
    basic: "profile",
    business: "business",
    organizations: "organizations",
    privacy: "privacy",
    subscriptions: "subscriptions",
    settings: "settings",
    preferences: "email-preferences",
  };

  const internal =
    section ?? (legacyTab ? tabToSection[legacyTab] : null) ?? "profile";
  const slug =
    PROFILE_SECTION_TO_SLUG[internal as keyof typeof PROFILE_SECTION_TO_SLUG] ??
    "user-profile";

  const highlight = searchParams.get("highlight");
  const deleteParam = searchParams.get("delete");
  const query = new URLSearchParams();
  if (highlight) query.set("highlight", highlight);
  if (deleteParam) query.set("delete", deleteParam);
  const qs = query.toString();

  return (
    <Navigate
      to={`${TAB_ROUTE_BASES.profile}/${slug}${qs ? `?${qs}` : ""}`}
      replace
    />
  );
}

/** ?tab=active|completed on my-prospects */
export function LegacyMyProspectsRedirect() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const slug =
    tab === "completed"
      ? MY_PROSPECTS_TAB_TO_SLUG.completed
      : MY_PROSPECTS_TAB_TO_SLUG.active;
  return <Navigate to={`${TAB_ROUTE_BASES.myProspects}/${slug}`} replace />;
}

/** ?tab= on incoming-requests */
export function LegacyIncomingRequestsRedirect() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "inbox";
  return <Navigate to={`${TAB_ROUTE_BASES.incomingRequests}/${tab}`} replace />;
}

/** ?tab= on opportunities */
export function LegacyOpportunitiesRedirect() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "browse";
  return <Navigate to={`${TAB_ROUTE_BASES.opportunities}/${tab}`} replace />;
}
