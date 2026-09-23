import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronRight } from "lucide-react";
import { formatRelativeTime } from "@/utils/dateFormatter";
import type { ConversationItem } from "./types";

interface LiveChatSupportHomeViewProps {
  recentConversations: ConversationItem[];
  onSelectConversation: (id: string) => void;
  onHelpSearch: (query: string) => void;
}

export function LiveChatSupportHomeView({
  recentConversations,
  onSelectConversation,
  onHelpSearch,
}: LiveChatSupportHomeViewProps) {
  const [helpQuery, setHelpQuery] = useState("");

  const handleHelpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = helpQuery.trim();
    if (q) onHelpSearch(q);
  };

  const formatTime = (ts: string | Date) =>
    typeof ts === "string" && !Number.isNaN(Date.parse(ts))
      ? formatRelativeTime(ts)
      : typeof ts === "string"
        ? ts
        : formatRelativeTime(ts);

  return (
    <div className="flex-1 flex flex-col bg-green-500 dark:bg-green-600 overflow-hidden">
      <div className="p-4 text-white shrink-0">
        <h3 className="text-xl font-bold">Hi there 👋</h3>
        <p className="text-sm text-white/90 mt-1">
          Need help? Search our help center for answers or start a conversation:
        </p>
      </div>
      <ScrollArea className="flex-1 px-4 pb-4">
        <div className="space-y-4">
          <Card className="shadow-md">
            <CardHeader className="py-3 px-4">
              <h4 className="text-sm font-semibold">Recent Conversations</h4>
            </CardHeader>
            <CardContent className="p-0 pt-0 px-4 pb-4">
              {recentConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No recent conversations
                </p>
              ) : (
                <ul className="space-y-0">
                  {recentConversations.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onSelectConversation(c.id)}
                        className="w-full flex items-center gap-2 py-3 min-h-[44px] text-left border-b border-border last:border-0 hover:bg-muted/50 rounded-md px-2 -mx-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              {c.titleOrSender}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatTime(c.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {c.lastMessagePreview}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="py-3 px-4">
              <h4 className="text-sm font-semibold">Help Center</h4>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <form onSubmit={handleHelpSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for answers"
                  value={helpQuery}
                  onChange={(e) => setHelpQuery(e.target.value)}
                  className="pl-9"
                  aria-label="Search help center"
                />
              </form>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
