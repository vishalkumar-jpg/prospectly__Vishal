import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveChatSupportHeaderProps {
  isOnline?: boolean;
  onClose: () => void;
  closeRef?: React.RefObject<HTMLButtonElement | null>;
}

export function LiveChatSupportHeader({
  isOnline = true,
  onClose,
  closeRef,
}: LiveChatSupportHeaderProps) {
  return (
    <div className="shrink-0 bg-app px-4 py-3 border-b border-border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "shrink-0 w-3 h-3 rounded-full",
              isOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50"
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">
              Live Chat Support
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {isOnline
                ? "We're online and ready to help"
                : "We're offline; leave a message"}
            </p>
          </div>
        </div>
        <Button
          ref={closeRef}
          variant="ghost"
          size="icon"
          onClick={() => onClose()}
          className="shrink-0 grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
