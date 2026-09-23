import { Injectable, Logger } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import {
  MEETING_STATUS,
  MICROSOFT_API_ENDPOINTS,
  MEETINGS_MESSAGES,
} from "../meetings.constants";
import {
  MicrosoftOnlineMeeting,
  MicrosoftAttendanceReport,
} from "../meetings.types";

@Injectable()
export class MicrosoftMeetingsOnlineApiService {
  private readonly logger = new Logger(MicrosoftMeetingsOnlineApiService.name);

  async checkMicrosoftConferenceStatus(
    joinUrl: string,
    accessToken: string,
    userEmail: string | null
  ): Promise<{
    meeting: MicrosoftOnlineMeeting;
    reports: MicrosoftAttendanceReport[];
  } | null> {
    try {
      const basePath = `${MICROSOFT_API_ENDPOINTS.GRAPH_API_BASE}/me/onlineMeetings`;
      const meetingUrl = `${basePath}?$filter=${encodeURIComponent(`JoinWebUrl eq '${joinUrl}'`)}`;

      this.logger.log(
        `[Microsoft Cron] Searching for meeting. Filter: JoinWebUrl eq '${joinUrl}', Path: ${basePath}, Token Type: Delegated`
      );

      const meetingResponse = await fetch(meetingUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!meetingResponse.ok) {
        const errorText = await meetingResponse.text();

        if (
          meetingResponse.status === 400 &&
          errorText.includes("AuthenticationError")
        ) {
          this.logger.warn(
            MEETINGS_MESSAGES.ERROR.MICROSOFT_PERSONAL_ACCOUNT_DETECTED(
              joinUrl,
              userEmail || "unknown"
            )
          );
          return null;
        }

        this.logger.error(
          MEETINGS_MESSAGES.ERROR.MICROSOFT_API_ERROR(
            meetingResponse.status,
            errorText,
            `fetch online meeting by join URL`,
            meetingUrl
          )
        );
        return null;
      }

      const meetingData = await meetingResponse.json();
      const meetings = meetingData.value as MicrosoftOnlineMeeting[];

      this.logger.log(
        `[Microsoft Cron] Found ${meetings?.length || 0} online meetings`
      );

      if (!meetings || meetings.length === 0) {
        this.logger.warn(
          MEETINGS_MESSAGES.ERROR.MICROSOFT_MEETING_NOT_FOUND(
            joinUrl,
            userEmail,
            undefined
          )
        );
        return null;
      }

      const meeting = meetings[0];

      this.logger.log(
        `[Microsoft Cron] Fetching attendance reports for meeting ${meeting.id}`
      );

      const reportsResponse = await fetch(
        `${MICROSOFT_API_ENDPOINTS.GRAPH_API_BASE}/me/onlineMeetings/${meeting.id}/attendanceReports`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!reportsResponse.ok) {
        const errorText = await reportsResponse.text();

        if (reportsResponse.status === 403) {
          this.logger.warn(
            `[Microsoft Cron] Access to attendance reports forbidden (403). ` +
              `This likely means 'OnlineMeetingArtifact.Read.All' scope is not granted. ` +
              `Falling back to scheduled times only.`
          );
          return { meeting, reports: [] };
        } else if (reportsResponse.status === 404) {
          this.logger.log(
            `[Microsoft Cron] Attendance reports not found (404) for meeting ${meeting.id}. Likely not started yet.`
          );
        } else {
          this.logger.warn(
            MEETINGS_MESSAGES.ERROR.MICROSOFT_ATTENDANCE_REPORTS_FAILED(
              reportsResponse.status,
              errorText,
              joinUrl,
              meeting.id
            )
          );
        }

        return { meeting, reports: [] };
      }

      const reportsData = await reportsResponse.json();
      const reports = reportsData.value as MicrosoftAttendanceReport[];

      this.logger.log(
        `[Microsoft Cron] Found ${reports?.length || 0} attendance reports`
      );

      return {
        meeting,
        reports: reports || [],
      };
    } catch (error) {
      this.logger.error(
        MEETINGS_MESSAGES.ERROR.MICROSOFT_API_CALL_FAILED(
          `check conference status for join URL ${joinUrl}${userEmail ? ` (user: ${userEmail})` : ""}`,
          error instanceof Error ? error.message : String(error)
        )
      );
      return null;
    }
  }

  determineMicrosoftMeetingStatus(
    reports: MicrosoftAttendanceReport[],
    meeting: MicrosoftOnlineMeeting
  ): (typeof MEETING_STATUS)[keyof typeof MEETING_STATUS] | null {
    const now = toUTC();

    if (reports && reports.length > 0) {
      this.logger.log(
        `[Microsoft Cron] Attendance reports found (${reports.length}). Marking as COMPLETED.`
      );
      return MEETING_STATUS.COMPLETED;
    }

    if (meeting.startDateTime && meeting.endDateTime) {
      const startTime = toUTC(meeting.startDateTime);
      const endTime = toUTC(meeting.endDateTime);

      if (now >= startTime && now <= endTime) {
        this.logger.log(
          `[Microsoft Cron] Time is within scheduled window (${startTime.toISOString()} - ${endTime.toISOString()}). Marking as ONGOING.`
        );
        return MEETING_STATUS.ONGOING;
      }

      if (now > endTime) {
        this.logger.log(
          `[Microsoft Cron] Scheduled end time passed (${endTime.toISOString()}). Marking as COMPLETED.`
        );
        return MEETING_STATUS.COMPLETED;
      }
    }

    return MEETING_STATUS.NOT_STARTED;
  }
}
