import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalendarConnectModal } from "@/hooks/useCalendarConnectModal";

interface CalendarBannerProps {
  hasCalendar: boolean;
  calendarLoading: boolean;
}

export function CalendarBanner({
  hasCalendar,
  calendarLoading,
}: CalendarBannerProps) {
  const { openModal, modal } = useCalendarConnectModal("/dashboard");

  if (calendarLoading || hasCalendar) return null;

  return (
    <>
      <div className="rounded-2xl border border-brand-warning/20 bg-brand-warning/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-warning/10 text-brand-warning">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 font-semibold text-foreground">
                Complete Your Setup: Connect Your Calendar
              </p>
              <p className="text-sm text-muted-foreground">
                You cannot send introduction requests until you connect your
                calendar. This enables prospects to easily book meetings with
                you.
              </p>
            </div>
          </div>
          <Button
            onClick={() => openModal()}
            size="sm"
            className="w-full flex-shrink-0 md:ml-6 md:w-auto"
          >
            Connect Now
          </Button>
        </div>
      </div>
      {modal}
    </>
  );
}
