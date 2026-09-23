/**
 * Dashboard API Module
 * Handles dashboard statistics and priority actions
 */

import { request } from "./core";
import { UpcomingMeeting } from "@/hooks/useUpcomingMeetings";

export const dashboardApi = {
  stats: () =>
    request<
      Array<{
        pendingIntros: { value: number; urgentCount: number };
        meetingsBooked: { value: number; weeklyChange: number };
        meetingsCompleted: { value: number; weeklyChange: number };
        peerFeedbacks: { value: number; pendingCount: number };
        totalInvested: { value: number; escrowAmount: number };
        totalEarned: { value: number; inEscrow: number };
      }>
    >("/dashboard/stats"),

  priorityActions: () =>
    request<{
      urgentIntros: { count: number; message: string };
      upcomingMeetings: {
        thisWeekCount: number;
        thisMonthCount: number;
        totalCount: number;
        nextMeetingDate: string | null;
      };
      marketplaceOpportunities: { count: number };
    }>("/dashboard/priority-actions"),

  highValueOpportunities: () =>
    request<{
      opportunities: Array<{
        id: string;
        bountyAmount: number;
        title: string;
        description: string;
      }>;
    }>("/dashboard/high-value-opportunities"),

  upcomingMeetings: () =>
    request<{ meetings: UpcomingMeeting[] }>("/dashboard/upcoming-meetings"),
};
