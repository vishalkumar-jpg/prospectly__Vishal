import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { sql } from "drizzle-orm";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import { FeedbackType } from "modules/introductions/feedback/feedback.constants";
import { MEETING_STATUS } from "modules/cron/meetings/meetings.constants";
import { AnyType } from "types/common";
import { GlobalMarketplaceService } from "modules/global-marketplace/global-marketplace.service";
import { ProfilesService } from "modules/profiles/profiles.service";
import { PAYMENT_STATUS } from "config/payment.config";
import { toUTC } from "utils/dayjs";
import {
  StatsResponse,
  StatsItemDto,
  PriorityActionResponse,
  HighValueOpportunityResponse,
  PendingIntrosDto,
  MeetingsBookedDto,
  MeetingsCompletedDto,
  PeerFeedbacksDto,
  TotalInvestedDto,
  TotalEarnedDto,
  UpcomingMeetingsResponse,
  UpcomingMeetingDto,
} from "./dashboard.response";

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly globalMarketplaceService: GlobalMarketplaceService,
    private readonly profilesService: ProfilesService
  ) {}
  /**
   * Get pending introductions count for a connector
   * Counts introduction requests where user is a potential connector that are not expired
   * Includes requests with status 'pending' or 'accepted'
   */
  async getPendingIntrosCount(userId: string): Promise<PendingIntrosDto> {
    if (!userId || typeof userId !== "string") {
      throw new BadRequestException("Invalid userId parameter");
    }
    const result = await this.db.execute(
      sql<{
        total_count: number;
        urgent_count: number;
      }>`
      WITH pending_requests AS (
        -- Base query for all pending requests
        SELECT ir.id, ir.is_urgent
        FROM introduction_requests ir
        INNER JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
        WHERE ipc.potential_connector_id = ${userId}
        AND (ir.status = ${IntroductionStatus.PENDING} OR ir.status = ${IntroductionStatus.ACCEPTED})
        AND ir.connector_archived = false
        AND (ir.expired_at IS NULL OR ir.expired_at > NOW())
        AND ipc.status != ${IntroductionStatus.DECLINED}
        AND NOT EXISTS (
          SELECT 1 FROM introduction_fulfillment_attempts ifa 
          WHERE ifa.introduction_request_id = ir.id 
          AND ifa.connector_id = ${userId}
        )
      )
      SELECT
        (SELECT COUNT(id) FROM pending_requests) as total_count,
        (SELECT COUNT(id) FROM pending_requests
         WHERE is_urgent = true) as urgent_count
      `
    );

    const stats = Array.isArray(result)
      ? result[0]
      : (result as AnyType).rows[0];

    return {
      value: Number(stats?.total_count ?? 0),
      urgentCount: Number(stats?.urgent_count ?? 0),
    };
  }

  /**
   * Get meetings booked count and weekly change
   * Counts meetings where user is either requester OR connector
   * Uses introduction_potential_connectors table to identify connectors
   */
  async getMeetingsBookedCount(userId: string): Promise<MeetingsBookedDto> {
    const result = await this.db.execute(
      sql<{
        total_count: number;
        this_week_count: number;
        last_week_count: number;
      }>`
      SELECT
        (SELECT COUNT(DISTINCT sm.id) 
         FROM scheduled_meetings sm
         LEFT JOIN introduction_requests ir ON sm.introduction_request_id = ir.id
         LEFT JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
         WHERE (sm.requester_id = ${userId} 
          OR (ipc.potential_connector_id = ${userId} AND ipc.status = ${IntroductionStatus.ACCEPTED}))
          AND ir.status = ${IntroductionStatus.MEETING_BOOKED}
          AND NOT EXISTS (
            SELECT 1 FROM introduction_fulfillment_attempts ifa 
            WHERE ifa.introduction_request_id = ir.id 
          )) as total_count,
        (SELECT COUNT(DISTINCT sm.id) 
         FROM scheduled_meetings sm
         LEFT JOIN introduction_requests ir ON sm.introduction_request_id = ir.id
         LEFT JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
         WHERE (sm.requester_id = ${userId} OR (ipc.potential_connector_id = ${userId} AND ipc.status = ${IntroductionStatus.ACCEPTED}))
         AND ir.status = ${IntroductionStatus.MEETING_BOOKED}
         AND sm.created_at >= DATE_TRUNC('week', NOW() + INTERVAL '1 day') - INTERVAL '1 day'
         AND NOT EXISTS (
            SELECT 1 FROM introduction_fulfillment_attempts ifa 
            WHERE ifa.introduction_request_id = ir.id 
          )) as this_week_count,
        (SELECT COUNT(DISTINCT sm.id) 
         FROM scheduled_meetings sm
         LEFT JOIN introduction_requests ir ON sm.introduction_request_id = ir.id
         LEFT JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
         WHERE (sm.requester_id = ${userId} OR (ipc.potential_connector_id = ${userId} AND ipc.status = ${IntroductionStatus.ACCEPTED}))
         AND ir.status = ${IntroductionStatus.MEETING_BOOKED}
         AND sm.created_at >= DATE_TRUNC('week', NOW() + INTERVAL '1 day') - INTERVAL '8 days'
         AND sm.created_at < DATE_TRUNC('week', NOW() + INTERVAL '1 day') - INTERVAL '1 day'
         AND NOT EXISTS (
            SELECT 1 FROM introduction_fulfillment_attempts ifa 
            WHERE ifa.introduction_request_id = ir.id 
          )) as last_week_count
      `
    );

    const stats = Array.isArray(result)
      ? result[0]
      : (result as AnyType).rows[0];

    const totalCount = Number(stats?.total_count ?? 0);
    const thisWeekCount = Number(stats?.this_week_count ?? 0);
    const lastWeekCount = Number(stats?.last_week_count ?? 0);
    const weeklyChange = thisWeekCount - lastWeekCount;

    return {
      value: totalCount,
      weeklyChange,
    };
  }

  /**
   * Get meetings completed count and weekly change
   * Counts completed meetings where user is either requester OR connector
   * Uses introduction_potential_connectors table to identify connectors
   */
  async getMeetingsCompletedCount(
    userId: string
  ): Promise<MeetingsCompletedDto> {
    const result = await this.db.execute(
      sql<{
        total_count: number;
        this_week_count: number;
        last_week_count: number;
      }>`
      SELECT
        (SELECT COUNT(DISTINCT sm.id) 
         FROM scheduled_meetings sm
         LEFT JOIN introduction_requests ir ON sm.introduction_request_id = ir.id
         LEFT JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
         WHERE sm.status = ${MEETING_STATUS.COMPLETED}
         AND (sm.requester_id = ${userId} 
         OR (ipc.potential_connector_id = ${userId} AND ipc.status = ${IntroductionStatus.ACCEPTED}))) as total_count,
        (SELECT COUNT(DISTINCT sm.id) 
         FROM scheduled_meetings sm
         LEFT JOIN introduction_requests ir ON sm.introduction_request_id = ir.id
         LEFT JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
         WHERE sm.status = ${MEETING_STATUS.COMPLETED}
         AND (sm.requester_id = ${userId} OR (ipc.potential_connector_id = ${userId} AND ipc.status = ${IntroductionStatus.ACCEPTED}))
         AND sm.created_at >= DATE_TRUNC('week', NOW() + INTERVAL '1 day') - INTERVAL '1 day') as this_week_count,
        (SELECT COUNT(DISTINCT sm.id) 
         FROM scheduled_meetings sm
         LEFT JOIN introduction_requests ir ON sm.introduction_request_id = ir.id
         LEFT JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
         WHERE sm.status = ${MEETING_STATUS.COMPLETED}
         AND (sm.requester_id = ${userId} OR (ipc.potential_connector_id = ${userId} AND ipc.status = ${IntroductionStatus.ACCEPTED}))
         AND sm.created_at >= DATE_TRUNC('week', NOW() + INTERVAL '1 day') - INTERVAL '8 days'
         AND sm.created_at < DATE_TRUNC('week', NOW() + INTERVAL '1 day') - INTERVAL '1 day') as last_week_count
      `
    );

    const stats = Array.isArray(result)
      ? result[0]
      : (result as AnyType).rows[0];

    const totalCount = Number(stats?.total_count ?? 0);
    const thisWeekCount = Number(stats?.this_week_count ?? 0);
    const lastWeekCount = Number(stats?.last_week_count ?? 0);
    const weeklyChange = thisWeekCount - lastWeekCount;

    return {
      value: totalCount,
      weeklyChange,
    };
  }

  /**
   * Get peer feedbacks count (completed and pending)
   * Counts peer feedbacks where user is either requester OR connector
   * Uses introduction_potential_connectors table to identify connectors
   */
  async getPeerFeedbacksCount(userId: string): Promise<PeerFeedbacksDto> {
    // Get completed peer feedbacks count
    // Count distinct introductions where peer feedback exists and user is requester or connector
    const completedResult = await this.db.execute(
      sql<{
        completed_count: number;
      }>`
      SELECT COUNT(DISTINCT ir.id) as completed_count
      FROM introduction_feedback if
      INNER JOIN introduction_requests ir ON if.introduction_id = ir.id
      LEFT JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
      WHERE if.feedback_type = ${FeedbackType.PEER_FEEDBACK}
      AND (ir.requester_id = ${userId} 
      OR (ipc.potential_connector_id = ${userId} AND ipc.status = ${IntroductionStatus.ACCEPTED}))
      `
    );

    // Get pending peer feedbacks count
    const pendingResult = await this.db.execute(
      sql<{
        pending_count: number;
      }>`
      SELECT COUNT(DISTINCT ir.id) as pending_count
      FROM introduction_requests ir
      LEFT JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
      WHERE (ir.status = ${IntroductionStatus.PEER_FEEDBACK} 
      OR ir.status = ${IntroductionStatus.MEETING_COMPLETED})
      AND (
        (ir.requester_id = ${userId} AND ir.requester_feedback_completed = false)
        OR (ipc.potential_connector_id = ${userId} 
        AND ipc.status = ${IntroductionStatus.ACCEPTED} 
        AND ir.connector_feedback_completed = false)
      )
      `
    );

    const completedStats = Array.isArray(completedResult)
      ? completedResult[0]
      : (completedResult as AnyType).rows[0];

    const pendingStats = Array.isArray(pendingResult)
      ? pendingResult[0]
      : (pendingResult as AnyType).rows[0];

    return {
      value: Number(completedStats?.completed_count ?? 0),
      pendingCount: Number(pendingStats?.pending_count ?? 0),
    };
  }

  /**
   * Get total invested amount and escrow amount
   */
  async getTotalInvestedAmount(userId: string): Promise<TotalInvestedDto> {
    const result = await this.db.execute(
      sql<{
        total_invested: number;
        escrow_amount: number;
      }>`
      SELECT
        COALESCE(SUM(
          CASE 
            WHEN ps.charge_amount IS NOT NULL 
            AND ps.status != ${PAYMENT_STATUS.REFUNDED}
            THEN COALESCE(ps.charge_amount, 0)::numeric
            ELSE 0
          END
        ), 0) as total_invested,
        COALESCE(SUM(
          CASE 
            WHEN ps.charge_amount IS NULL 
            AND ps.status = ${PAYMENT_STATUS.AUTHORIZED}
            THEN COALESCE(ps.amount, 0)::numeric
            ELSE 0
          END
        ), 0) as escrow_amount
      FROM introduction_transactions it
      INNER JOIN introduction_requests ir ON it.introduction_request_id = ir.id
      INNER JOIN payment_stages ps ON ps.transaction_id = it.id
      WHERE ir.requester_id = ${userId}
        AND it.is_active = true
    `
    );

    const stats = Array.isArray(result)
      ? result[0]
      : (result as AnyType).rows[0];

    return {
      value: Number(stats?.total_invested ?? 0),
      escrowAmount: Number(stats?.escrow_amount ?? 0),
    };
  }

  /**
   * Get total earned amount (already earned) and amount in escrow (pending payout)
   */
  async getTotalEarnedAmount(userId: string): Promise<TotalEarnedDto> {
    const result = await this.db.execute(
      sql<{
        total_earned: number;
        in_escrow: number;
      }>`
      SELECT
        (SELECT COALESCE(SUM(net_amount), 0) 
         FROM payout_history 
         WHERE connector_id = ${userId}
         AND payout_released = true) as total_earned,
        (SELECT COALESCE(SUM(net_amount), 0) 
         FROM payout_history 
         WHERE connector_id = ${userId}
         AND payout_released = false) as in_escrow
      `
    );

    const stats = Array.isArray(result)
      ? result[0]
      : (result as AnyType).rows[0];

    return {
      value: Number(stats?.total_earned ?? 0),
      inEscrow: Number(stats?.in_escrow ?? 0),
    };
  }

  /**
   * Get dashboard statistics including pending intros, meetings booked, and total invested
   * @param userId - The user ID
   * @returns Dashboard statistics with trend data as an array
   */
  async getStats(userId: string): Promise<StatsResponse> {
    const [
      pendingIntros,
      meetingsBooked,
      meetingsCompleted,
      peerFeedbacks,
      totalInvested,
      totalEarned,
    ] = await Promise.all([
      this.getPendingIntrosCount(userId),
      this.getMeetingsBookedCount(userId),
      this.getMeetingsCompletedCount(userId),
      this.getPeerFeedbacksCount(userId),
      this.getTotalInvestedAmount(userId),
      this.getTotalEarnedAmount(userId),
    ]);

    const statsItem: StatsItemDto = {
      pendingIntros,
      meetingsBooked,
      meetingsCompleted,
      peerFeedbacks,
      totalInvested,
      totalEarned,
    };

    return [statsItem];
  }

  /**
   * Get urgent intros count - intros pending approval/decline or where intro not sent to prospect
   * Counts requests where user is a potential connector that need their response
   * @param userId - The user ID
   * @returns Urgent intros count and message
   */
  async getUrgentIntrosCount(userId: string): Promise<{
    count: number;
    message: string;
  }> {
    const result = await this.db.execute(
      sql<{
        count: number;
      }>`
      SELECT COUNT(DISTINCT ir.id) as count
      FROM introduction_requests ir
      INNER JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
      WHERE ipc.potential_connector_id = ${userId}
      AND ir.connector_archived = false
      AND (ir.expired_at IS NULL OR ir.expired_at > NOW())
      AND (
        ipc.status = ${IntroductionStatus.PENDING}
        OR (ipc.status = ${IntroductionStatus.ACCEPTED} AND ir.status = ${IntroductionStatus.ACCEPTED})
      )
      AND NOT EXISTS (
        SELECT 1 FROM introduction_fulfillment_attempts ifa 
        WHERE ifa.introduction_request_id = ir.id 
        AND ifa.connector_id = ${userId}
      )
      `
    );

    const stats = Array.isArray(result)
      ? result[0]
      : (result as AnyType).rows[0];

    return {
      count: Number(stats?.count ?? 0),
      message: "need your response",
    };
  }

  /**
   * Get upcoming meetings count and next meeting details
   * Counts meetings where user is requester OR connector that are in the future and not completed
   * @param userId - The user ID
   * @returns Upcoming meetings count and next meeting details
   */
  async getUpcomingMeetingsCount(userId: string): Promise<{
    thisWeekCount: number;
    thisMonthCount: number;
    totalCount: number;
    nextMeetingDate: string | null;
  }> {
    const result = await this.db.execute(
      sql<{
        this_week_count: number;
        this_month_count: number;
        total_count: number;
        next_meeting_date: Date | null;
      }>`
      WITH upcoming_meetings AS (
        SELECT DISTINCT sm.id, sm.meeting_date
        FROM scheduled_meetings sm
        LEFT JOIN introduction_requests ir ON sm.introduction_request_id = ir.id
        LEFT JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id
        WHERE (sm.requester_id = ${userId} 
        OR (ipc.potential_connector_id = ${userId} AND ipc.status = ${IntroductionStatus.ACCEPTED}))
        AND sm.meeting_date > NOW()
        AND sm.status != ${MEETING_STATUS.COMPLETED}
        AND NOT EXISTS (
          SELECT 1 FROM introduction_fulfillment_attempts ifa 
          WHERE ifa.introduction_request_id = ir.id 
        )
      )
      SELECT
        COUNT(*) FILTER (WHERE meeting_date >= DATE_TRUNC('week', NOW() + INTERVAL '1 day') - INTERVAL '1 day' AND meeting_date < DATE_TRUNC('week', NOW() + INTERVAL '1 day') - INTERVAL '1 day' + INTERVAL '1 week') as this_week_count,
        COUNT(*) FILTER (WHERE meeting_date >= DATE_TRUNC('month', NOW()) AND meeting_date < DATE_TRUNC('month', NOW()) + INTERVAL '1 month') as this_month_count,
        COUNT(*) as total_count,
        MIN(meeting_date) as next_meeting_date
      FROM upcoming_meetings
      `
    );

    const stats = Array.isArray(result)
      ? result[0]
      : (result as AnyType).rows[0];

    const thisWeekCount = Number(stats?.this_week_count ?? 0);
    const thisMonthCount = Number(stats?.this_month_count ?? 0);
    const totalCount = Number(stats?.total_count ?? 0);
    const nextMeetingDate = stats?.next_meeting_date
      ? toUTC(stats.next_meeting_date).toISOString()
      : null;

    return {
      thisWeekCount,
      thisMonthCount,
      totalCount,
      nextMeetingDate,
    };
  }

  /**
   * Get priority actions including urgent intros, upcoming meetings, and marketplace opportunities
   * @param userId - The user ID
   * @returns Priority actions data
   */
  async getPriorityActions(userId: string): Promise<PriorityActionResponse> {
    const [urgentIntros, upcomingMeetings, marketplaceCount] =
      await Promise.all([
        this.getUrgentIntrosCount(userId),
        this.getUpcomingMeetingsCount(userId),
        this.globalMarketplaceService.getMatchedOpportunitiesCount(userId),
      ]);

    return {
      urgentIntros,
      upcomingMeetings,
      marketplaceOpportunities: {
        count: marketplaceCount,
      },
    };
  }

  /**
   * Get high-value opportunities from the marketplace
   * @param userId - The user ID
   * @returns List of high-value opportunities
   */
  async getHighValueOpportunities(
    userId: string
  ): Promise<HighValueOpportunityResponse> {
    const opportunities =
      await this.globalMarketplaceService.getHighValueOpportunities(userId);

    return {
      opportunities: opportunities.map((opp) => ({
        id: opp.id,
        bountyAmount: opp.bountyAmount,
        title: opp.title,
        description: opp.description,
        isUrgent: opp.isUrgent,
      })),
    };
  }

  /**
   * Get list of upcoming meetings with details
   * Returns meetings where user is requester OR accepted connector
   * @param userId - The user ID
   * @returns List of upcoming meetings with participant details
   */
  async getUpcomingMeetings(userId: string): Promise<UpcomingMeetingsResponse> {
    // Validate userId
    if (!userId || typeof userId !== "string") {
      throw new BadRequestException("Invalid userId parameter");
    }

    const result = await this.db.execute(
      sql<{
        id: string;
        meeting_title: string | null;
        meeting_description: string | null;
        meeting_date: Date;
        meeting_link: string | null;
        requester_first_name: string | null;
        requester_last_name: string | null;
        requester_photo_url: string | null;
        bounty_amount: number;
        prospect_name: string | null;
        prospect_photo_url: string | null;
        is_requester: boolean;
      }>`
      WITH distinct_meetings AS (
        SELECT DISTINCT ON (sm.id)
          sm.id,
          ir.meeting_title,
          ir.meeting_description,
          sm.meeting_date,
          sm.meeting_link,
          requester.first_name as requester_first_name,
          requester.last_name as requester_last_name,
          requester.profile_photo_url as requester_photo_url,
          ir.bounty_amount,
          ir.contact_name as prospect_name,
          prospect.profile_photo_url as prospect_photo_url,
          (sm.requester_id = ${userId}) as is_requester
        FROM scheduled_meetings sm
        LEFT JOIN introduction_requests ir ON sm.introduction_request_id = ir.id
        LEFT JOIN introduction_potential_connectors ipc ON ir.id = ipc.request_id 
          AND ipc.status = ${IntroductionStatus.ACCEPTED}
        LEFT JOIN users requester ON sm.requester_id = requester.id
        LEFT JOIN contacts prospect ON ir.contact_id = prospect.id
        WHERE (sm.requester_id = ${userId} 
          OR ipc.potential_connector_id = ${userId})
        AND sm.meeting_date > NOW()
        AND sm.status != ${MEETING_STATUS.COMPLETED}
        AND NOT EXISTS (
          SELECT 1 FROM introduction_fulfillment_attempts ifa 
          WHERE ifa.introduction_request_id = ir.id 
        )
        ORDER BY sm.id, sm.meeting_date ASC
      )
      SELECT *
      FROM distinct_meetings
      ORDER BY meeting_date ASC, id
      `
    );

    const rows = Array.isArray(result) ? result : (result as AnyType).rows;

    const toFullPhotoUrl = async (
      profilePhotoUrl: string | null
    ): Promise<string | null> => {
      if (!profilePhotoUrl) return null;
      const holder = { profilePhotoUrl };
      try {
        await this.profilesService.convertProfilePhotoUrlToFullUrl(holder);
        return holder.profilePhotoUrl ?? profilePhotoUrl;
      } catch {
        return profilePhotoUrl; // best-effort fallback
      }
    };

    const meetings: UpcomingMeetingDto[] = await Promise.all(
      rows.map(async (row: AnyType) => {
        const requesterName =
          row.requester_first_name || row.requester_last_name
            ? `${row.requester_first_name || ""} ${row.requester_last_name || ""}`.trim()
            : null;
        const isRequester = Boolean(row.is_requester);

        const requesterPhotoUrl = await toFullPhotoUrl(
          row.requester_photo_url || null
        );
        const prospectPhotoUrl = await toFullPhotoUrl(
          row.prospect_photo_url || null
        );

        return {
          id: row.id,
          title: row.meeting_title,
          description: row.meeting_description ?? "",
          meetingDate: toUTC(row.meeting_date).toISOString(),
          // Only return meeting link if user is the requester
          meetingLink: isRequester ? row.meeting_link : null,
          requesterName,
          requesterPhotoUrl,
          bountyAmount: Number(row.bounty_amount) || 0,
          prospectName: row.prospect_name || null,
          prospectPhotoUrl,
          isRequester,
        };
      })
    );

    return {
      meetings,
    };
  }
}
