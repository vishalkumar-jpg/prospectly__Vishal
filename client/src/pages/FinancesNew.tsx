import { useState, useEffect } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { analytics } from "@/lib/analytics";
import SEO from "@/components/SEO";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  CreditCard,
  Receipt,
  Scale,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { formatCurrency } from "@/utils/formatter";
import { TransactionList } from "@/components/finance/TransactionList";
import { PaymentMethods } from "@/components/finance/PaymentMethods";
import { DisputesTab } from "@/components/finance/dispute/DisputesTab";
import { PayoutHistory } from "@/components/finance/PayoutHistory";
import { OverviewTab } from "@/components/finance/OverviewTab";
import { AddPaymentMethodModal } from "@/components/introduction/AddPaymentMethodModal";
import { RecruitmentFinanceTab } from "@/components/finance/RecruitmentFinanceTab";
import { FinanceHero } from "@/components/finance/FinanceHero";
import { HeaderStats } from "@/components/finance/HeaderStats";
import { usePayoutHistory } from "@/hooks/useTransactionHistory";
import { useDisputes } from "@/hooks/useDisputes";
import { useRouteTab } from "@/hooks/useRouteTab";
import {
  PROSPECTING_FINANCE_TABS,
  PROSPECTING_FINANCE_TAB_TO_SLUG,
  RECRUITING_FINANCE_TABS,
  RECRUITING_FINANCE_TAB_TO_SLUG,
  TAB_ROUTE_BASES,
} from "@/lib/tab-routes";
import { useAuth } from "@/contexts/AuthContext";
import { APP_MODULES, hasModuleAccess } from "@/lib/modules";
import {
  isReferCandidateStripeReturn,
  peekReferCandidateReturnContext,
} from "@/utils/refer-candidate-return";
import { useRecruitingHomeActivity } from "@/hooks/useWorkspaceHomeDestination";
import { Loader } from "@/components/ui/loader";

const ALLOWED_TABS = [
  "overview",
  "transactions",
  "payouts",
  "payment-methods",
  "disputes",
] as const;

const ALLOWED_SECTIONS = ["prospecting", "recruitment"] as const;

type FinanceTab = (typeof ALLOWED_TABS)[number];
type RecruitmentFinanceView = "connector" | "requester" | "candidate";

function sanitizeParam(
  param: string | null,
  allowed: readonly string[],
  defaultValue: string
): string {
  return param && allowed.includes(param) ? param : defaultValue;
}

const FINANCE_TAB_PAGE_META: Record<
  FinanceTab,
  { heading: string; description: string }
> = {
  overview: {
    heading: "Overview",
    description:
      "Earnings snapshot, charts, and recent activity across your finances",
  },
  transactions: {
    heading: "Transactions",
    description: "View and manage your payment transactions",
  },
  payouts: {
    heading: "Payouts",
    description: "Track earnings and payouts from your introductions",
  },
  "payment-methods": {
    heading: "Payments",
    description: "Manage saved cards and payout connection settings",
  },
  disputes: {
    heading: "Disputes",
    description: "Review and file disputes related to introductions",
  },
};

const FINANCE_RAIL_ITEMS: {
  id: FinanceTab;
  label: string;
  icon: typeof Wallet;
}[] = [
  { id: "overview", label: "Overview", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "payouts", label: "Payouts", icon: DollarSign },
  { id: "payment-methods", label: "Payments", icon: CreditCard },
  { id: "disputes", label: "Disputes", icon: Scale },
];

/** Vertical left-rail tab trigger (desktop) / horizontal scroll chip (mobile). */
const financeRailTriggerClassName =
  "relative w-auto shrink-0 justify-start gap-2.5 rounded-xl px-4 py-2.5 text-left text-[14px] font-medium text-sidebar-foreground transition-all hover:bg-blue-100/60 dark:hover:bg-blue-900/15 data-[state=active]:bg-brand-amethyst/10 data-[state=active]:text-brand-amethyst data-[state=active]:shadow-none lg:w-full before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-brand-gradient before:opacity-0 before:content-[''] data-[state=active]:before:opacity-100 max-lg:before:hidden";

export default function FinancesNew() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const canAccessRecruiting = hasModuleAccess(
    user?.accessibleModules,
    APP_MODULES.RECRUITING
  );

  const isRecruitmentPath = location.pathname.startsWith(
    TAB_ROUTE_BASES.recruitingTransactions
  );

  // Legacy ?section= support (develop) + path-based section (tab routes)
  const activeSectionRaw =
    searchParams.get("section") ??
    (isRecruitmentPath ? "recruitment" : "prospecting");
  const requestedSection = sanitizeParam(
    activeSectionRaw,
    ALLOWED_SECTIONS,
    "prospecting"
  );
  // Recruitment finances are only available to organisations with recruiting
  // access. Fall back to prospecting for everyone else (incl. deep links).
  const activeSection =
    requestedSection === "recruitment" && !canAccessRecruiting
      ? "prospecting"
      : requestedSection;

  // Strip a forced ?section=recruitment from the URL when access is denied.
  useEffect(() => {
    if (requestedSection === "recruitment" && !canAccessRecruiting) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("section");
      setSearchParams(newParams, { replace: true });
    }
  }, [requestedSection, canAccessRecruiting, searchParams, setSearchParams]);

  const isRecruitment =
    (isRecruitmentPath || activeSection === "recruitment") &&
    canAccessRecruiting;

  const recruitingActivity = useRecruitingHomeActivity(
    canAccessRecruiting && isRecruitment
  );
  const showRecruiterFinance =
    recruitingActivity.jobsStatsResolved && recruitingActivity.hasPostedJobs;
  const recruitmentFinanceVariant = showRecruiterFinance
    ? "recruiter"
    : "connector";
  const recruitmentAllowedTabs: RecruitmentFinanceView[] = showRecruiterFinance
    ? ["requester"]
    : ["connector", "candidate"];
  const recruitmentDefaultTab: RecruitmentFinanceView = showRecruiterFinance
    ? "requester"
    : "connector";

  const [prospectingTab, setProspectingTab] = useRouteTab<FinanceTab>({
    basePath: TAB_ROUTE_BASES.prospectingTransactions,
    allowedTabs: ALLOWED_TABS,
    defaultTab: "overview",
    slugToTab: PROSPECTING_FINANCE_TABS,
    tabToSlug: PROSPECTING_FINANCE_TAB_TO_SLUG,
    enabled: !isRecruitment,
  });

  const [recruitmentTab, setRecruitmentTab] =
    useRouteTab<RecruitmentFinanceView>({
      basePath: TAB_ROUTE_BASES.recruitingTransactions,
      allowedTabs: recruitmentAllowedTabs,
      defaultTab: recruitmentDefaultTab,
      slugToTab: RECRUITING_FINANCE_TABS,
      tabToSlug: RECRUITING_FINANCE_TAB_TO_SLUG,
      enabled: isRecruitment,
    });

  const activeTab = prospectingTab;
  const pageMeta = isRecruitment
    ? {
        heading: "Recruitment Finance",
        description:
          "Track connector payouts and requester spending in one place.",
      }
    : FINANCE_TAB_PAGE_META[activeTab];

  const { summary } = useFinancialSummary({
    enabled: !isRecruitment,
  });
  const { summary: payoutSummary } = usePayoutHistory({
    limit: 1,
    enabled: !isRecruitment,
  });
  const { disputes: allDisputes } = useDisputes(
    undefined,
    undefined,
    undefined,
    undefined,
    { enabled: !isRecruitment }
  );
  const { activities, isLoading: activitiesLoading } = useRecentActivity(5, {
    enabled: !isRecruitment,
  });
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [paymentMethodsKey, setPaymentMethodsKey] = useState(0);

  useEffect(() => {
    analytics.trackFeatureViewed({
      feature: "financial_hub",
      route: isRecruitment
        ? TAB_ROUTE_BASES.recruitingTransactions
        : TAB_ROUTE_BASES.prospectingTransactions,
      entryPoint: "direct",
    });
  }, [isRecruitment]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "bounty_payment":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      default:
        return <Receipt className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatCurrencyWithDecimals = (amount: number) =>
    formatCurrency(amount, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handlePaymentMethodAdded = () => {
    setPaymentMethodsKey((prev) => prev + 1);
  };

  const isReferStripeReturn =
    !isRecruitment && isReferCandidateStripeReturn(searchParams);

  useEffect(() => {
    if (!isReferStripeReturn) return;
    const referReturn = peekReferCandidateReturnContext();
    if (!referReturn) return;
    navigate(referReturn.returnPath, { replace: true });
  }, [isReferStripeReturn, navigate]);

  if (isRecruitmentPath && !authLoading && user && !canAccessRecruiting) {
    return (
      <Navigate
        to={`${TAB_ROUTE_BASES.prospectingTransactions}/${PROSPECTING_FINANCE_TAB_TO_SLUG.overview}`}
        replace
      />
    );
  }

  if (isReferStripeReturn) {
    return (
      <>
        <SEO
          title="Payouts - Prospectly"
          description="Confirming your bank connection"
        />
        <Loader fullPage size="lg" message="Confirming your bank connection…" />
      </>
    );
  }

  return (
    <>
      <SEO
        title={`${pageMeta.heading} - Prospectly`}
        description={pageMeta.description}
      />

      <main className="px-2 sm:px-4 md:px-6 py-4 space-y-6">
        {isRecruitment ? (
          <RecruitmentFinanceTab
            activeView={recruitmentTab}
            onViewChange={setRecruitmentTab}
            menuVariant={recruitmentFinanceVariant}
          />
        ) : (
          <>
            <FinanceHero
              heading={pageMeta.heading}
              description={pageMeta.description}
              statsClassName="lg:w-[640px]"
              rightSlot={
                ["overview", "payouts", "disputes"].includes(activeTab) ? (
                  <HeaderStats
                    activeTab={activeTab}
                    summary={summary}
                    payoutSummary={payoutSummary}
                    allDisputes={allDisputes}
                  />
                ) : undefined
              }
            />
            <Tabs
              value={activeTab}
              onValueChange={setProspectingTab}
              className="w-full min-w-0"
            >
              <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[260px_1fr]">
                <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
                  <TabsList className="flex h-auto w-full justify-start gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-2.5 shadow-sm [scrollbar-width:none] lg:flex-col lg:gap-1 [&::-webkit-scrollbar]:hidden">
                    <span className="hidden px-4 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:block">
                      Finances
                    </span>
                    {FINANCE_RAIL_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <TabsTrigger
                          key={item.id}
                          value={item.id}
                          className={cn(financeRailTriggerClassName)}
                          data-testid={`tab-${item.id}`}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="whitespace-nowrap">
                            {item.label}
                          </span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                <div className="min-w-0 space-y-6">
                  <TabsContent value="overview" className="mt-0 min-w-0">
                    <OverviewTab
                      summary={summary}
                      activities={activities}
                      activitiesLoading={activitiesLoading}
                      getActivityIcon={getActivityIcon}
                      formatCurrency={formatCurrencyWithDecimals}
                    />
                  </TabsContent>

                  <TabsContent value="transactions" className="mt-0 min-w-0">
                    <TransactionList />
                  </TabsContent>

                  <TabsContent value="payouts" className="mt-0 min-w-0">
                    <PayoutHistory />
                  </TabsContent>

                  <TabsContent
                    value="payment-methods"
                    className="mt-0 min-w-0 space-y-6"
                  >
                    <PaymentMethods
                      key={paymentMethodsKey}
                      onAddCardClick={() => setShowAddPaymentModal(true)}
                    />
                  </TabsContent>

                  <TabsContent value="disputes" className="mt-0 min-w-0">
                    <DisputesTab />
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </>
        )}
      </main>

      <AddPaymentMethodModal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSuccess={handlePaymentMethodAdded}
      />
    </>
  );
}
