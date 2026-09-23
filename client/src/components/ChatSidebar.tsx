import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Search, Phone, Video, X } from "lucide-react";

// Mock chat conversations
const mockChats = [
  {
    id: 1,
    name: "Sarah Mitchell",
    lastMessage: "Are you available for a quick call about the TechCorp intro?",
    time: "5 min ago",
    unread: 2,
    avatar: "SM",
    online: true,
    messages: [
      {
        id: 1,
        sender: "Sarah Mitchell",
        message: "Hi Pranav! Hope you're doing well",
        time: "10 min ago",
        isMe: false,
      },
      {
        id: 2,
        sender: "Me",
        message: "Hey Sarah! I'm good, thanks for asking",
        time: "8 min ago",
        isMe: true,
      },
      {
        id: 3,
        sender: "Sarah Mitchell",
        message: "Are you available for a quick call about the TechCorp intro?",
        time: "5 min ago",
        isMe: false,
      },
    ],
  },
  {
    id: 2,
    name: "Alex Johnson",
    lastMessage: "Perfect! I'll send the contract details shortly",
    time: "2 hours ago",
    unread: 0,
    avatar: "AJ",
    online: false,
    messages: [
      {
        id: 1,
        sender: "Alex Johnson",
        message: "Thanks for the intro to Maria!",
        time: "3 hours ago",
        isMe: false,
      },
      {
        id: 2,
        sender: "Me",
        message: "Glad it worked out! How did the meeting go?",
        time: "2.5 hours ago",
        isMe: true,
      },
      {
        id: 3,
        sender: "Alex Johnson",
        message: "Perfect! I'll send the contract details shortly",
        time: "2 hours ago",
        isMe: false,
      },
    ],
  },
  {
    id: 3,
    name: "David Rodriguez",
    lastMessage: "Thank you so much for connecting us!",
    time: "1 day ago",
    unread: 0,
    avatar: "DR",
    online: true,
    messages: [
      {
        id: 1,
        sender: "David Rodriguez",
        message: "Thank you so much for connecting us!",
        time: "1 day ago",
        isMe: false,
      },
      {
        id: 2,
        sender: "Me",
        message: "You're welcome! Glad I could help",
        time: "1 day ago",
        isMe: true,
      },
    ],
  },
];

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [selectedChat, setSelectedChat] = useState<
    (typeof mockChats)[0] | null
  >(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = mockChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedChat) {
      setNewMessage("");
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 bg-background border-l z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Chat</h2>
          <Badge
            variant="destructive"
            className="bg-red-500 text-white font-bold"
          >
            {mockChats.reduce((sum, chat) => sum + chat.unread, 0)}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* User Account Info */}
      <div className="px-4 py-2 bg-muted/30 border-b">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">ACC-1847</span> •{" "}
          <span className="font-medium">TM-01</span> (John Smith - Admin)
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List and Messages */}
      <div className="flex-1 flex">
        <div
          className={`${selectedChat ? "w-1/3" : "w-full"} border-r transition-all duration-200`}
        >
          <ScrollArea className="h-full">
            <div className="p-2 space-y-2">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedChat?.id === chat.id
                      ? "bg-muted border-primary"
                      : ""
                  } ${
                    chat.unread > 0
                      ? "border-l-4 border-l-green-500 bg-green-100/80 dark:bg-green-900/40 hover:bg-green-200/60 dark:hover:bg-green-900/60 shadow-sm"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {chat.avatar}
                        </AvatarFallback>
                      </Avatar>
                      {chat.online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {chat.unread > 0 && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                          <span
                            className={`text-sm ${
                              chat.unread > 0
                                ? "font-bold text-gray-900 dark:text-gray-100"
                                : "font-medium text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {chat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {chat.unread > 0 && (
                            <Badge
                              variant="destructive"
                              className="h-4 w-4 flex items-center justify-center text-xs p-0 bg-green-600 hover:bg-green-700"
                            >
                              {chat.unread}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {chat.time}
                          </span>
                        </div>
                      </div>
                      <p
                        className={`text-xs line-clamp-2 ${
                          chat.unread > 0
                            ? "font-semibold text-gray-800 dark:text-gray-200"
                            : "text-muted-foreground"
                        }`}
                      >
                        {chat.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Messages */}
        {selectedChat && (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="border-b p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {selectedChat.avatar}
                      </AvatarFallback>
                    </Avatar>
                    {selectedChat.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">
                      {selectedChat.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedChat.online ? "Online" : "Last seen 2 hours ago"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Phone className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Video className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {selectedChat.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-2 rounded-lg text-sm ${
                        message.isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p>{message.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.isMe
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {message.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
