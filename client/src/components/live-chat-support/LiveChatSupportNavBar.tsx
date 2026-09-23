import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface LiveChatSupportNavBarProps {
  onBack: () => void;
}

export function LiveChatSupportNavBar({ onBack }: LiveChatSupportNavBarProps) {
  return (
    <div className="shrink-0 bg-green-500 dark:bg-green-600 px-4 py-2.5 flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0 h-10 w-10 text-white hover:bg-white/20 hover:text-white"
        aria-label="Back to messages"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <span className="text-sm font-semibold text-white">Messages</span>
    </div>
  );
}
