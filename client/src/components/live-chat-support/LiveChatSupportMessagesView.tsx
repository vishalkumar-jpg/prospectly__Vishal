import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ChevronRight } from "lucide-react";
import { utcDayjs } from "@/lib/dayjs";
import { formatRelativeTime } from "@/utils/dateFormatter";
import type { ConversationItem } from "./types";

interface LiveChatSupportMessagesViewProps {
  onStartNewConversation: () => void;
  recentConversations: ConversationItem[];
  onSelectConversation: (id: string) => void;
}

export function LiveChatSupportMessagesView({
  onStartNewConversation,
  recentConversations,
  onSelectConversation,
}: LiveChatSupportMessagesViewProps) {
  const formatTime = (ts: string | Date) =>
    typeof ts === "string"
      ? utcDayjs(ts).isValid()
        ? formatRelativeTime(ts)
        : ts
      : formatRelativeTime(ts);

  return (
    <div className="flex-1 flex flex-col bg-muted/20 overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Start a new chat
            </h3>
            <button
              type="button"
              onClick={onStartNewConversation}
              aria-label="Start a new chat"
              className="w-full rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer hover:bg-muted/50 transition-colors text-left"
            >
              <CardContent className="p-4 flex items-center gap-3 min-h-[44px]">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">New Conversation</p>
                  <p className="text-sm text-muted-foreground">
                    We typically reply in a few minutes
                  </p>
                </div>
                <Send
                  className="h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </CardContent>
            </button>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Recent
            </h3>
            <ul className="space-y-1">
              {recentConversations.length === 0 ? (
                <li className="text-sm text-muted-foreground py-2">
                  No recent conversations
                </li>
              ) : (
                recentConversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(c.id)}
                      className="w-full flex items-center gap-2 p-3 min-h-[44px] text-left rounded-lg border border-border hover:bg-muted/50 transition-colors"
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
                ))
              )}
            </ul>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
