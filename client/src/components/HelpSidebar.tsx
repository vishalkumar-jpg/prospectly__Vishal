import { LiveChatSupportSidebar } from "@/components/live-chat-support";

interface HelpSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Thin wrapper around Live Chat Support Sidebar for backward compatibility.
 * Parent can use LiveChatSupportSidebar directly to pass conversations, messages, and callbacks.
 */
const HelpSidebar = ({ isOpen, onClose }: HelpSidebarProps) => (
  <LiveChatSupportSidebar
    open={isOpen}
    onOpenChange={(open) => !open && onClose()}
    isOnline={true}
    recentConversations={[]}
    messages={[]}
    providerName="tawk.to"
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
);

export default HelpSidebar;
