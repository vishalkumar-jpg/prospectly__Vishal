import { CalendarConnectionPanel } from "@/components/calendar/CalendarConnectionPanel";
import type { AnyType } from "@/types/common";
import type { CalendarProvider } from "@/components/calendar/CalendarProviderCard";

interface GettingStartedCalendarStepProps {
  integrations: AnyType[];
  connectCalendar: (provider: CalendarProvider) => void;
  connectingProvider: CalendarProvider | null;
  disconnectCalendar: (provider: CalendarProvider) => Promise<boolean>;
}

export function GettingStartedCalendarStep({
  integrations,
  connectCalendar,
  connectingProvider,
  disconnectCalendar,
}: GettingStartedCalendarStepProps) {
  return (
    <section className="animate-fade-in mb-8">
      <CalendarConnectionPanel
        title="Connect Your Calendar"
        description="Enable seamless scheduling for your warm introduction meetings"
        integrations={integrations}
        connectCalendar={connectCalendar}
        connectingProvider={connectingProvider}
        disconnectCalendar={disconnectCalendar}
        showFeatureBoxes
      />
    </section>
  );
}
