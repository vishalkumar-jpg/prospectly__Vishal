import { useEffect, useRef, useState } from "react";
import SEO from "@/components/SEO";
import { TrustScoreOverview } from "@/components/trust/TrustScoreOverview";
import { TrustScoreHistoryModal } from "@/components/trust/TrustScoreHistoryModal";
import { CreditHistoryModal } from "@/components/credits/CreditHistoryModal";
import { WelcomeSubscriptionPopup } from "@/components/WelcomeSubscriptionPopup";
import { UpcomingMeetingsModal } from "@/components/UpcomingMeetingsModal";
import { ApplyJobModal } from "@/components/recruitment/ApplyJobModal";
import { ConsentApplyModal } from "@/components/recruitment/ConsentApplyModal";
import { PostWelcomePopup } from "@/components/recruitment/PostWelcomePopup";
import { useConnectorOrigin } from "@/hooks/useConnectorOrigin";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "./useDashboardData";
import { DashboardHero } from "./DashboardHero";
import { CalendarBanner } from "./CalendarBanner";
import { NotificationsBanner } from "./NotificationsBanner";
import { StatsGrid } from "./StatsGrid";
import { PriorityActionsCard } from "./PriorityActionsCard";
import { QuickActionsCard } from "./QuickActionsCard";
import { HighValueOpportunitiesCard } from "./HighValueOpportunitiesCard";

const Dashboard = () => {
  const {
    unreadCount,
    hasCalendar,
    calendarLoading,
    stats,
    welcomeMessage,
    priorityActions,
    priorityActionsLoading,
    priorityActionsError,
    refetchPriorityActions,
    highValueOpportunities,
    highValueOpportunitiesLoading,
    highValueOpportunitiesError,
    creditBalance,
    creditBalanceLoading,
    trustScore,
    trustScoreLoading,
    trustScoreData,
    earnedRulesCount,
    feedbackTotalCount,
    showWelcomePopup,
    setShowWelcomePopup,
    showMeetingsModal,
    setShowMeetingsModal,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    isCreditHistoryModalOpen,
    setIsCreditHistoryModalOpen,
    applyJobId,
    applyRef,
    clearApplyParams,
    consentToken,
    clearConsentToken,
  } = useDashboardData();

  // Marketplace-split post-welcome popup. Fires once after the welcome popup
  // has been dismissed, only for users who signed up via "I Have a Candidate"
  // (origin row exists) and the origin job is still active. Once-per-user
  // via localStorage so it never re-appears on subsequent logins.
  //
  // The trigger is split into two steps because the origin query can resolve
  // AFTER the welcome popup is dismissed:
  //   1. onClose of the welcome popup flips a `welcomeDismissed` ref.
  //   2. A useEffect watches (welcomeDismissed + origin loaded) and fires
  //      the popup once both conditions hold.
  const { user } = useAuth();
  const { origin } = useConnectorOrigin();
  const [showPostWelcomePopup, setShowPostWelcomePopup] = useState(false);
  const welcomeDismissedRef = useRef(false);
  const [welcomeDismissedTick, setWelcomeDismissedTick] = useState(0);

  const handleWelcomePopupClose = () => {
    setShowWelcomePopup(false);
    welcomeDismissedRef.current = true;
    // Bump a counter to re-run the eligibility effect. A ref alone wouldn't
    // re-trigger the effect since it doesn't cause a re-render.
    setWelcomeDismissedTick((n) => n + 1);
  };

  useEffect(() => {
    if (!welcomeDismissedRef.current) return;
    if (!user || !origin?.hasOrigin || origin.jobStatus !== "active") return;
    if (showPostWelcomePopup) return;

    const seenKey = `postWelcomeSeen:${user.id}`;
    if (typeof window !== "undefined" && localStorage.getItem(seenKey)) {
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(seenKey, "1");
    }
    setShowPostWelcomePopup(true);
  }, [welcomeDismissedTick, origin, user, showPostWelcomePopup]);

  return (
    <div className="min-w-0 w-full max-w-full">
      <SEO title="Dashboard | Prospectly" />

      <div className="min-w-0 space-y-6 px-2 py-4 sm:px-4 md:px-6">
        <DashboardHero
          welcomeMessage={welcomeMessage}
          creditBalance={creditBalance}
          creditBalanceLoading={creditBalanceLoading}
          onViewCreditHistory={() => setIsCreditHistoryModalOpen(true)}
          trustScore={trustScore}
          trustScoreLoading={trustScoreLoading}
          priorityActions={priorityActions}
        />

        <CalendarBanner
          hasCalendar={hasCalendar}
          calendarLoading={calendarLoading}
        />
        <NotificationsBanner unreadCount={unreadCount} />
        <StatsGrid stats={stats} />

        <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          <PriorityActionsCard
            priorityActions={priorityActions}
            priorityActionsLoading={priorityActionsLoading}
            priorityActionsError={priorityActionsError}
            refetchPriorityActions={refetchPriorityActions}
            onViewMeetings={() => setShowMeetingsModal(true)}
          />

          <QuickActionsCard />

          <HighValueOpportunitiesCard
            opportunities={highValueOpportunities}
            loading={highValueOpportunitiesLoading}
            error={highValueOpportunitiesError}
          />

          <TrustScoreOverview
            trustScore={trustScore}
            trustScoreLoading={trustScoreLoading}
            lastUpdated={trustScoreData?.lastUpdated}
            earnedRulesCount={earnedRulesCount}
            feedbackTotalCount={feedbackTotalCount}
            onHistoryClick={() => setIsHistoryModalOpen(true)}
            className=""
          />
        </div>
      </div>

      <WelcomeSubscriptionPopup
        isOpen={showWelcomePopup}
        onClose={handleWelcomePopupClose}
      />
      {origin?.hasOrigin && origin.jobId && (
        <PostWelcomePopup
          open={showPostWelcomePopup}
          onOpenChange={setShowPostWelcomePopup}
          originJobId={origin.jobId}
          originJobTitle={origin.jobTitle}
        />
      )}
      <UpcomingMeetingsModal
        isOpen={showMeetingsModal}
        onClose={() => setShowMeetingsModal(false)}
      />
      <TrustScoreHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
      <CreditHistoryModal
        isOpen={isCreditHistoryModalOpen}
        onClose={() => setIsCreditHistoryModalOpen(false)}
      />
      {applyJobId && applyRef && (
        <ApplyJobModal
          jobId={applyJobId}
          sharerCode={applyRef}
          isOpen={true}
          onClose={clearApplyParams}
        />
      )}
      {consentToken && (
        <ConsentApplyModal
          consentToken={consentToken}
          isOpen={true}
          onClose={clearConsentToken}
        />
      )}
    </div>
  );
};

export default Dashboard;
