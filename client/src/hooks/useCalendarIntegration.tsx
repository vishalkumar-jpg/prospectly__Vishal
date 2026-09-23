import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { POST_A_JOB_PATH } from "@/constants/recruitment-routes";
import {
  clearCalendarConnectReopenModal,
  clearCalendarConnectReturn,
  setCalendarConnectReopenModal,
  setCalendarConnectReturn,
} from "@/utils/calendar-connect-return";
import { useCalendarIntegrations } from "@/hooks/useCalendarIntegrations";
import type { AnyType } from "@/types/common";

// Re-exported for backward compatibility with existing consumers.
export type {
  CalendarProvider,
  CalendarIntegration,
} from "@/hooks/useCalendarIntegrations";
import type { CalendarProvider } from "@/hooks/useCalendarIntegrations";

export type CalendarConnectOptions = {
  returnTo?: string;
};

export function useCalendarIntegration() {
  const [connectingProvider, setConnectingProvider] =
    useState<CalendarProvider | null>(null);
  const { toast } = useToast();
  const {
    integrations: allIntegrations,
    loading,
    refetch: fetchIntegrations,
    invalidate: invalidateIntegrations,
  } = useCalendarIntegrations();

  // Preserve the previous behavior of exposing only active integrations.
  const integrations = allIntegrations.filter((i) => i.isActive === true);

  const connectCalendar = useCallback(
    async (provider: CalendarProvider, options?: CalendarConnectOptions) => {
      setConnectingProvider(provider);

      try {
        clearCalendarConnectReturn();
        clearCalendarConnectReopenModal();
        if (options?.returnTo) {
          setCalendarConnectReturn(options.returnTo);
          if (options.returnTo === POST_A_JOB_PATH) {
            setCalendarConnectReopenModal();
          }
        }

        // Get OAuth URL from Express API
        const response = await apiRequest(`/calendar/connect/${provider}`);

        // Extract data from the new response format { data, status }
        const responseData = response?.data ?? response;

        if (!responseData?.authUrl) {
          toast({
            title: "Setup Required",
            description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth credentials need to be configured. Please contact your administrator.`,
            variant: "destructive",
          });
          return false;
        }

        // Redirect to provider OAuth
        window.location.href = responseData.authUrl;

        return true;
      } catch {
        toast({
          title: "Connection Failed",
          description: `Unable to start ${provider} connection. Please try again.`,
          variant: "destructive",
        });
        return false;
      } finally {
        setConnectingProvider(null);
      }
    },
    [toast]
  );

  const disconnectCalendar = useCallback(
    async (provider: CalendarProvider) => {
      try {
        // Find the integration for this provider
        const integration = integrations.find(
          (i) => i.provider === provider && i.isActive
        );

        if (!integration) {
          toast({
            title: "Not Connected",
            description: `No active ${provider} calendar connection found.`,
            variant: "destructive",
          });
          return false;
        }

        // Call the correct endpoint with integration ID
        await apiRequest(`/calendar/integrations/${integration.id}`, {
          method: "DELETE",
        });

        toast({
          title: "Disconnected",
          description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} calendar has been disconnected successfully.`,
        });

        await invalidateIntegrations();
        return true;
      } catch {
        toast({
          title: "Disconnection Failed",
          description: `Unable to disconnect ${provider}. Please try again.`,
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, invalidateIntegrations, integrations]
  );

  interface MeetingData {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    attendees?: string[];
    location?: string;
    [key: string]: unknown;
  }

  const createMeeting = useCallback(
    async (provider: CalendarProvider, meetingData: MeetingData) => {
      try {
        let payload: AnyType = {};

        if (provider === "google") {
          payload = {
            summary: meetingData.title,
            description: meetingData.description,
            location: meetingData.location,
            start: {
              dateTime: meetingData.startTime,
            },
            end: {
              dateTime: meetingData.endTime,
            },
            attendees: meetingData.attendees?.map((email) => ({ email })),
          };
        } else if (provider === "microsoft") {
          payload = {
            subject: meetingData.title,
            body: {
              contentType: "HTML",
              content: meetingData.description,
            },
            location: {
              displayName: meetingData.location,
            },
            start: {
              dateTime: meetingData.startTime,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
              dateTime: meetingData.endTime,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            attendees: meetingData.attendees?.map((email) => ({
              emailAddress: {
                address: email,
              },
              type: "required",
            })),
          };
        } else {
          payload = meetingData;
        }

        const response = await apiRequest("/calendar/events", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        // Extract data from the new response format { data, status }
        const responseData = response?.data ?? response;

        toast({
          title: "Meeting Created",
          description: "Meeting has been added to your calendar.",
        });

        return responseData;
      } catch {
        toast({
          title: "Meeting Creation Failed",
          description: "Unable to create calendar meeting. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast]
  );

  return {
    connectingProvider,
    isConnecting: connectingProvider !== null,
    loading,
    integrations,
    connectCalendar,
    disconnectCalendar,
    createMeeting,
    refreshIntegrations: fetchIntegrations,
  };
}
