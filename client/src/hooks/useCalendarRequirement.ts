import { useCalendarIntegrations } from "@/hooks/useCalendarIntegrations";

export function useCalendarRequirement() {
  const { integrations, loading, refetch } = useCalendarIntegrations();

  const activeIntegration = integrations.find(
    (integration) => integration.isActive === true
  );

  return {
    hasCalendar: !!activeIntegration,
    loading,
    calendarProvider: activeIntegration?.provider ?? null,
    refreshCalendarStatus: refetch,
  };
}
