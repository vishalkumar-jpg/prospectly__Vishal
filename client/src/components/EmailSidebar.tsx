import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Send,
  Search,
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  Paperclip,
  X,
} from "lucide-react";

// Mock email data
const mockEmails = [
  {
    id: 1,
    from: "Sarah Mitchell",
    email: "sarah@networker.com",
    subject: "Introduction Request - TechCorp Partnership",
    preview:
      "Hi Pranav, I have a potential introduction request for David Rodriguez at TechCorp...",
    time: "2 min ago",
    unread: true,
    starred: false,
    avatar: "SM",
  },
  {
    id: 2,
    from: "Alex Johnson",
    email: "alex@connections.com",
    subject: "Re: Referral Payout Payment Received",
    preview:
      "Thank you for the successful introduction to Maria Chen. The meeting went great...",
    time: "1 hour ago",
    unread: true,
    starred: true,
    avatar: "AJ",
  },
  {
    id: 3,
    from: "David Rodriguez",
    email: "david@techcorp.com",
    subject: "Thank you for the introduction!",
    preview:
      "The meeting with Sarah was exactly what we needed. Looking forward to discussing...",
    time: "3 hours ago",
    unread: false,
    starred: false,
    avatar: "DR",
  },
  {
    id: 4,
    from: "Maria Chen",
    email: "maria@salesforce.com",
    subject: "Follow-up on our conversation",
    preview:
      "Hi Pranav, following up on our introduction call last week. I'd like to schedule...",
    time: "1 day ago",
    unread: false,
    starred: true,
    avatar: "MC",
  },
  {
    id: 5,
    from: "Prospectly Team",
    email: "team@prospectly.com",
    subject: "Your monthly earning report is ready",
    preview:
      "You've earned $2,847 this month through successful introductions. View your detailed...",
    time: "2 days ago",
    unread: false,
    starred: false,
    avatar: "PT",
  },
];

interface EmailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailSidebar({ isOpen, onClose }: EmailSidebarProps) {
  const [selectedEmail, setSelectedEmail] = useState<
    (typeof mockEmails)[0] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmails = mockEmails.filter(
    (email) =>
      email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 bg-background border-l z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Email</h2>
          <Badge
            variant="destructive"
            className="bg-red-500 text-white font-bold"
          >
            {mockEmails.filter((e) => e.unread).length}
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
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 flex">
        <div
          className={`${selectedEmail ? "w-1/2" : "w-full"} border-r transition-all duration-200`}
        >
          <ScrollArea className="h-full">
            <div className="p-2 space-y-2">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedEmail?.id === email.id
                      ? "bg-muted border-primary"
                      : ""
                  } ${
                    email.unread
                      ? "border-l-4 border-l-blue-500 bg-blue-100/80 dark:bg-blue-900/40 hover:bg-blue-200/60 dark:hover:bg-blue-900/60 shadow-sm"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedEmail(email)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {email.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {email.unread && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <span
                            className={`text-sm ${
                              email.unread
                                ? "font-bold text-gray-900 dark:text-gray-100"
                                : "font-medium text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {email.from}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {email.starred && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {email.time}
                          </span>
                        </div>
                      </div>
                      <p
                        className={`text-sm mb-1 truncate ${
                          email.unread
                            ? "font-bold text-gray-800 dark:text-gray-200"
                            : "font-normal text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {email.subject}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {email.preview}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Email Content */}
        {selectedEmail && (
          <div className="w-1/2 flex flex-col">
            {/* Email Header */}
            <div className="border-b p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm truncate">
                  {selectedEmail.subject}
                </h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Reply className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Forward className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Star className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Archive className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {selectedEmail.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {selectedEmail.from}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedEmail.email}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedEmail.time}
                </span>
              </div>
            </div>

            {/* Email Content */}
            <ScrollArea className="flex-1 p-3">
              <div className="text-sm space-y-3">
                <p>Hi Pranav,</p>
                <p>{selectedEmail.preview}</p>
                <p>
                  I believe this could be a great opportunity for both parties.
                  The potential commission for this introduction would be
                  $2,500.
                </p>
                <p>
                  Let me know if you're interested and available to make this
                  connection.
                </p>
                <p>
                  Best regards,
                  <br />
                  {selectedEmail.from}
                </p>
              </div>
            </ScrollArea>

            {/* Reply Box */}
            <div className="border-t p-3">
              <Textarea
                placeholder="Write your reply..."
                className="mb-2 text-sm"
                rows={3}
              />
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Paperclip className="h-3 w-3" />
                </Button>
                <Button size="sm">
                  <Send className="h-3 w-3 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
