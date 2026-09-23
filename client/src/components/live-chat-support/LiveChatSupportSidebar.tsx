import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { LiveChatView } from "./types";
import type { LiveChatSupportSidebarProps } from "./types";
import { Loader2 } from "lucide-react";
import { LiveChatSupportHeader } from "./LiveChatSupportHeader";
import { LiveChatSupportNavBar } from "./LiveChatSupportNavBar";
import { LiveChatSupportFooter } from "./LiveChatSupportFooter";
import { LiveChatSupportHomeView } from "./LiveChatSupportHomeView";
import { LiveChatSupportMessagesView } from "./LiveChatSupportMessagesView";
import { LiveChatSupportConversationView } from "./LiveChatSupportConversationView";

const SIDEBAR_WIDTH_CLASS = "w-full sm:w-[420px]";

export function LiveChatSupportSidebar({
  open,
  onOpenChange,
  isOnline = true,
  isLoading = false,
  recentConversations,
  messages = [],
  providerName,
  initialView = "home",
  onStartNewConversation,
  onSelectConversation,
  onSendMessage,
  onHelpSearch,
}: LiveChatSupportSidebarProps) {
  const [view, setView] = useState<LiveChatView>("home");
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleBack = useCallback(() => {
    if (view === "conversation") {
      setView("messages");
      setSelectedConversationId(null);
    } else {
      setView("home");
    }
  }, [view]);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setIsContentLoading(true);
    setView("conversation");
  }, []);

  const handleStartNew = useCallback(() => {
    setSelectedConversationId(null);
    setIsContentLoading(true);
    setView("conversation");
    onStartNewConversation();
  }, [onStartNewConversation]);

  useEffect(() => {
    if (open) {
      setView(initialView ?? "home");
      setSelectedConversationId(null);
      setIsContentLoading(initialView === "conversation");
    } else {
      setIsContentLoading(false);
    }
  }, [open, initialView]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  const showNavBar = view === "messages";
  const conversationMessages =
    view === "conversation" && selectedConversationId ? messages : [];
  const effectiveConversationId = selectedConversationId ?? "new";
  const showLoader = view === "conversation" && (isLoading || isContentLoading);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300"
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full flex flex-col bg-background border-l z-[101]",
          "transform transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
          SIDEBAR_WIDTH_CLASS
        )}
        role="dialog"
        aria-label="Live Chat Support"
        aria-modal="true"
      >
        <LiveChatSupportHeader
          isOnline={isOnline}
          onClose={() => onOpenChange(false)}
          closeRef={closeButtonRef}
        />
        {showNavBar && <LiveChatSupportNavBar onBack={handleBack} />}
        <div
          key={view}
          className="flex-1 flex flex-col min-h-0 overflow-hidden relative"
        >
          {view === "home" && !showLoader && (
            <LiveChatSupportHomeView
              recentConversations={recentConversations}
              onSelectConversation={handleSelectConversation}
              onHelpSearch={onHelpSearch}
            />
          )}
          {view === "messages" && !showLoader && (
            <LiveChatSupportMessagesView
              onStartNewConversation={handleStartNew}
              recentConversations={recentConversations}
              onSelectConversation={handleSelectConversation}
            />
          )}
          {view === "conversation" && (
            <>
              {showLoader && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center min-h-[280px] gap-3 bg-background z-10"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <Loader2
                    className="h-10 w-10 animate-spin text-primary"
                    aria-hidden
                  />
                  <p className="text-sm text-muted-foreground">
                    Loading support...
                  </p>
                  <span className="sr-only">Loading support</span>
                </div>
              )}
              <LiveChatSupportConversationView
                conversationId={effectiveConversationId}
                messages={conversationMessages}
                onSendMessage={onSendMessage}
                useTawkWidget={true}
                onReady={() => setIsContentLoading(false)}
              />
            </>
          )}
        </div>
        {view !== "conversation" && (
          <LiveChatSupportFooter
            providerName={providerName}
            onNavigateHome={() => setView("home")}
            onNavigateMessages={() => {
              setView("messages");
              setSelectedConversationId(null);
            }}
            currentView={view}
          />
        )}
      </aside>
    </>
  );
}
