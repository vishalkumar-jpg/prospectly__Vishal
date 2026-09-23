import { Calendar } from "lucide-react";
import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarConnectionPanel } from "@/components/calendar/CalendarConnectionPanel";
import {
  useCalendarIntegration,
  type CalendarProvider,
} from "@/hooks/useCalendarIntegration";
import { cn } from "@/lib/utils";

export type CalendarConnectModalVariant = "default" | "recruiting";

export interface CalendarConnectRecruitingNote {
  emphasis: string;
  text: string;
}

/** Matches Post-a-Job “Calendar Connection Required” modal (second reference image). */
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_RECRUITING_NOTE: CalendarConnectRecruitingNote = {
  emphasis: "Required before posting",
  text: "Connect your calendar so candidates can schedule interviews. After connecting, you'll return to Post a Job to continue.",
};

export interface CalendarConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  returnTo?: string;
  variant?: CalendarConnectModalVariant;
  /** Banner copy for recruiting variant. Omit on Dashboard / Find Prospects / Account Setup. */
  recruitingNote?: CalendarConnectRecruitingNote;
  /** When true, shows disconnect on connected providers. */
  allowDisconnect?: boolean;
}

function CalendarProviderCardSkeleton() {
  return <Skeleton className="h-[104px] w-full rounded-[14px]" />;
}

export function CalendarConnectModal({
  open,
  onOpenChange,
  title = "Connect Your Calendar",
  description,
  returnTo,
  variant = "default",
  recruitingNote,
  allowDisconnect = false,
}: CalendarConnectModalProps) {
  const {
    integrations,
    connectCalendar,
    disconnectCalendar,
    connectingProvider,
    loading,
  } = useCalendarIntegration();

  const isRecruiting = variant === "recruiting";

  const handleConnect = useCallback(
    (provider: CalendarProvider) => {
      connectCalendar(provider, returnTo ? { returnTo } : undefined);
    },
    [connectCalendar, returnTo]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        mobileFullscreen
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0",
          "max-sm:max-h-full max-sm:thin-scroll",
          isRecruiting ? "sm:max-w-lg" : "sm:max-w-2xl"
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-warning" />
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="pt-1 text-left">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            {isRecruiting && recruitingNote ? (
              <div className="rounded-xl border border-brand-warning/30 bg-brand-warning/5 px-4 py-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {recruitingNote.emphasis}
                </span>{" "}
                — {recruitingNote.text}
              </div>
            ) : null}

            {loading ? (
              <div className="flex flex-col gap-2.5">
                <CalendarProviderCardSkeleton />
                <CalendarProviderCardSkeleton />
              </div>
            ) : (
              <CalendarConnectionPanel
                integrations={integrations}
                connectCalendar={handleConnect}
                connectingProvider={connectingProvider}
                disconnectCalendar={
                  allowDisconnect ? disconnectCalendar : undefined
                }
                showHeader={false}
                gridLayout={isRecruiting ? "singleColumn" : "page"}
                buttonVariant={isRecruiting ? "brand" : "default"}
                showFeatureBoxes={false}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
