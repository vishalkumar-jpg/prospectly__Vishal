export type LiveChatView = "home" | "messages" | "conversation";

export interface ConversationItem {
  id: string;
  titleOrSender: string;
  lastMessagePreview: string;
  timestamp: string | Date;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string | Date;
}

export interface LiveChatSupportSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOnline?: boolean;
  isLoading?: boolean;
  recentConversations: ConversationItem[];
  messages?: ChatMessage[];
  providerName?: string;
  initialView?: LiveChatView;
  onStartNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onSendMessage: (conversationId: string, text: string) => void;
  onHelpSearch: (query: string) => void;
}
