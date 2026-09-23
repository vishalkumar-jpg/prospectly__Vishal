import { Injectable, Logger } from "@nestjs/common";
import { IntroductionsService } from "modules/introductions/introductions.service";
import { oauthConfig } from "config/oauth.config";
import { ScheduledMeeting } from "database/schema";
import * as schema from "database/schema";
import { CalendarService } from "modules/calendar/calendar.service";
import { BountyStagesService } from "modules/bounty-stages/bounty-stages.service";
import { IntroductionNotificationsDispatchService } from "modules/introductions/notifications/introduction-notifications-dispatch.service";
import { INTRODUCTION_NOTIFICATION_TYPE } from "modules/introductions/notifications/introduction-notifications.constants";
import { toUTC } from "utils/dayjs";
import { MicrosoftMeetingsProcessorService } from "./microsoft/microsoft-meetings-processor.service";
import {
  ConferenceRecord,
  ConferenceRecordsResponse,
  ParticipantsResponse,
} from "./meetings.types";
import {
  MEETING_STATUS,
  GOOGLE_MEET_URL_PATTERN,
  TOKEN_EXPIRY_BUFFER_MS,
  GOOGLE_API_ENDPOINTS,
  HTTP_STATUS,
  ERROR_REASONS,
  MEETINGS_MESSAGES,
} from "./meetings.constants";
import {
  MeetingStatusCounts,
  MeetingMetadata,
  GoogleTokenData,
  GoogleTokenRefreshResponse,
  ApiErrorResponse,
} from "./meetings.types";

@Injectable()
export class MeetingsCronService {
  private readonly logger = new Logger(MeetingsCronService.name);

  constructor(
    private readonly introductionsService: IntroductionsService,
    private readonly calendarService: CalendarService,
    private readonly bountyStagesService: BountyStagesService,
    private readonly microsoftMeetingsProcessorService: MicrosoftMeetingsProcessorService,
    private readonly introductionNotificationsDispatch: IntroductionNotificationsDispatchService
  ) {}

  /**
   * Auto-complete meetings using Google Meet API verification.
   * Runs periodically to check meeting status and update accordingly.
   */
  async autoCompleteExpiredMeetings(): Promise<void> {
    this.logger.log(MEETINGS_MESSAGES.INFO.JOB_STARTED);

    try {
      const meetings = await this.getScheduledMeetingsToCheck();

      if (meetings.length === 0) {
        return;
      }

      const counts: MeetingStatusCounts = {
        completed: 0,
        ongoing: 0,
        notStarted: 0,
      };

      for (const meeting of meetings) {
        try {
          await this.processMeeting(meeting, counts);
        } catch (error) {
          this.logger.error(
            MEETINGS_MESSAGES.ERROR.PROCESSING_MEETING(
              meeting.id,
              error instanceof Error ? error.message : String(error)
            )
          );
          // Continue processing other meetings even if one fails
        }
      }

      this.logJobSummary(counts);
    } catch (error) {
      this.logger.error(MEETINGS_MESSAGES.ERROR.JOB_FAILED, error);
      this.logger.error(MEETINGS_MESSAGES.ERROR.DIVIDER);
    }
  }

  /**
   * Process a single meeting: check status and update if needed.
   * @private
   */
  private async processMeeting(
    meeting: ScheduledMeeting,
    counts: MeetingStatusCounts
  ): Promise<void> {
    if (meeting.calendarProvider === "microsoft") {
      await this.microsoftMeetingsProcessorService.processMicrosoftMeeting(
        meeting,
        counts
      );
      return;
    }

    // Default to Google for existing/legacy or explicit 'google'
    if (meeting.calendarProvider !== "google") {
      return;
    }

    const conferenceId = this.extractConferenceId(meeting);
    if (!conferenceId) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.CONFERENCE_ID_MISSING(meeting.id)
      );
      return;
    }

    const tokens = await this.calendarService.getGoogleTokens(
      meeting.requesterId
    );
    if (!tokens) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.GOOGLE_INTEGRATION_MISSING(meeting.requesterId)
      );
      return;
    }

    const accessToken = await this.getValidAccessToken(
      tokens,
      meeting.requesterId
    );
    if (!accessToken) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.ACCESS_TOKEN_FAILED(meeting.id)
      );
      return;
    }

    const conferenceRecords = await this.checkConferenceStatus(
      conferenceId,
      accessToken
    );
    if (conferenceRecords === null) {
      // Error already logged in checkConferenceStatus
      return;
    }

    let participantCount = 0;
    const [conferenceRecord] = conferenceRecords;
    if (
      conferenceRecord &&
      conferenceRecord.startTime &&
      conferenceRecord.endTime
    ) {
      participantCount = await this.getParticipantCount(
        conferenceRecord.name,
        accessToken
      );
    }

    const newStatus = this.determineMeetingStatus(
      conferenceRecords,
      participantCount
    );

    // Update counts
    if (newStatus === MEETING_STATUS.COMPLETED) {
      counts.completed++;
    } else if (newStatus === MEETING_STATUS.ONGOING) {
      counts.ongoing++;
    } else {
      counts.notStarted++;
    }

    // Update status if changed
    if (newStatus !== meeting.status) {
      await this.updateMeetingStatus(meeting, newStatus);

      // Handle completion logic
      if (newStatus === MEETING_STATUS.COMPLETED) {
        await this.handleMeetingCompletion(meeting);
      }
    }
  }

  /**
   * Extract conference ID from meeting metadata or meeting URL.
   * @private
   */
  private extractConferenceId(meeting: ScheduledMeeting): string | null {
    const metadata = meeting.metadata as MeetingMetadata | null;
    const conferenceId = metadata?.conferenceId;

    if (conferenceId) {
      return conferenceId;
    }

    if (meeting.meetingLink) {
      const match = meeting.meetingLink.match(GOOGLE_MEET_URL_PATTERN);
      return match ? match[1] : null;
    }

    return null;
  }

  /**
   * Check if token is expiring soon (within buffer time).
   * @private
   */
  private isTokenExpiringSoon(expiresAt: Date): boolean {
    const now = toUTC();
    const bufferTime = toUTC(now.valueOf() + TOKEN_EXPIRY_BUFFER_MS);
    return expiresAt <= bufferTime;
  }

  /**
   * Refresh Google OAuth token using refresh token.
   * @private
   */
  private async refreshGoogleToken(
    tokens: GoogleTokenData,
    userId: string
  ): Promise<string | null> {
    const { clientId, clientSecret } = oauthConfig.google;

    if (!clientId || !clientSecret) {
      this.logger.error(MEETINGS_MESSAGES.ERROR.OAUTH_NOT_CONFIGURED);
      return null;
    }

    try {
      const tokenResponse = await fetch(GOOGLE_API_ENDPOINTS.TOKEN_REFRESH, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refreshToken || "",
          grant_type: "refresh_token",
        }),
      });

      if (!tokenResponse.ok) {
        return null;
      }

      const newTokenData =
        (await tokenResponse.json()) as GoogleTokenRefreshResponse;
      const now = toUTC();

      // Update database with new tokens
      await this.calendarService.saveGoogleTokens(userId, {
        accessToken: newTokenData.access_token,
        refreshToken: newTokenData.refresh_token || tokens.refreshToken,
        expiryDate: toUTC(
          now.valueOf() + newTokenData.expires_in * 1000
        ).getTime(),
      });

      return newTokenData.access_token;
    } catch (error) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.TOKEN_REFRESH_ERROR(
          error instanceof Error ? error.message : String(error)
        )
      );
      return null;
    }
  }

  /**
   * Get valid access token, refreshing if necessary.
   * @private
   */
  private async getValidAccessToken(
    tokens: GoogleTokenData,
    userId: string
  ): Promise<string | null> {
    const expiresAt = tokens.expiryDate ? toUTC(tokens.expiryDate) : toUTC(0);

    if (this.isTokenExpiringSoon(expiresAt)) {
      const refreshedToken = await this.refreshGoogleToken(tokens, userId);
      return refreshedToken || tokens.accessToken;
    }

    return tokens.accessToken;
  }

  /**
   * Check conference status via Google Meet API.
   * @private
   */
  private async checkConferenceStatus(
    conferenceId: string,
    accessToken: string
  ): Promise<ConferenceRecord[] | null> {
    try {
      const apiUrl = `${GOOGLE_API_ENDPOINTS.MEET_API_BASE}/conferenceRecords?filter=space.meeting_code="${conferenceId}"`;
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorHandled = this.handleApiError(response.status, errorText);

        if (!errorHandled) {
          // this.logger.error(
          //   MEETINGS_MESSAGES.ERROR.MEET_API_ERROR(response.status, errorText)
          // );
        }

        return null;
      }

      const data = (await response.json()) as ConferenceRecordsResponse;
      return data.conferenceRecords || [];
    } catch (error) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.MEET_API_CALL_FAILED(
          error instanceof Error ? error.message : String(error)
        )
      );
      return null;
    }
  }

  /**
   * Get participant count for a conference record via Google Meet API.
   * @private
   */
  private async getParticipantCount(
    conferenceRecordId: string,
    accessToken: string
  ): Promise<number> {
    try {
      const apiUrl = `${GOOGLE_API_ENDPOINTS.MEET_API_BASE}/${conferenceRecordId}/participants`;
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `❌ Error fetching participants (${response.status}): ${errorText}`
        );
        return 0;
      }

      const data = (await response.json()) as ParticipantsResponse;
      return data.participants?.length || 0;
    } catch (error) {
      this.logger.error(
        `❌ Error calling Google Meet API for participants: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return 0;
    }
  }

  /**
   * Handle API errors, specifically checking for scope permission issues.
   * @private
   */
  private handleApiError(status: number, errorText: string): boolean {
    if (status !== HTTP_STATUS.FORBIDDEN) {
      return false;
    }

    let errorJson: ApiErrorResponse | null = null;
    try {
      errorJson = JSON.parse(errorText) as ApiErrorResponse;
    } catch {
      // Not JSON, ignore
    }

    if (errorJson?.error?.details) {
      const isScopeError = errorJson.error.details.some(
        (detail) =>
          detail.reason === ERROR_REASONS.ACCESS_TOKEN_SCOPE_INSUFFICIENT
      );

      if (isScopeError) {
        this.logger.warn(MEETINGS_MESSAGES.WARNING.SCOPE_INSUFFICIENT);
        return true;
      }
    }

    return false;
  }

  /**
   * Determine meeting status based on conference records and participant count.
   * @private
   */
  private determineMeetingStatus(
    conferenceRecords: ConferenceRecord[] | null,
    participantCount: number
  ): (typeof MEETING_STATUS)[keyof typeof MEETING_STATUS] {
    if (!conferenceRecords || conferenceRecords.length === 0) {
      return MEETING_STATUS.NOT_STARTED;
    }

    // Check if any record has end time
    const hasEnded = conferenceRecords.some(
      (record) => record.endTime !== undefined
    );

    if (hasEnded) {
      return MEETING_STATUS.COMPLETED;
    }

    // Check if currently active (participants > 0 or start time with no end time)
    const isActive = conferenceRecords.some(
      (record) => record.startTime !== undefined && record.endTime === undefined
    );

    if (isActive || participantCount > 0) {
      return MEETING_STATUS.ONGOING;
    }

    return MEETING_STATUS.NOT_STARTED;
  }

  /**
   * Get scheduled meetings that need status checking.
   * Returns Google meetings with status: scheduled, confirmed, not_started, or ongoing.
   * @private
   */
  private async getScheduledMeetingsToCheck(): Promise<
    schema.ScheduledMeeting[]
  > {
    const googleMeetings =
      await this.calendarService.getScheduledMeetingsByStatusesAndProvider(
        [
          MEETING_STATUS.SCHEDULED,
          MEETING_STATUS.CONFIRMED,
          MEETING_STATUS.NOT_STARTED,
          MEETING_STATUS.ONGOING,
        ],
        "google"
      );

    const microsoftMeetings =
      await this.calendarService.getScheduledMeetingsByStatusesAndProvider(
        [
          MEETING_STATUS.SCHEDULED,
          MEETING_STATUS.CONFIRMED,
          MEETING_STATUS.NOT_STARTED,
          MEETING_STATUS.ONGOING,
        ],
        "microsoft"
      );

    return [...googleMeetings, ...microsoftMeetings];
  }

  /**
   * Update meeting status in database.
   * @private
   */
  private async updateMeetingStatus(
    meeting: schema.ScheduledMeeting,
    newStatus: string
  ): Promise<void> {
    await this.calendarService.updateScheduledMeetingStatus(
      meeting.id,
      newStatus
    );
  }

  /**
   * Handle meeting completion: update introduction request and bounty stages.
   * @private
   */
  private async handleMeetingCompletion(
    meeting: schema.ScheduledMeeting
  ): Promise<void> {
    if (!meeting.introductionRequestId) {
      return;
    }

    try {
      const meetingCompletedStage =
        await this.bountyStagesService.getBountyStageByStageId(
          "meeting_completed"
        );

      await this.introductionsService.updateIntroductionRequestInDb(
        meeting.introductionRequestId,
        {
          status: "meeting_completed",
          bountyStagesId: meetingCompletedStage?.id || null,
          requesterBountyStagesId: meetingCompletedStage?.id || null,
        }
      );

      void this.introductionNotificationsDispatch.dispatch({
        requestId: meeting.introductionRequestId,
        type: INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_MEETING_ACK,
      });
    } catch (error) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.UPDATE_REQUEST_FAILED(
          meeting.introductionRequestId,
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  /**
   * Log job summary statistics.
   * @private
   */
  private logJobSummary(counts: MeetingStatusCounts): void {
    this.logger.log(MEETINGS_MESSAGES.INFO.JOB_SUMMARY);
    this.logger.log(MEETINGS_MESSAGES.INFO.COMPLETED_COUNT(counts.completed));
    this.logger.log(MEETINGS_MESSAGES.INFO.ONGOING_COUNT(counts.ongoing));
    this.logger.log(
      MEETINGS_MESSAGES.INFO.NOT_STARTED_COUNT(counts.notStarted)
    );
  }
}
