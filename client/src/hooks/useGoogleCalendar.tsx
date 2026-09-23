import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  description?: string;
  attendees?: Array<{
    email: string;
    name?: string;
  }>;
}

export function useGoogleCalendar() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const connectGoogleCalendar = useCallback(async () => {
    setIsConnecting(true);

    try {
      // Get OAuth URL from Express API
      const response = await apiRequest("/calendar/connect/google");

      // Extract data from the new response format { data, status }
      const responseData = response?.data ?? response;

      if (!responseData?.authUrl) {
        toast({
          title: "Setup Required",
          description:
            "Google OAuth credentials need to be configured. Please contact your administrator.",
          variant: "destructive",
        });
        return false;
      }

      // Redirect to Google OAuth
      window.location.href = responseData.authUrl;

      return true;
    } catch {
      toast({
        title: "Connection Failed",
        description:
          "Unable to start Google Calendar connection. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const createCalendarEvent = useCallback(
    async (event: Omit<GoogleCalendarEvent, "id">) => {
      try {
        const response = await apiRequest("/calendar/events", {
          method: "POST",
          body: JSON.stringify(event),
        });

        // Extract data from the new response format { data, status }
        const responseData = response?.data ?? response;

        toast({
          title: "Event Created",
          description: "Meeting has been added to your Google Calendar.",
        });

        return responseData;
      } catch {
        toast({
          title: "Event Creation Failed",
          description: "Unable to create calendar event. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast]
  );

  const getAvailability = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        const data = await apiRequest(
          `/calendar/availability?provider=google&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
        );
        return data;
      } catch {
        return null;
      }
    },
    []
  );

  const disconnectGoogleCalendar = useCallback(async () => {
    try {
      await apiRequest("/calendar/disconnect/google", {
        method: "POST",
      });

      setIsConnected(false);
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected successfully.",
      });

      return true;
    } catch {
      toast({
        title: "Disconnection Failed",
        description: "Unable to disconnect Google Calendar. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  return {
    isConnecting,
    isConnected,
    connectGoogleCalendar,
    createCalendarEvent,
    getAvailability,
    disconnectGoogleCalendar,
  };
}
