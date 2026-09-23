import { ApiPropertyWritable } from "modules/swagger/swagger.writable.decorator";
import { Expose, Type } from "class-transformer";

export class PendingIntrosDto {
  @Expose()
  @ApiPropertyWritable({ description: "Total pending introductions count" })
  value: number;

  @Expose()
  @ApiPropertyWritable({
    description: "Number of urgent pending introductions",
  })
  urgentCount: number;
}

export class MeetingsBookedDto {
  @Expose()
  @ApiPropertyWritable({ description: "Total meetings booked count" })
  value: number;

  @Expose()
  @ApiPropertyWritable({ description: "Weekly change in meetings booked" })
  weeklyChange: number;
}

export class MeetingsCompletedDto {
  @Expose()
  @ApiPropertyWritable({ description: "Total meetings completed count" })
  value: number;

  @Expose()
  @ApiPropertyWritable({ description: "Weekly change in meetings completed" })
  weeklyChange: number;
}

export class PeerFeedbacksDto {
  @Expose()
  @ApiPropertyWritable({ description: "Total completed peer feedbacks count" })
  value: number;

  @Expose()
  @ApiPropertyWritable({ description: "Pending peer feedbacks count" })
  pendingCount: number;
}

export class TotalInvestedDto {
  @Expose()
  @ApiPropertyWritable({ description: "Total amount invested" })
  value: number;

  @Expose()
  @ApiPropertyWritable({ description: "Amount currently in escrow" })
  escrowAmount: number;
}

export class TotalEarnedDto {
  @Expose()
  @ApiPropertyWritable({
    description: "Total amount already earned (payout released)",
  })
  value: number;

  @Expose()
  @ApiPropertyWritable({ description: "Amount in escrow (pending payout)" })
  inEscrow: number;
}

export class StatsItemDto {
  @Expose()
  @ApiPropertyWritable({
    type: PendingIntrosDto,
    description: "Pending introductions statistics",
  })
  @Type(() => PendingIntrosDto)
  pendingIntros: PendingIntrosDto;

  @Expose()
  @ApiPropertyWritable({
    type: MeetingsBookedDto,
    description: "Meetings booked statistics",
  })
  @Type(() => MeetingsBookedDto)
  meetingsBooked: MeetingsBookedDto;

  @Expose()
  @ApiPropertyWritable({
    type: TotalInvestedDto,
    description: "Total invested statistics",
  })
  @Type(() => TotalInvestedDto)
  totalInvested: TotalInvestedDto;

  @Expose()
  @ApiPropertyWritable({
    type: TotalEarnedDto,
    description: "Total earned statistics",
  })
  @Type(() => TotalEarnedDto)
  totalEarned: TotalEarnedDto;

  @Expose()
  @ApiPropertyWritable({
    type: MeetingsCompletedDto,
    description: "Meetings completed statistics",
  })
  @Type(() => MeetingsCompletedDto)
  meetingsCompleted: MeetingsCompletedDto;

  @Expose()
  @ApiPropertyWritable({
    type: PeerFeedbacksDto,
    description: "Peer feedbacks statistics",
  })
  @Type(() => PeerFeedbacksDto)
  peerFeedbacks: PeerFeedbacksDto;
}

export type StatsResponse = StatsItemDto[];

export class UrgentIntrosDto {
  @Expose()
  @ApiPropertyWritable({
    description: "Number of urgent introductions requiring response",
  })
  count: number;

  @Expose()
  @ApiPropertyWritable({ description: "Message describing the urgency" })
  message: string;
}

export class UpcomingMeetingsDto {
  @Expose()
  @ApiPropertyWritable({ description: "Number of upcoming meetings this week" })
  thisWeekCount: number;

  @Expose()
  @ApiPropertyWritable({
    description: "Number of upcoming meetings this month",
  })
  thisMonthCount: number;

  @Expose()
  @ApiPropertyWritable({
    description: "Total number of upcoming meetings (all time)",
  })
  totalCount: number;

  @Expose()
  @ApiPropertyWritable({
    description:
      "ISO date string of the next meeting, or null if no upcoming meetings",
  })
  nextMeetingDate: string | null;
}

export class MarketplaceOpportunitiesDto {
  @Expose()
  @ApiPropertyWritable({
    description: "Number of new marketplace opportunities",
  })
  count: number;
}

export class PriorityActionResponse {
  @Expose()
  @ApiPropertyWritable({
    type: UrgentIntrosDto,
    description: "Urgent introductions requiring attention",
  })
  @Type(() => UrgentIntrosDto)
  urgentIntros: UrgentIntrosDto;

  @Expose()
  @ApiPropertyWritable({
    type: UpcomingMeetingsDto,
    description: "Upcoming meetings information",
  })
  @Type(() => UpcomingMeetingsDto)
  upcomingMeetings: UpcomingMeetingsDto;

  @Expose()
  @ApiPropertyWritable({
    type: MarketplaceOpportunitiesDto,
    description: "Marketplace opportunities count",
  })
  @Type(() => MarketplaceOpportunitiesDto)
  marketplaceOpportunities: MarketplaceOpportunitiesDto;
}

export class HighValueOpportunityDto {
  @Expose()
  @ApiPropertyWritable({ description: "Opportunity unique identifier" })
  id: string;

  @Expose()
  @ApiPropertyWritable({ description: "Bounty amount for this opportunity" })
  bountyAmount: number;

  @Expose()
  @ApiPropertyWritable({ description: "Opportunity title" })
  title: string;

  @Expose()
  @ApiPropertyWritable({ description: "Opportunity description" })
  description: string;

  @Expose()
  @ApiPropertyWritable({
    description: "Whether the opportunity is marked as urgent",
    required: false,
  })
  isUrgent?: boolean;
}

export class HighValueOpportunityResponse {
  @Expose()
  @ApiPropertyWritable({
    type: [HighValueOpportunityDto],
    description: "List of high-value opportunities",
  })
  @Type(() => HighValueOpportunityDto)
  opportunities: HighValueOpportunityDto[];
}

export class UpcomingMeetingDto {
  @Expose()
  @ApiPropertyWritable({ description: "Meeting unique identifier" })
  id: string;

  @Expose()
  @ApiPropertyWritable({ description: "Meeting title" })
  title: string | null;

  @Expose()
  @ApiPropertyWritable({ description: "Meeting description" })
  description: string;

  @Expose()
  @ApiPropertyWritable({
    description: "Meeting date and time (ISO string)",
  })
  meetingDate: string;

  @Expose()
  @ApiPropertyWritable({ description: "Meeting link/URL" })
  meetingLink: string | null;

  @Expose()
  @ApiPropertyWritable({ description: "Requester name" })
  requesterName: string | null;

  @Expose()
  @ApiPropertyWritable({ description: "Requester profile photo URL" })
  requesterPhotoUrl: string | null;

  @Expose()
  @ApiPropertyWritable({ description: "Bounty amount" })
  bountyAmount: number;

  @Expose()
  @ApiPropertyWritable({ description: "Prospect name (contact name)" })
  prospectName: string | null;

  @Expose()
  @ApiPropertyWritable({ description: "Prospect profile photo URL" })
  prospectPhotoUrl: string | null;

  @Expose()
  @ApiPropertyWritable({
    description: "Whether the current user is the requester",
  })
  isRequester: boolean;
}

export class UpcomingMeetingsResponse {
  @Expose()
  @ApiPropertyWritable({
    type: [UpcomingMeetingDto],
    description: "List of upcoming meetings",
  })
  @Type(() => UpcomingMeetingDto)
  meetings: UpcomingMeetingDto[];
}
