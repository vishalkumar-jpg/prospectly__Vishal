import { useState, useEffect, useMemo, useRef } from "react";
import {
  Outlet,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRequestClaim } from "@/contexts/RequestClaimContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut,
  MessageCircle,
  ChevronDown,
  Headphones,
  Heart,
  User,
  MessageSquare,
  Crown,
  Loader2,
  Menu,
  X,
} from "lucide-react";
import { DealClaimProgressBanner } from "@/components/marketplace/DealClaimProgressBanner";
import { Link } from "react-router-dom";
import FeedbackSidebar from "@/components/FeedbackSidebar";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { WorkspaceFocusDropdown } from "@/components/WorkspaceFocusDropdown";
import { RecruitingQuickStartWidget } from "@/components/recruitment/RecruitingQuickStartWidget";
import { ProspectingQuickStartWidget } from "@/components/prospecting/ProspectingQuickStartWidget";
import { DashboardQuickStartWidget } from "@/components/dashboard/DashboardQuickStartWidget";
import { cn } from "@/lib/utils";
import { isValidPhotoUrl } from "@/utils/security";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EmailSidebar from "@/components/EmailSidebar";
import ChatSidebar from "@/components/ChatSidebar";
import ProspectlyGPT from "@/components/ProspectlyGPT";
import { LiveChatSupportSidebar } from "@/components/live-chat-support";
import { HelpSupportSidebar } from "@/components/help-support";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FEEDBACK_EMAIL_QUERY } from "@/constants/feedback";

// User metadata interface for extended user properties
interface UserMetadata {
  picture?: string;
  avatar_url?: string;
  name?: string;
  given_name?: string;
}

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, photoVersion } = useAuth();
  const { activeClaim, hasActiveClaim, completedStepsCount, abandonClaim } =
    useRequestClaim();
  const { toast } = useToast();
  const [showClaimBanner, setShowClaimBanner] = useState(true);

  // Hide banner on Getting Started page (content shown there instead)
  const isOnGettingStarted = location.pathname.includes("/getting-started");
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(
    null
  );
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);
  const userMeta = ((user as { user_metadata?: UserMetadata })?.user_metadata ||
    {}) as UserMetadata;

  // Use user data from AuthContext (already fetched on app load)
  useEffect(() => {
    if (user) {
      // Extract fullName from user object (api.auth.me returns full profile)
      // User object contains fullName property
      setUserProfile({
        full_name: user.fullName,
      });
    }
  }, [user]);

  const [isEmailSidebarOpen, setIsEmailSidebarOpen] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const [isProspectlyGPTOpen, setIsProspectlyGPTOpen] = useState(false);
  const [isHelpSupportSidebarOpen, setIsHelpSupportSidebarOpen] =
    useState(false);
  const [isHelpSidebarOpen, setIsHelpSidebarOpen] = useState(false);
  const [isFeedbackSidebarOpen, setIsFeedbackSidebarOpen] = useState(false);
  const [openMyFeedbackModal, setOpenMyFeedbackModal] = useState(false);
  const [hasFeedbackData, setHasFeedbackData] = useState(false);
  const [showFeedbackDiscardDialog, setShowFeedbackDiscardDialog] =
    useState(false);
  const [feedbackDiscardTarget, setFeedbackDiscardTarget] = useState<
    "help-support" | "live-chat" | null
  >(null);
  const [feedbackResetCount, setFeedbackResetCount] = useState(0);
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Track previous profilePhotoUrl to detect changes for cache busting
  const prevPhotoUrlRef = useRef<string | null | undefined>(null);
  const [photoUrlTimestamp, setPhotoUrlTimestamp] = useState(Date.now());

  // Update timestamp when profilePhotoUrl changes or when photoVersion increments (after photo upload)
  useEffect(() => {
    if (user?.profilePhotoUrl !== prevPhotoUrlRef.current || photoVersion > 0) {
      prevPhotoUrlRef.current = user?.profilePhotoUrl;
      setPhotoUrlTimestamp(Date.now());
    }
  }, [user?.profilePhotoUrl, photoVersion]);

  // Lock body scroll when Help & Support, Live Chat, or Feedback overlay sidebar is open
  useEffect(() => {
    if (
      isHelpSupportSidebarOpen ||
      isHelpSidebarOpen ||
      isFeedbackSidebarOpen
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isHelpSupportSidebarOpen, isHelpSidebarOpen, isFeedbackSidebarOpen]);

  useEffect(() => {
    const shouldOpenFeedback =
      searchParams.get(FEEDBACK_EMAIL_QUERY.open) === "open";
    if (!shouldOpenFeedback) return;

    const shouldOpenMyFeedback =
      searchParams.get(FEEDBACK_EMAIL_QUERY.myFeedback) === "1";

    setIsHelpSupportSidebarOpen(false);
    setIsHelpSidebarOpen(false);
    setIsFeedbackSidebarOpen(true);
    setOpenMyFeedbackModal(shouldOpenMyFeedback);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(FEEDBACK_EMAIL_QUERY.open);
    nextParams.delete(FEEDBACK_EMAIL_QUERY.myFeedback);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Extract profile photo URL from user object
  // Backend converts S3 keys to CloudFront URLs
  const profilePhotoUrl = useMemo(() => {
    if (!user?.profilePhotoUrl) {
      return undefined;
    }

    const photoUrl = user.profilePhotoUrl;

    // Validate URL - must be a valid HTTP/HTTPS URL
    if (typeof photoUrl === "string" && isValidPhotoUrl(photoUrl)) {
      // Add cache-busting timestamp to force browser to fetch new image after upload
      const separator = photoUrl.includes("?") ? "&" : "?";
      return `${photoUrl}${separator}t=${photoUrlTimestamp}`;
    }

    // If somehow we got an S3 key or invalid URL, return undefined to use fallback
    return undefined;
  }, [user?.profilePhotoUrl, photoUrlTimestamp]);

  const openSupportItem = (
    target: "help-support" | "live-chat" | "feedback"
  ) => {
    // Always close all support sidebars first to prevent overlapping panels
    setIsHelpSupportSidebarOpen(false);
    setIsHelpSidebarOpen(false);

    if (isFeedbackSidebarOpen && hasFeedbackData && target !== "feedback") {
      setFeedbackDiscardTarget(
        target === "help-support" ? "help-support" : "live-chat"
      );
      setShowFeedbackDiscardDialog(true);
    } else {
      setIsFeedbackSidebarOpen(false);
      if (target === "help-support") setIsHelpSupportSidebarOpen(true);
      else if (target === "live-chat") setIsHelpSidebarOpen(true);
      else setIsFeedbackSidebarOpen(true);
    }
    setIsSupportMenuOpen(false);
  };

  const profileDropdownTrigger = (
    <button
      type="button"
      className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-full border border-border bg-background py-1 pl-1 pr-1 shadow-sm transition-all hover:border-primary/30 hover:shadow-md md:pr-3.5 !outline-none focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 active:!outline-none data-[state=open]:!outline-none data-[state=open]:!ring-0 data-[state=open]:!border-border data-[state=open]:!shadow-sm"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-primary/10">
        <AvatarImage
          src={profilePhotoUrl}
          alt="Profile"
          className="object-cover"
          referrerPolicy="no-referrer"
          {...(import.meta.env.MODE === "local" && {
            crossOrigin: "anonymous",
          })}
          onError={(e) => {
            e.currentTarget.src = "";
          }}
        />
        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          {(() => {
            const firstFromMeta =
              userMeta.name?.split?.(" ")[0] || userMeta.given_name;
            const firstFromProfile = userProfile?.full_name
              ? userProfile.full_name.split(" ")[0]
              : null;
            const fallback = user?.email ? user.email.split("@")[0] : "U";
            const firstName = firstFromMeta || firstFromProfile || fallback;
            return firstName ? firstName.charAt(0).toUpperCase() : "U";
          })()}
        </AvatarFallback>
      </Avatar>
      <span className="hidden truncate text-sm font-semibold text-foreground md:inline">
        {(() => {
          const firstFromMeta =
            userMeta.name?.split?.(" ")[0] || userMeta.given_name;
          const firstFromProfile = userProfile?.full_name
            ? userProfile.full_name.split(" ")[0]
            : null;
          const fallback = user?.email ? user.email.split("@")[0] : "User";
          return firstFromMeta || firstFromProfile || fallback;
        })()}
      </span>
      <ChevronDown className="hidden h-3.5 w-3.5 flex-shrink-0 text-muted-foreground md:block" />
    </button>
  );

  return (
    <SidebarProvider>
      <div className="flex h-svh w-full min-w-0 overflow-hidden">
        {!isOnGettingStarted && <AppSidebar />}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-w-0">
          {/* Deal Claim Progress Banner */}
          {hasActiveClaim &&
            showClaimBanner &&
            !isOnGettingStarted &&
            activeClaim && (
              <DealClaimProgressBanner
                activeClaim={activeClaim}
                completedStepsCount={completedStepsCount}
                onDismiss={() => setShowClaimBanner(false)}
                onAbandon={abandonClaim}
              />
            )}

          {/* Header — fixed height; main scrolls below (not with header) */}
          <header className="z-50 flex h-16 shrink-0 items-center border-b bg-background/95 px-3 backdrop-blur-md md:px-6">
            <div className="flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden">
              <div className="flex min-w-0 shrink items-center gap-2 md:gap-4">
                {!isOnGettingStarted && (
                  <SidebarTrigger className="w-9 h-9 rounded-[11px] bg-muted/50 border border-border text-muted-foreground transition-all hover:bg-background hover:text-foreground hover:-translate-y-px hover:shadow-sm" />
                )}
                {isOnGettingStarted && (
                  <img
                    src="/prospectly-logo.png"
                    className="h-7 max-w-[120px] object-contain object-left md:h-9 md:max-w-none"
                    alt="Prospectly logo"
                  />
                )}
              </div>

              {/* Mobile: focus switcher + profile and hamburger */}
              <div className="flex min-w-0 flex-1 items-center justify-end md:hidden">
                <div className="flex shrink-0 items-center gap-1.5">
                  <WorkspaceFocusDropdown />
                  <div className="shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        {profileDropdownTrigger}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 bg-background border shadow-lg z-50 rounded-xl p-1.5"
                      >
                        <DropdownMenuItem asChild>
                          <Link
                            to="/my-contacts?invite=true"
                            className="flex items-center"
                          >
                            <Heart className="h-4 w-4 mr-2 text-pink-500" />
                            Share The Love
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/profile" className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            to="/profile/subscriptions"
                            className="flex items-center"
                          >
                            <Crown className="h-4 w-4 mr-2" />
                            Subscription
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowLogoutDialog(true)}
                          className="flex items-center text-red-600 cursor-pointer"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSupportMenuOpen(true)}
                    className="p-2 shrink-0"
                    aria-label="Open support menu"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              {/* Desktop: support buttons + profile */}
              <div className="hidden md:flex items-center gap-2.5 shrink-0">
                <WorkspaceFocusDropdown />

                <button
                  type="button"
                  onClick={() => openSupportItem("help-support")}
                  title="Help & Support"
                  aria-label="Help & Support"
                  className="w-9 h-9 rounded-[11px] bg-muted/50 border border-border text-muted-foreground grid place-items-center transition-all hover:bg-background hover:text-foreground hover:-translate-y-px hover:shadow-sm"
                >
                  <Headphones className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => openSupportItem("live-chat")}
                  title="Live Chat Support"
                  aria-label="Live Chat Support"
                  className="w-9 h-9 rounded-[11px] bg-muted/50 border border-border text-muted-foreground grid place-items-center transition-all hover:bg-background hover:text-foreground hover:-translate-y-px hover:shadow-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => openSupportItem("feedback")}
                  title="Feedback"
                  aria-label="Feedback"
                  className="w-9 h-9 rounded-[11px] bg-muted/50 border border-border text-muted-foreground grid place-items-center transition-all hover:bg-background hover:text-foreground hover:-translate-y-px hover:shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>

                <div className="w-px h-[22px] bg-border mx-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {profileDropdownTrigger}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-background border shadow-lg z-50 rounded-xl p-1.5"
                  >
                    <DropdownMenuItem asChild>
                      <Link
                        to="/my-contacts?invite=true"
                        className="flex items-center"
                      >
                        <Heart className="h-4 w-4 mr-2 text-pink-500" />
                        Share The Love
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile/subscriptions"
                        className="flex items-center"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Subscription
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowLogoutDialog(true)}
                      className="flex items-center text-red-600 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Mobile Support Menu Overlay (top-down, like landing page) */}
          {isSupportMenuOpen && isMobile && (
            <div className="fixed top-0 left-0 w-full bg-background/95 backdrop-blur-md border-b border-border rounded-b-3xl shadow-xl z-[60] animate-in slide-in-from-top-5">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg font-semibold">Support</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSupportMenuOpen(false)}
                    aria-label="Close support menu"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex flex-col space-y-2 pb-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => openSupportItem("help-support")}
                  >
                    <div className="w-8 h-8 rounded-[10px] bg-muted/50 border border-border text-muted-foreground grid place-items-center shrink-0">
                      <Headphones className="h-4 w-4" />
                    </div>
                    Help & Support
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => openSupportItem("live-chat")}
                  >
                    <div className="w-8 h-8 rounded-[10px] bg-muted/50 border border-border text-muted-foreground grid place-items-center shrink-0">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    Live Chat Support
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-11"
                    onClick={() => openSupportItem("feedback")}
                  >
                    <div className="w-8 h-8 rounded-[10px] bg-muted/50 border border-border text-muted-foreground grid place-items-center shrink-0">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    Feedback
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main
            className={cn(
              "relative min-h-0 flex-1 overflow-x-clip bg-app transition-all duration-300",
              isOnGettingStarted
                ? "flex flex-col overflow-hidden"
                : "overflow-y-auto",
              isProspectlyGPTOpen && "md:mr-[500px]",
              isEmailSidebarOpen && "md:mr-[384px]",
              isChatSidebarOpen && "md:mr-[384px]"
            )}
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* AI Assistant Side Panel */}
      <ProspectlyGPT
        isOpen={isProspectlyGPTOpen}
        onOpenChange={setIsProspectlyGPTOpen}
      />

      {/* Email/Notifications Sidebar */}
      <EmailSidebar
        isOpen={isEmailSidebarOpen}
        onClose={() => setIsEmailSidebarOpen(false)}
      />

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={isChatSidebarOpen}
        onClose={() => setIsChatSidebarOpen(false)}
      />

      {/* Help & Support Sidebar (Join Meeting + link to Live Chat) */}
      <HelpSupportSidebar
        open={isHelpSupportSidebarOpen}
        onOpenChange={setIsHelpSupportSidebarOpen}
      />

      {/* Live Chat Support Sidebar (includes backdrop) */}
      <LiveChatSupportSidebar
        open={isHelpSidebarOpen}
        onOpenChange={setIsHelpSidebarOpen}
        isOnline={true}
        recentConversations={[]}
        messages={[]}
        providerName="tawk.to"
        initialView="conversation"
        onStartNewConversation={() => {}}
        onSelectConversation={() => {}}
        onSendMessage={() => {}}
        onHelpSearch={(query: string) => {
          window.open(
            `https://help.prospectly.com/search?q=${encodeURIComponent(query)}`,
            "_blank"
          );
        }}
      />

      <FeedbackSidebar
        isOpen={isFeedbackSidebarOpen}
        onClose={() => setIsFeedbackSidebarOpen(false)}
        onHasDataChange={setHasFeedbackData}
        resetTrigger={feedbackResetCount}
        openMyFeedbackModal={openMyFeedbackModal}
        onMyFeedbackModalOpened={() => setOpenMyFeedbackModal(false)}
      />

      <AlertDialog
        open={showFeedbackDiscardDialog}
        onOpenChange={setShowFeedbackDiscardDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved data in the feedback form. If you switch to Help
              & Support, your data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setFeedbackResetCount((prev) => prev + 1);
                setIsFeedbackSidebarOpen(false);
                if (feedbackDiscardTarget === "live-chat") {
                  setIsHelpSidebarOpen(true);
                } else {
                  setIsHelpSupportSidebarOpen(true);
                }
                setFeedbackDiscardTarget(null);
                setShowFeedbackDiscardDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard & Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showLogoutDialog}
        onOpenChange={(open) => {
          // Prevent closing dialog while logout is in progress
          // Use ref to check immediately (before state update)
          if (!open && (isLoggingOut || isLoggingOutRef.current)) {
            // Prevent closing - keep dialog open
            return;
          }
          // Only update state if we're not in the middle of logout
          if (!isLoggingOut && !isLoggingOutRef.current) {
            setShowLogoutDialog(open);
          }
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(e) => {
            // Prevent closing dialog with ESC key while logout is in progress
            if (isLoggingOut || isLoggingOutRef.current) {
              e.preventDefault();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be logged out of Prospectly. You can sign back in
              anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isLoggingOut}
              onClick={(e) => {
                // Prevent cancel action while logout is in progress
                if (isLoggingOut || isLoggingOutRef.current) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              Stay logged in
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                // Set both state and ref immediately to prevent dialog closing
                isLoggingOutRef.current = true;
                setIsLoggingOut(true);
                try {
                  await logout();
                  toast({
                    title: "Signed out successfully",
                    description: "You have been logged out of your account.",
                  });
                  // Close dialog only after successful logout
                  isLoggingOutRef.current = false;
                  setIsLoggingOut(false);
                  setShowLogoutDialog(false);
                  navigate("/signin");
                } catch {
                  toast({
                    title: "Sign out failed",
                    description:
                      "There was an error signing you out. Please try again.",
                    variant: "destructive",
                  });
                  // Keep dialog open on error so user can retry
                  isLoggingOutRef.current = false;
                  setIsLoggingOut(false);
                }
              }}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing out...
                </>
              ) : (
                "Sign out"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Switcher */}
      <QuickSwitcher />

      <DashboardQuickStartWidget />
      <RecruitingQuickStartWidget />
      <ProspectingQuickStartWidget />
    </SidebarProvider>
  );
};

export default DashboardLayout;
