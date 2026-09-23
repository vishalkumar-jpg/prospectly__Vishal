import { Button } from "@/components/ui/button";
import { Home, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveChatSupportFooterProps {
  providerName?: string;
  onNavigateHome: () => void;
  onNavigateMessages: () => void;
  currentView: "home" | "messages" | "conversation";
  hideAttribution?: boolean;
}

export function LiveChatSupportFooter({
  providerName = "tawk.to",
  onNavigateHome,
  onNavigateMessages,
  currentView,
  hideAttribution = false,
}: LiveChatSupportFooterProps) {
  return (
    <div className="shrink-0 bg-background border-t border-border px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onNavigateHome}
          className={cn(
            "h-11 w-11 min-w-[44px] min-h-[44px]",
            currentView === "home" && "bg-muted"
          )}
          aria-label="Go to home"
        >
          <Home className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNavigateMessages}
          className={cn(
            "h-11 w-11 min-w-[44px] min-h-[44px]",
            (currentView === "messages" || currentView === "conversation") &&
              "bg-muted"
          )}
          aria-label="Go to messages list"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>
      {!hideAttribution && (
        <p className="text-center text-xs text-muted-foreground mt-2">
          Powered by {providerName}
        </p>
      )}
    </div>
  );
}
