import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationsBannerProps {
  unreadCount: number;
}

export function NotificationsBanner({ unreadCount }: NotificationsBannerProps) {
  if (unreadCount === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-sky/20 bg-brand-sky/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-sky/10 text-brand-sky">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground">
            You have {unreadCount} unread notification
            {unreadCount !== 1 ? "s" : ""}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your notifications to stay updated with the latest activity.
          </p>
        </div>
        <Button size="sm" variant="outline" className="flex-shrink-0">
          View All
        </Button>
      </div>
    </div>
  );
}
