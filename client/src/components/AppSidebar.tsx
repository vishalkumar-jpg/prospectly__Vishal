import { useMemo, useState } from "react";
import { Home, FileText, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { StripeConnectModal } from "@/components/finance/StripeConnectModal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { APP_MODULES, hasModuleAccess } from "@/lib/modules";
import {
  ACTIVE_BLUE,
  generalItems,
  prospectingItems,
  recruitingConnectorItems,
  recruitingRecruiterItems,
} from "./sidebar/nav-items";
import { TAB_ROUTE_BASES } from "@/lib/tab-routes";
import { FlatNavItems } from "./sidebar/FlatNavItems";
import { SidebarAccountSetup } from "./sidebar/SidebarAccountSetup";
import { usePayoutSettingsDeepLink } from "@/hooks/usePayoutSettingsDeepLink";
import { useWorkspaceFocus } from "@/hooks/useWorkspaceFocus";
import { useCalendarConnectModal } from "@/hooks/useCalendarConnectModal";
import { useGettingStartedProgress } from "@/hooks/useGettingStartedProgress";
import { useRecruitingHomeActivity } from "@/hooks/useWorkspaceHomeDestination";
import {
  CANDIDATE_SEARCH_PATH,
  RECRUITER_DASHBOARD_PATH,
} from "@/constants/recruitment-routes";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canAccessRecruiting = hasModuleAccess(
    user?.accessibleModules,
    APP_MODULES.RECRUITING
  );
  const { focus } = useWorkspaceFocus();
  const { data: gettingStartedProgress } = useGettingStartedProgress();
  const recruitingActivity = useRecruitingHomeActivity(
    canAccessRecruiting && focus === "recruiting"
  );
  const { pathname } = useLocation();
  const { openModal: openCalendarModal, modal: calendarConnectModal } =
    useCalendarConnectModal("/dashboard");

  const layoutMode =
    !canAccessRecruiting || focus === "prospecting"
      ? "prospecting"
      : "recruiting";

  const gettingStartedComplete =
    gettingStartedProgress?.step1Complete &&
    gettingStartedProgress?.step2Complete &&
    gettingStartedProgress?.step3Complete;
  const showGettingStarted = !(
    layoutMode === "recruiting" &&
    gettingStartedComplete &&
    recruitingActivity.hasPostedJobs
  );
  const showRecruiterMenus =
    recruitingActivity.jobsStatsResolved && recruitingActivity.hasPostedJobs;

  const recruitingNavItems = useMemo(() => {
    if (!showRecruiterMenus) {
      return recruitingConnectorItems;
    }

    let items = [...recruitingRecruiterItems];
    if (recruitingActivity.hasConfirmedNoPostedJobs) {
      items = items.filter((item) => item.url !== RECRUITER_DASHBOARD_PATH);
    }
    if (!recruitingActivity.hasPostedJobs) {
      items = items.filter((item) => item.url !== CANDIDATE_SEARCH_PATH);
    }
    return items;
  }, [
    showRecruiterMenus,
    recruitingActivity.hasConfirmedNoPostedJobs,
    recruitingActivity.hasPostedJobs,
  ]);

  // Recruiting: My Contacts lives in connector nav only — never duplicate from generalItems.
  const showMyContactsInGeneral = layoutMode !== "recruiting";
  const showDashboard = layoutMode !== "recruiting";
  const showTrustScore = layoutMode !== "recruiting";
  const showLabels = state !== "collapsed" || isMobile;

  const filteredGeneralItems = generalItems.filter((item) => {
    if (!showTrustScore && item.url === "/trust-score") return false;
    if (!showMyContactsInGeneral && item.url === TAB_ROUTE_BASES.myContacts) {
      return false;
    }
    return true;
  });

  const [showStripeConnectModal, setShowStripeConnectModal] = useState(false);
  const {
    connectReturnUrl: stripeConnectReturnUrl,
    connectRefreshUrl: stripeConnectRefreshUrl,
    handleClose: handlePayoutSettingsDeepLinkClose,
  } = usePayoutSettingsDeepLink({
    onOpen: () => setShowStripeConnectModal(true),
  });

  const isActive = (url: string) => {
    const [targetPath] = url.split("?");
    return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
  };

  const baseBtn =
    "w-full flex items-center justify-start pl-3 pr-5 py-5 rounded-md transition-all duration-200 text-[15px] gap-3 whitespace-nowrap font-normal hover:bg-brand-amethyst/10 dark:hover:bg-brand-amethyst/15";

  const handleItemClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarContent className="flex h-screen flex-col">
          <div
            className={cn(
              "border-b h-16 px-4 flex items-center",
              state === "collapsed" && !isMobile
                ? "justify-center"
                : "justify-between"
            )}
          >
            <img
              src={
                state === "collapsed" && !isMobile
                  ? "/favicon.png"
                  : "/prospectly-logo.png"
              }
              className="h-9"
              alt="Prospectly logo"
            />
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpenMobile(false)}
                className="h-9 w-9 hover:bg-brand-amethyst/10 dark:hover:bg-brand-amethyst/15"
                aria-label="Close sidebar"
              >
                <X className="h-6 w-6 text-muted-foreground" />
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 pt-3 thin-scroll">
            <SidebarMenu className="space-y-1.5">
              {showGettingStarted ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Getting Started"
                    className={cn(
                      baseBtn,
                      isActive("/getting-started") && ACTIVE_BLUE
                    )}
                    onClick={handleItemClick}
                  >
                    <NavLink to="/getting-started?step=1">
                      <div className="w-6 flex justify-center">
                        <FileText className="h-[18px] w-[18px] text-foreground" />
                      </div>
                      {showLabels && (
                        <span className="text-[14px] font-medium">
                          Getting Started
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {showDashboard && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Dashboard"
                    className={cn(
                      baseBtn,
                      pathname === "/dashboard" && ACTIVE_BLUE
                    )}
                    onClick={handleItemClick}
                  >
                    <NavLink to="/dashboard">
                      <div className="w-6 flex justify-center">
                        <Home className="h-[18px] w-[18px] text-foreground" />
                      </div>
                      {showLabels && (
                        <span className="text-[14px] font-medium">
                          Dashboard
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {layoutMode === "prospecting" && (
                <>
                  <FlatNavItems
                    items={prospectingItems}
                    isActive={isActive}
                    baseBtn={baseBtn}
                    onItemClick={handleItemClick}
                    showLabels={showLabels}
                  />
                  <FlatNavItems
                    items={recruitingConnectorItems.filter(
                      (item) => item.url === TAB_ROUTE_BASES.myApplications
                    )}
                    isActive={isActive}
                    baseBtn={baseBtn}
                    onItemClick={handleItemClick}
                    showLabels={showLabels}
                  />
                </>
              )}

              {layoutMode === "recruiting" && canAccessRecruiting && (
                <FlatNavItems
                  items={recruitingNavItems}
                  isActive={isActive}
                  baseBtn={baseBtn}
                  onItemClick={handleItemClick}
                  showLabels={showLabels}
                />
              )}

              {filteredGeneralItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={cn(baseBtn, isActive(item.url) && ACTIVE_BLUE)}
                    onClick={handleItemClick}
                  >
                    <NavLink to={item.url}>
                      <div className="w-6 flex justify-center">
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px]",
                            item.iconClassName || "text-foreground"
                          )}
                        />
                      </div>
                      {showLabels && (
                        <span className="text-[14px] font-medium">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>

          <SidebarAccountSetup
            onOpenStripeModal={() => setShowStripeConnectModal(true)}
            onOpenCalendarModal={() => openCalendarModal()}
            onNavigate={handleItemClick}
          />
        </SidebarContent>
      </Sidebar>
      <StripeConnectModal
        isOpen={showStripeConnectModal}
        onClose={() => {
          setShowStripeConnectModal(false);
          handlePayoutSettingsDeepLinkClose();
        }}
        onSuccess={() => {
          setShowStripeConnectModal(false);
          void queryClient.invalidateQueries({
            queryKey: ["/api/stripe/payouts/status"],
          });
        }}
        connectReturnUrl={stripeConnectReturnUrl}
        connectRefreshUrl={stripeConnectRefreshUrl}
      />
      {calendarConnectModal}
    </>
  );
}
