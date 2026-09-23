import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useSearchParams,
} from "react-router-dom";
import { StaticRouter } from "react-router-dom/server";
import { lazy, Suspense } from "react";
import { RedirectWithParams } from "./components/RedirectWithParams";
import { AuthProvider } from "./contexts/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import { ImportProgressProvider } from "./contexts/ImportProgressContext";
import { GlobalImportProgressPopup } from "./components/GlobalImportProgressPopup";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader } from "./components/ui/loader";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import MaintenancePage from "./pages/Maintenance";

/** Marketing / static pages are lazy-loaded to keep the landing bundle lean. */
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const OurStory = lazy(() => import("./pages/OurStory"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Security = lazy(() => import("./pages/Security"));
const Confidentiality = lazy(() => import("./pages/Confidentiality"));
const Transparency = lazy(() => import("./pages/Transparency"));
const CommunityPledge = lazy(() => import("./pages/CommunityPledge"));
import AuthCallback from "./pages/AuthCallback";
import GoogleContactsCallback from "./pages/GoogleContactsCallback";
import MicrosoftContactsCallback from "./pages/MicrosoftContactsCallback";
import CalendarCallback from "./pages/CalendarCallback";
import DashboardLayout from "./pages/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import SendIntroduction from "./pages/SendIntroduction";
import ScheduleMeeting from "./pages/ScheduleMeeting";
import NotFound from "./pages/NotFound";
import GettingStarted from "./pages/GettingStarted";
import GettingStartedStep1 from "./pages/GettingStartedStep1";
import GettingStartedStep2 from "./pages/GettingStartedStep2";
import GettingStartedStep3 from "./pages/GettingStartedStep3";
import GettingStartedStep4 from "./pages/GettingStartedStep4";
import Contacts from "./pages/MyContacts";
import ImportContacts from "./pages/ImportContacts";
import FinancesNew from "./pages/FinancesNew";
import ProspectHub from "./pages/ProspectHub";

import GlobalOpportunities from "./pages/GlobalOpportunities";
import IntroductionPipeline from "./pages/IntroductionPipeline";
import DealIntroPipeline from "./pages/DealIntroPipeline";
import ProfileSettings from "./pages/ProfileSettings";
import BookMeetingPublic from "./pages/BookMeetingPublic";
import DeclineIntroductionPublic from "./pages/DeclineIntroductionPublic";
import PatentPackage from "./pages/PatentPackage";
import AcceptInvite from "./pages/AcceptInvite";
import Referrals from "./pages/Referrals";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProfileCompletionGate } from "@/components/profile/ProfileCompletionGate";
import { ModuleAccessRoute } from "./components/ModuleAccessRoute";
import { APP_MODULES } from "./lib/modules";
import TrustRating from "./pages/TrustRating";
import { useActiveUsagePing } from "./hooks/useActiveUsagePing";
import { usePageviewTracking } from "./hooks/usePageviewTracking";
import CandidateApplicationsPage from "./pages/recruitment/CandidateApplicationsPage";
import PostJobWizard from "./pages/recruitment/PostJobWizard";
import MyJobPostings from "./pages/recruitment/MyJobPostings";
import RecruiterDashboard from "./pages/recruitment/recruiter-dashboard/RecruiterDashboard";
import JobDetailWithKanban from "./pages/recruitment/JobDetailWithKanban";
import CandidateSearchPage from "./pages/recruitment/candidate-search/CandidateSearchPage";
import CandidateSearchDetailPage from "./pages/recruitment/candidate-search/CandidateSearchDetailPage";
import ConnectorRecruitmentPipeline from "./pages/recruitment/ConnectorRecruitmentPipeline";
import JobCandidatesPipeline from "./pages/recruitment/JobCandidatesPipeline";
import JobMarketplace from "./pages/recruitment/JobMarketplace";
import PublicJobPage from "./pages/recruitment/PublicJobPage";
import CandidateConsentPublic from "./pages/recruitment/CandidateConsentPublic";
import UnsubscribePreferences from "./pages/UnsubscribePreferences";
import {
  LegacyIncomingRequestsRedirect,
  LegacyMyProspectsRedirect,
  LegacyOpportunitiesRedirect,
  LegacyProfileRedirect,
  LegacyTransactionsRedirect,
} from "./components/routing/legacy-tab-redirects";
import {
  PROSPECTING_FINANCE_TAB_TO_SLUG,
  RECRUITING_FINANCE_TAB_TO_SLUG,
  TAB_ROUTE_BASES,
} from "./lib/tab-routes";
import { RECRUITER_DASHBOARD_PATH } from "./constants/recruitment-routes";

// Marketplace
import { RequestClaimProvider } from "./contexts/RequestClaimContext";
import PublicRequestPage from "./pages/PublicRequestPage";
import SignUp from "./pages/SignUp";
import InterviewBookingPublic from "./pages/recruitment/InterviewBookingPublic";

/** Fires throttled Active Usage Ping on route changes */
function ActiveUsagePingTracker() {
  useActiveUsagePing();
  return null;
}

/** Fires a redacted Google Analytics page_view on route changes */
function PageviewTracker() {
  usePageviewTracking();
  return null;
}

/**
 * Redirect component that preserves claim query params during redirect
 * from /verify-connection to /getting-started
 */
function VerifyConnectionRedirect() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const sharerCode = searchParams.get("sharerCode");

  // Pass params to getting-started with renamed keys to indicate claim flow
  const targetUrl =
    requestId && sharerCode
      ? `/getting-started?claimRequestId=${requestId}&claimSharerCode=${sharerCode}`
      : "/getting-started";

  return <Navigate to={targetUrl} replace />;
}

type AppProps = {
  ssrLocation?: string;
  queryClient?: QueryClient;
};

const App = ({
  ssrLocation,
  queryClient: queryClientOverride,
}: AppProps = {}) => {
  const isSsr = Boolean(ssrLocation);
  const activeQueryClient = queryClientOverride ?? queryClient;

  const appRoutes = (
    <>
      {!isSsr && <ActiveUsagePingTracker />}
      {!isSsr && <PageviewTracker />}
      {!isSsr && <ScrollToTop />}
      <AuthProvider ssrMode={isSsr}>
        <RequestClaimProvider>
          <Suspense fallback={<Loader fullPage message="Loading…" />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/accept-invite/:token" element={<AcceptInvite />} />
              <Route path="/our-story" element={<OurStory />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/security" element={<Security />} />
              <Route path="/confidentiality" element={<Confidentiality />} />
              <Route path="/transparency" element={<Transparency />} />
              <Route path="/community-pledge" element={<CommunityPledge />} />
              <Route path="/signin" element={<SignIn />} />
              {/* <Route path="/signup" element={<SignUp />} /> */}
              <Route
                path="/auth/callback/google"
                element={<CalendarCallback />}
              />
              <Route
                path="/auth/callback/microsoft"
                element={<CalendarCallback />}
              />
              <Route
                path="/calendar/callback/google"
                element={<CalendarCallback />}
              />
              <Route
                path="/calendar/callback/microsoft"
                element={<CalendarCallback />}
              />
              <Route
                path="/auth/google-contacts/callback"
                element={<GoogleContactsCallback />}
              />
              <Route
                path="/auth/microsoft/callback"
                element={<MicrosoftContactsCallback />}
              />
              <Route
                path="/book-meeting/:requestId/:bookingToken"
                element={<BookMeetingPublic />}
              />
              <Route
                path="/request/:requestId/:sharerCode"
                element={<PublicRequestPage />}
              />
              <Route path="/jobs/:shareCode" element={<PublicJobPage />} />
              <Route
                path="/consent/:token"
                element={<CandidateConsentPublic />}
              />
              <Route path="/unsubscribe" element={<UnsubscribePreferences />} />
              <Route
                path="/interview-booking/:candidateId/:token"
                element={<InterviewBookingPublic />}
              />
              <Route
                path="/verify-connection"
                element={<VerifyConnectionRedirect />}
              />
              <Route
                path="/decline-introduction/:requestId/:bookingToken"
                element={<DeclineIntroductionPublic />}
              />
              <Route path="/patent-package" element={<PatentPackage />} />

              {/* ===== Protected Dashboard Layout (pathless wrapper) ===== */}
              <Route
                element={
                  <ProtectedRoute>
                    <ProfileCompletionGate>
                      <DashboardLayout />
                    </ProfileCompletionGate>
                  </ProtectedRoute>
                }
              >
                {/* --- Dashboard core route --- */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route
                  path="/dashboard/introduction/:id"
                  element={<SendIntroduction />}
                />
                <Route
                  path="/dashboard/meeting/:id"
                  element={<ScheduleMeeting />}
                />

                {/* --- General routes (no /dashboard prefix) --- */}
                <Route path="/getting-started" element={<GettingStarted />} />
                <Route
                  path="/getting-started/step-1"
                  element={<GettingStartedStep1 />}
                />
                <Route
                  path="/getting-started/step-2"
                  element={<GettingStartedStep2 />}
                />
                <Route
                  path="/getting-started/step-3"
                  element={<GettingStartedStep3 />}
                />
                <Route
                  path="/getting-started/step-4"
                  element={<GettingStartedStep4 />}
                />
                <Route path="/my-contacts/all" element={<Contacts />} />
                <Route path="/my-contacts/invited" element={<Contacts />} />
                <Route
                  path="/my-contacts"
                  element={<Navigate to="/my-contacts/all" replace />}
                />
                <Route path="/import-contacts" element={<ImportContacts />} />
                <Route
                  path="/transactions"
                  element={<LegacyTransactionsRedirect />}
                />
                <Route
                  path="/prospecting/transactions/:tab"
                  element={<FinancesNew />}
                />
                <Route
                  path="/prospecting/transactions"
                  element={
                    <Navigate
                      to={`${TAB_ROUTE_BASES.prospectingTransactions}/${PROSPECTING_FINANCE_TAB_TO_SLUG.overview}`}
                      replace
                    />
                  }
                />
                <Route path="/trust-score" element={<TrustRating />} />
                <Route path="/profile/:section" element={<ProfileSettings />} />
                <Route path="/profile" element={<LegacyProfileRedirect />} />
                <Route
                  path="/profile-settings/:section"
                  element={<ProfileSettings />}
                />
                <Route
                  path="/profile-settings"
                  element={<LegacyProfileRedirect />}
                />
                <Route
                  path="/referrals"
                  element={
                    <ProtectedRoute>
                      <Referrals />
                    </ProtectedRoute>
                  }
                />

                {/* --- Prospecting routes --- */}
                <Route
                  path="/prospecting/find-prospects"
                  element={<ProspectHub />}
                />
                <Route
                  path="/prospecting/my-prospects/open-request"
                  element={<DealIntroPipeline />}
                />
                <Route
                  path="/prospecting/my-prospects/archive"
                  element={<DealIntroPipeline />}
                />
                <Route
                  path="/prospecting/my-prospects"
                  element={<LegacyMyProspectsRedirect />}
                />
                <Route
                  path="/prospecting/incoming-requests/inbox"
                  element={<IntroductionPipeline />}
                />
                <Route
                  path="/prospecting/incoming-requests/pipeline"
                  element={<IntroductionPipeline />}
                />
                <Route
                  path="/prospecting/incoming-requests/archive"
                  element={<IntroductionPipeline />}
                />
                <Route
                  path="/prospecting/incoming-requests/unfulfilled"
                  element={<IntroductionPipeline />}
                />
                <Route
                  path="/prospecting/incoming-requests"
                  element={<LegacyIncomingRequestsRedirect />}
                />
                <Route
                  path="/prospecting/opportunities/browse"
                  element={<GlobalOpportunities />}
                />
                <Route
                  path="/prospecting/opportunities/shared"
                  element={<GlobalOpportunities />}
                />
                <Route
                  path="/prospecting/opportunities/claims"
                  element={<GlobalOpportunities />}
                />
                <Route
                  path="/prospecting/opportunities"
                  element={<LegacyOpportunitiesRedirect />}
                />

                {/* --- My Applications (job-seeker view) ---
                            Intentionally NOT gated by recruiting module access:
                            available to any authenticated user, like Prospecting. */}
                <Route
                  path="/recruiting/my-applications/all"
                  element={<CandidateApplicationsPage />}
                />
                <Route
                  path="/recruiting/my-applications/active"
                  element={<CandidateApplicationsPage />}
                />
                <Route
                  path="/recruiting/my-applications/completed"
                  element={<CandidateApplicationsPage />}
                />
                <Route
                  path="/recruiting/my-applications"
                  element={
                    <Navigate to="/recruiting/my-applications/all" replace />
                  }
                />

                {/* --- Recruiting routes (gated by organisation module access) --- */}
                <Route
                  element={
                    <ModuleAccessRoute module={APP_MODULES.RECRUITING}>
                      <Outlet />
                    </ModuleAccessRoute>
                  }
                >
                  <Route
                    path={RECRUITER_DASHBOARD_PATH}
                    element={<RecruiterDashboard />}
                  />
                  <Route
                    path="/recruiting/dashboard"
                    element={<Navigate to={RECRUITER_DASHBOARD_PATH} replace />}
                  />
                  <Route
                    path="/recruiting/post-a-job"
                    element={<PostJobWizard />}
                  />
                  <Route
                    path="/recruiting/my-job-posts/active"
                    element={<MyJobPostings />}
                  />
                  <Route
                    path="/recruiting/my-job-posts/closed"
                    element={<MyJobPostings />}
                  />
                  <Route
                    path="/recruiting/my-job-posts"
                    element={
                      <Navigate to="/recruiting/my-job-posts/active" replace />
                    }
                  />
                  <Route
                    path="/recruiting/my-job-posts/:id/edit"
                    element={<PostJobWizard />}
                  />
                  <Route
                    path="/recruiting/my-job-posts/:id/view"
                    element={<PostJobWizard />}
                  />
                  <Route
                    path="/recruiting/my-job-posts/:id"
                    element={<JobDetailWithKanban />}
                  />
                  <Route
                    path="/recruiting/candidates"
                    element={<CandidateSearchPage />}
                  />
                  <Route
                    path="/recruiting/candidates/:candidateId"
                    element={<CandidateSearchDetailPage />}
                  />
                  <Route
                    path="/recruiting/refer-candidates/inbox"
                    element={<ConnectorRecruitmentPipeline />}
                  />
                  <Route
                    path="/recruiting/refer-candidates/inbox/:jobId"
                    element={<JobCandidatesPipeline />}
                  />
                  <Route
                    path="/recruiting/refer-candidates/pipeline"
                    element={
                      <Navigate
                        to="/recruiting/refer-candidates/inbox"
                        replace
                      />
                    }
                  />
                  <Route
                    path="/recruiting/refer-candidates/closed"
                    element={<ConnectorRecruitmentPipeline />}
                  />
                  <Route
                    path="/recruiting/refer-candidates"
                    element={
                      <Navigate
                        to="/recruiting/refer-candidates/inbox"
                        replace
                      />
                    }
                  />
                  <Route
                    path="/recruiting/job-marketplace"
                    element={<JobMarketplace />}
                  />
                  <Route
                    path="/recruiting/transactions/:tab"
                    element={<FinancesNew />}
                  />
                  <Route
                    path="/recruiting/transactions"
                    element={
                      <RedirectWithParams
                        to={`${TAB_ROUTE_BASES.recruitingTransactions}/${RECRUITING_FINANCE_TAB_TO_SLUG.connector}`}
                      />
                    }
                  />
                </Route>

                {/* ===== Backward-compatible redirects ===== */}

                {/* Old /dashboard/* prospecting routes → /prospecting/* */}
                <Route
                  path="/dashboard/find-prospects"
                  element={
                    <Navigate to="/prospecting/find-prospects" replace />
                  }
                />
                <Route
                  path="/dashboard/my-prospects"
                  element={<Navigate to="/prospecting/my-prospects" replace />}
                />
                <Route
                  path="/dashboard/incoming-requests"
                  element={
                    <Navigate to="/prospecting/incoming-requests" replace />
                  }
                />
                <Route
                  path="/dashboard/prospect-marketplace"
                  element={<Navigate to="/prospecting/opportunities" replace />}
                />

                {/* Old /dashboard/my-applications → /recruiting/my-applications */}
                <Route
                  path="/dashboard/my-applications"
                  element={
                    <Navigate to="/recruiting/my-applications" replace />
                  }
                />

                {/* Old /dashboard/recruitment/* → /recruiting/* */}
                <Route
                  path="/dashboard/recruitment/post-a-job"
                  element={<Navigate to="/recruiting/post-a-job" replace />}
                />
                <Route
                  path="/dashboard/recruitment/my-job-posts"
                  element={<Navigate to="/recruiting/my-job-posts" replace />}
                />
                <Route
                  path="/dashboard/recruitment/my-job-posts/:id/edit"
                  element={
                    <RedirectWithParams to="/recruiting/my-job-posts/:id/edit" />
                  }
                />
                <Route
                  path="/dashboard/recruitment/my-job-posts/:id/view"
                  element={
                    <RedirectWithParams to="/recruiting/my-job-posts/:id/view" />
                  }
                />
                <Route
                  path="/dashboard/recruitment/my-job-posts/:id"
                  element={
                    <RedirectWithParams to="/recruiting/my-job-posts/:id" />
                  }
                />
                <Route
                  path="/dashboard/recruitment/refer-candidates"
                  element={
                    <Navigate to="/recruiting/refer-candidates" replace />
                  }
                />
                <Route
                  path="/dashboard/recruitment/job-marketplace"
                  element={
                    <Navigate to="/recruiting/job-marketplace" replace />
                  }
                />
                <Route
                  path="/dashboard/recruitment/applications"
                  element={
                    <Navigate to="/recruiting/my-applications" replace />
                  }
                />

                {/* Legacy prospecting redirects */}
                <Route
                  path="/dashboard/pending-requests"
                  element={
                    <Navigate to="/prospecting/incoming-requests" replace />
                  }
                />
                <Route
                  path="/dashboard/warm-leads"
                  element={
                    <Navigate to="/prospecting/incoming-requests" replace />
                  }
                />
                <Route
                  path="/dashboard/request-intro"
                  element={
                    <Navigate to="/prospecting/find-prospects" replace />
                  }
                />
                <Route
                  path="/dashboard/bounty-campaign-lists"
                  element={
                    <Navigate
                      to="/prospecting/find-prospects?mode=campaigns"
                      replace
                    />
                  }
                />
                <Route
                  path="/dashboard/global_opportunities"
                  element={<Navigate to="/prospecting/opportunities" replace />}
                />
                <Route
                  path="/dashboard/bounty-marketplace"
                  element={<Navigate to="/prospecting/opportunities" replace />}
                />
                <Route
                  path="/dashboard/prospect-hub"
                  element={
                    <Navigate to="/prospecting/find-prospects" replace />
                  }
                />
                <Route
                  path="/dashboard/search-and-request"
                  element={
                    <Navigate to="/prospecting/find-prospects" replace />
                  }
                />
                <Route
                  path="/dashboard/prospect-pipeline"
                  element={<Navigate to="/prospecting/my-prospects" replace />}
                />
                <Route
                  path="/dashboard/deal-intro-pipeline"
                  element={<Navigate to="/prospecting/my-prospects" replace />}
                />
                <Route
                  path="/dashboard/introduction-requests"
                  element={
                    <Navigate to="/prospecting/incoming-requests" replace />
                  }
                />
                <Route
                  path="/dashboard/introduction-pipeline"
                  element={
                    <Navigate to="/prospecting/incoming-requests" replace />
                  }
                />
                <Route
                  path="/dashboard/introductions-requested"
                  element={
                    <Navigate to="/prospecting/incoming-requests" replace />
                  }
                />
                <Route
                  path="/dashboard/opportunities"
                  element={<Navigate to="/prospecting/opportunities" replace />}
                />
                <Route
                  path="/dashboard/referral-requests"
                  element={<Navigate to="/prospecting/my-prospects" replace />}
                />

                {/* Legacy report redirects */}
                <Route
                  path="/dashboard/business-performance"
                  element={<Navigate to="/reports?tab=business" replace />}
                />
                <Route
                  path="/dashboard/campaign-performance"
                  element={<Navigate to="/reports?tab=campaigns" replace />}
                />
                <Route
                  path="/dashboard/intro-analytics"
                  element={<Navigate to="/reports?tab=introductions" replace />}
                />
                <Route
                  path="/dashboard/revenue-reports"
                  element={<Navigate to="/reports?tab=financial" replace />}
                />

                {/* Legacy general redirects → new prefix-free paths */}
                <Route
                  path="/dashboard/getting-started"
                  element={<RedirectWithParams to="/getting-started" replace />}
                />
                <Route
                  path="/dashboard/getting-started/step-1"
                  element={<Navigate to="/getting-started/step-1" replace />}
                />
                <Route
                  path="/dashboard/getting-started/step-2"
                  element={<Navigate to="/getting-started/step-2" replace />}
                />
                <Route
                  path="/dashboard/getting-started/step-3"
                  element={<Navigate to="/getting-started/step-3" replace />}
                />
                <Route
                  path="/dashboard/getting-started/step-4"
                  element={<Navigate to="/getting-started/step-4" replace />}
                />
                <Route
                  path="/dashboard/my-contacts"
                  element={<Navigate to="/my-contacts" replace />}
                />
                <Route
                  path="/dashboard/contacts"
                  element={<Navigate to="/my-contacts" replace />}
                />
                <Route
                  path="/dashboard/import-contacts"
                  element={<Navigate to="/import-contacts" replace />}
                />
                <Route
                  path="/dashboard/transactions"
                  element={<Navigate to="/transactions" replace />}
                />
                <Route
                  path="/dashboard/finances"
                  element={<Navigate to="/transactions" replace />}
                />
                <Route
                  path="/dashboard/trust-score"
                  element={<Navigate to="/trust-score" replace />}
                />
                <Route
                  path="/dashboard/trust-rating"
                  element={<Navigate to="/trust-score" replace />}
                />
                <Route
                  path="/dashboard/trust-score-center"
                  element={<Navigate to="/trust-score" replace />}
                />
                <Route
                  path="/dashboard/profile"
                  element={<Navigate to="/profile" replace />}
                />
                <Route
                  path="/dashboard/profile-settings"
                  element={<Navigate to="/profile-settings" replace />}
                />
                <Route
                  path="/dashboard/referrals"
                  element={<Navigate to="/referrals" replace />}
                />

                {/* Legacy recruitment redirects */}
                <Route
                  path="/dashboard/recruitment/post"
                  element={<Navigate to="/recruiting/post-a-job" replace />}
                />
                <Route
                  path="/dashboard/recruitment/jobs"
                  element={<Navigate to="/recruiting/my-job-posts" replace />}
                />
                <Route
                  path="/dashboard/recruitment/pipeline"
                  element={
                    <Navigate to="/recruiting/refer-candidates" replace />
                  }
                />
                <Route
                  path="/dashboard/recruitment/marketplace"
                  element={
                    <Navigate to="/recruiting/job-marketplace" replace />
                  }
                />
                <Route
                  path="/dashboard/recruitment/post-new-job"
                  element={<Navigate to="/recruiting/post-a-job" replace />}
                />
                <Route
                  path="/dashboard/recruitment/my-job-postings"
                  element={<Navigate to="/recruiting/my-job-posts" replace />}
                />
                <Route
                  path="/dashboard/recruitment/my-job-postings/:id/edit"
                  element={
                    <RedirectWithParams to="/recruiting/my-job-posts/:id/edit" />
                  }
                />
                <Route
                  path="/dashboard/recruitment/my-job-postings/:id"
                  element={
                    <RedirectWithParams to="/recruiting/my-job-posts/:id" />
                  }
                />
                <Route
                  path="/dashboard/recruitment/my-pipeline"
                  element={
                    <Navigate to="/recruiting/refer-candidates" replace />
                  }
                />
                <Route
                  path="/dashboard/recruitment/recruitment-pipeline"
                  element={
                    <Navigate to="/recruiting/refer-candidates" replace />
                  }
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RequestClaimProvider>
      </AuthProvider>
    </>
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={activeQueryClient}>
        <TooltipProvider>
          <ImportProgressProvider>
            <Toaster position="top-right" />
            {isSsr ? (
              <StaticRouter location={ssrLocation!}>{appRoutes}</StaticRouter>
            ) : (
              <BrowserRouter>{appRoutes}</BrowserRouter>
            )}
            <GlobalImportProgressPopup />
          </ImportProgressProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
