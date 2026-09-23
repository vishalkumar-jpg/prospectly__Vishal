import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useCalendarRequirement } from "@/hooks/useCalendarRequirement";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { usePriorityActions } from "@/hooks/usePriorityActions";
import { useHighValueOpportunities } from "@/hooks/useHighValueOpportunities";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatCurrency } from "@/utils/formatter";
import { DASHBOARD_MESSAGES } from "@/constants/dashboard.constants";
import {
  Star,
  DollarSign,
  Trophy,
  CheckCircle,
  Clock,
  Calendar,
} from "lucide-react";
import type { UserProfileData, StatItem } from "./types";

type DashboardStatsData = NonNullable<
  ReturnType<typeof useDashboardStats>["stats"]
>;

const DEFAULT_DASHBOARD_STATS: DashboardStatsData = {
  pendingIntros: { value: 0, urgentCount: 0 },
  meetingsBooked: { value: 0, weeklyChange: 0 },
  meetingsCompleted: { value: 0, weeklyChange: 0 },
  peerFeedbacks: { value: 0, pendingCount: 0 },
  totalInvested: { value: 0, escrowAmount: 0 },
  totalEarned: { value: 0, inEscrow: 0 },
};

function buildWeeklyChangeTrend({
  statsLoading,
  weeklyChange,
}: {
  statsLoading: boolean;
  weeklyChange: number;
}): string {
  if (statsLoading) return "...";
  return weeklyChange !== 0 ? String(Math.abs(weeklyChange)) : "0";
}

const DASHBOARD_STAT_CARD_DEFAULTS = {
  cardBgGradient: "bg-card",
  cardBorder: "border-border",
  trendHoverColor: "",
};

function buildPendingIntrosStat(
  statsData: DashboardStatsData,
  statsLoading: boolean
): StatItem {
  return {
    title: "Pending Intros",
    value: statsLoading ? "..." : String(statsData.pendingIntros.value),
    numericValue: statsData.pendingIntros.value,
    icon: Clock,
    trend: statsLoading
      ? "..."
      : statsData.pendingIntros.urgentCount > 0
        ? `${statsData.pendingIntros.urgentCount} urgent`
        : "0 urgent",
    trendLabel: "need response",
    color: "text-brand-rose",
    bgColor: "bg-brand-rose/10",
    trendColor: "border-brand-rose/20 bg-brand-rose/10 text-brand-rose",
    link: "/prospecting/incoming-requests",
    ...DASHBOARD_STAT_CARD_DEFAULTS,
  };
}

function buildMeetingsBookedStat(
  statsData: DashboardStatsData,
  statsLoading: boolean
): StatItem {
  return {
    title: "Meetings Booked",
    value: statsLoading ? "..." : String(statsData.meetingsBooked.value),
    numericValue: statsData.meetingsBooked.value,
    icon: Calendar,
    trend: buildWeeklyChangeTrend({
      statsLoading,
      weeklyChange: statsData.meetingsBooked.weeklyChange,
    }),
    trendValue: statsLoading ? null : statsData.meetingsBooked.weeklyChange,
    trendLabel: "vs last week",
    color: "text-brand-sky",
    bgColor: "bg-brand-sky/10",
    trendColor: "border-brand-sky/20 bg-brand-sky/10 text-brand-sky",
    ...DASHBOARD_STAT_CARD_DEFAULTS,
  };
}

function buildMeetingsCompletedStat(
  statsData: DashboardStatsData,
  statsLoading: boolean
): StatItem {
  return {
    title: "Meetings Completed",
    value: statsLoading ? "..." : String(statsData.meetingsCompleted.value),
    numericValue: statsData.meetingsCompleted.value,
    icon: CheckCircle,
    trend: buildWeeklyChangeTrend({
      statsLoading,
      weeklyChange: statsData.meetingsCompleted.weeklyChange,
    }),
    trendValue: statsLoading ? null : statsData.meetingsCompleted.weeklyChange,
    trendLabel: "vs last week",
    color: "text-brand-success",
    bgColor: "bg-brand-success/10",
    trendColor:
      "border-brand-success/20 bg-brand-success/10 text-brand-success",
    ...DASHBOARD_STAT_CARD_DEFAULTS,
  };
}

function buildTotalInvestedStat(
  statsData: DashboardStatsData,
  statsLoading: boolean
): StatItem {
  return {
    title: "Total Invested",
    value: statsLoading ? "..." : formatCurrency(statsData.totalInvested.value),
    numericValue: statsData.totalInvested.value,
    prefix: "$",
    decimals: statsData.totalInvested.value % 1 !== 0 ? 2 : 0,
    icon: DollarSign,
    trend: statsLoading
      ? "..."
      : formatCurrency(statsData.totalInvested.escrowAmount),
    trendLabel: "in escrow",
    color: "text-brand-amethyst",
    bgColor: "bg-brand-amethyst/10",
    trendColor:
      "border-brand-amethyst/20 bg-brand-amethyst/10 text-brand-amethyst",
    link: "/prospecting/transactions/transactions",
    ...DASHBOARD_STAT_CARD_DEFAULTS,
  };
}

function buildTotalEarnedStat(
  statsData: DashboardStatsData,
  statsLoading: boolean
): StatItem {
  return {
    title: "Total Earned",
    value: statsLoading ? "..." : formatCurrency(statsData.totalEarned.value),
    numericValue: statsData.totalEarned.value,
    prefix: "$",
    decimals: statsData.totalEarned.value % 1 !== 0 ? 2 : 0,
    icon: Trophy,
    trend: statsLoading
      ? "..."
      : formatCurrency(statsData.totalEarned.inEscrow),
    trendLabel: "in escrow",
    color: "text-brand-warning",
    bgColor: "bg-brand-warning/10",
    trendColor:
      "border-brand-warning/20 bg-brand-warning/10 text-brand-warning",
    link: "/prospecting/transactions/payouts",
    ...DASHBOARD_STAT_CARD_DEFAULTS,
  };
}

function buildPeerFeedbacksStat(
  statsData: DashboardStatsData,
  statsLoading: boolean
): StatItem {
  return {
    title: "Peer Feedbacks",
    value: statsLoading ? "..." : String(statsData.peerFeedbacks.value),
    numericValue: statsData.peerFeedbacks.value,
    icon: Star,
    trend: statsLoading
      ? "..."
      : statsData.peerFeedbacks.pendingCount > 0
        ? String(statsData.peerFeedbacks.pendingCount)
        : "0",
    trendValue: null,
    trendLabel: "pending",
    color: "text-brand-amethyst",
    bgColor: "bg-brand-amethyst/10",
    trendColor:
      "border-brand-amethyst/20 bg-brand-amethyst/10 text-brand-amethyst",
    link: "/trust-score#recent-feedback",
    ...DASHBOARD_STAT_CARD_DEFAULTS,
  };
}

function buildDashboardStatItems({
  statsData,
  statsLoading,
}: {
  statsData: DashboardStatsData;
  statsLoading: boolean;
}): StatItem[] {
  return [
    buildPendingIntrosStat(statsData, statsLoading),
    buildMeetingsBookedStat(statsData, statsLoading),
    buildMeetingsCompletedStat(statsData, statsLoading),
    buildTotalInvestedStat(statsData, statsLoading),
    buildTotalEarnedStat(statsData, statsLoading),
    buildPeerFeedbacksStat(statsData, statsLoading),
  ];
}

export function useDashboardData() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { hasCalendar, loading: calendarLoading } = useCalendarRequirement();
  const { stats: dashboardStats, loading: statsLoading } = useDashboardStats();
  const {
    priorityActions,
    loading: priorityActionsLoading,
    error: priorityActionsError,
    refetch: refetchPriorityActions,
  } = usePriorityActions();
  const {
    opportunities: highValueOpportunities,
    loading: highValueOpportunitiesLoading,
    error: highValueOpportunitiesError,
  } = useHighValueOpportunities();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<{
    full_name?: string;
    first_name?: string;
    last_name?: string;
    meeting_url?: string;
    meeting_platform?: string;
  } | null>(null);
  const [, setShowMeetingSetupBanner] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCreditHistoryModalOpen, setIsCreditHistoryModalOpen] =
    useState(false);

  // Apply modal state (triggered from public job page redirect)
  const [searchParams, setSearchParams] = useSearchParams();
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const [applyRef, setApplyRef] = useState<string | null>(null);
  const [consentToken, setConsentToken] = useState<string | null>(null);

  const { data: creditBalanceData, isLoading: creditBalanceLoading } = useQuery(
    {
      queryKey: ["/api/credits/me"],
      queryFn: () => api.credits.getMyBalance(),
      enabled: !!user,
      refetchOnMount: true,
      staleTime: 0,
    }
  );

  const creditBalance = creditBalanceData?.balance ?? 0;

  const { data: trustScoreData, isLoading: trustScoreLoading } = useQuery({
    queryKey: ["/api/trust-score/me"],
    queryFn: () => api.trustScore.getMyScore(),
    enabled: !!user,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: rulesData } = useQuery({
    queryKey: ["/api/trust-score/me/rules"],
    queryFn: () => api.trustScore.getMyRules(),
    enabled: !!user,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: feedbackData } = useQuery({
    queryKey: ["/api/feedback/me", 1],
    queryFn: () => api.feedback.getMyFeedback(1, 0),
    enabled: !!user,
    refetchOnMount: true,
    staleTime: 0,
  });

  const trustScore = trustScoreData?.trustScore || 0;
  const earnedRulesCount = rulesData?.earned?.length || 0;
  const feedbackTotalCount = feedbackData?.stats?.totalCount || 0;

  const isAdminUser =
    location.search.includes("admin=true") ||
    location.pathname.includes("/admin");

  useEffect(() => {
    if (
      isAdminUser &&
      (location.pathname === "/dashboard" ||
        location.pathname === "/dashboard/")
    ) {
      navigate("/dashboard/admin", { replace: true });
    }
  }, [isAdminUser, location.pathname, navigate]);

  useEffect(() => {
    if (user) {
      const userData = user as UserProfileData;
      setUserProfile({
        full_name: userData.fullName || userData.full_name,
        first_name: userData.firstName || userData.first_name,
        last_name: userData.lastName || userData.last_name,
        meeting_url: userData.meetingUrl || userData.meeting_url,
        meeting_platform: userData.meetingPlatform || userData.meeting_platform,
      });
      setShowMeetingSetupBanner(
        !userData.meetingUrl &&
          !userData.meetingPlatform &&
          !userData.meeting_url &&
          !userData.meeting_platform
      );
    }
  }, [user]);

  useEffect(() => {
    const isDashboardRoute =
      location.pathname === "/dashboard" || location.pathname === "/dashboard/";

    if (user && isDashboardRoute && !applyJobId && !consentToken) {
      const userData = user as UserProfileData;
      const hasSeen = userData.userConfiguration?.hasSeenWelcomePopup;
      const shouldShow =
        hasSeen === false || hasSeen === undefined || hasSeen === null;

      if (shouldShow) {
        const timer = setTimeout(() => {
          setShowWelcomePopup(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, location.pathname, applyJobId, consentToken]);

  // Read apply params and consent token from URL and clean them
  useEffect(() => {
    const jobId = searchParams.get("applyJobId");
    const ref = searchParams.get("ref");
    const consentTokenParam = searchParams.get("consentToken");

    if (jobId && ref) {
      setApplyJobId(jobId);
      setApplyRef(ref);

      const params = new URLSearchParams(searchParams);
      params.delete("applyJobId");
      params.delete("ref");
      setSearchParams(params, { replace: true });
    }

    if (consentTokenParam) {
      setConsentToken(consentTokenParam);
      const params = new URLSearchParams(searchParams);
      params.delete("consentToken");
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Coordinate apply modal with welcome popup
  const pendingApplyJobId = applyJobId;
  const pendingApplyRef = applyRef;

  const clearApplyParams = useCallback(() => {
    setApplyJobId(null);
    setApplyRef(null);
  }, []);

  const clearConsentToken = useCallback(() => {
    setConsentToken(null);
  }, []);

  useEffect(() => {
    if (priorityActionsError) {
      toast({
        title: DASHBOARD_MESSAGES.ERROR.FAILED_TO_LOAD_PRIORITY_ACTIONS,
        description:
          DASHBOARD_MESSAGES.ERROR.FAILED_TO_LOAD_PRIORITY_ACTIONS_DESCRIPTION,
        variant: "destructive",
      });
    }
  }, [priorityActionsError, toast]);

  useEffect(() => {
    if (highValueOpportunitiesError) {
      toast({
        title: DASHBOARD_MESSAGES.ERROR.FAILED_TO_LOAD_OPPORTUNITIES,
        description:
          DASHBOARD_MESSAGES.ERROR.FAILED_TO_LOAD_OPPORTUNITIES_DESCRIPTION,
        variant: "destructive",
      });
    }
  }, [highValueOpportunitiesError, toast]);

  const stats: StatItem[] = useMemo(
    () =>
      buildDashboardStatItems({
        statsData: dashboardStats ?? DEFAULT_DASHBOARD_STATS,
        statsLoading,
      }),
    [dashboardStats, statsLoading]
  );

  const welcomeMessage = useMemo(() => {
    interface UserMetadata {
      given_name?: string;
      family_name?: string;
      name?: string;
    }
    const meta: UserMetadata =
      (user as { user_metadata?: UserMetadata })?.user_metadata || {};

    let firstName =
      userProfile?.first_name ||
      meta.given_name ||
      meta.name?.split?.(" ")?.[0];

    if (!firstName?.trim() && userProfile?.full_name) {
      firstName = userProfile.full_name.trim().split(/\s+/)[0];
    }

    if (!firstName?.trim()) {
      firstName = user?.email ? user.email.split("@")[0] : "";
    }

    const capitalize = (str: string) => {
      if (!str?.trim()) return "";
      return str
        .trim()
        .split(/\s+/)
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join(" ");
    };

    const formattedFirstName = capitalize(firstName || "");

    if (formattedFirstName) {
      return `Welcome back, ${formattedFirstName}!`;
    }
    return "Welcome back!";
  }, [user, userProfile]);

  return {
    user,
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
    navigate,
    applyJobId: pendingApplyJobId,
    applyRef: pendingApplyRef,
    clearApplyParams,
    consentToken,
    clearConsentToken,
  };
}
