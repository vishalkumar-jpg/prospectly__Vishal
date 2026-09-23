import { oauthConfig } from "config/oauth.config";
import { toUTC, utcDayjs } from "utils/dayjs";

export interface ConferenceRecord {
  name: string;
  startTime?: string;
  endTime?: string;
  expireTime?: string;
  space?: {
    name: string;
    meetingCode: string;
    meetingUri: string;
  };
}

export interface ConferenceRecordsResponse {
  conferenceRecords?: ConferenceRecord[];
  nextPageToken?: string;
}

export interface MeetingVerificationResult {
  status: "not_started" | "ongoing" | "completed";
  verified: boolean;
  startTime?: string;
  endTime?: string;
  actualDurationMinutes?: number;
  note: string;
  checkedAt: string;
}

/**
 * Extract Google Meet conference ID from meeting URL
 * Supports formats:
 * - meet.google.com/abc-defg-hij
 * - https://meet.google.com/abc-defg-hij?authuser=0
 */
export function extractConferenceId(meetingUrl: string): string | null {
  if (!meetingUrl) return null;

  try {
    const match = meetingUrl.match(/meet\.google\.com\/([a-z0-9-]+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Check Google Meet conference record status using Google Meet API
 * Requires scope: https://www.googleapis.com/auth/meetings.space.readonly
 */
export async function checkMeetingCompletion(
  accessToken: string,
  conferenceId: string
): Promise<MeetingVerificationResult> {
  const checkedAt = toUTC().toISOString();

  try {
    const response = await fetch(
      `${oauthConfig.google.meetApiBaseUrl}/conferenceRecords?filter=space.meeting_code="${conferenceId}"`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      await response.text();

      return {
        status: "not_started",
        verified: false,
        note: `API error: ${response.status}`,
        checkedAt,
      };
    }

    const data: ConferenceRecordsResponse = await response.json();

    // No conference record = meeting hasn't started
    if (!data.conferenceRecords || data.conferenceRecords.length === 0) {
      return {
        status: "not_started",
        verified: false,
        note: "No conference record found - meeting has not started yet",
        checkedAt,
      };
    }

    // Conference record exists - check for startTime and endTime
    const [conferenceRecord] = data.conferenceRecords;
    const hasStartTime = !!conferenceRecord.startTime;
    const hasEndTime = !!conferenceRecord.endTime;

    if (hasStartTime && hasEndTime) {
      // Both startTime and endTime = meeting completed
      const recordStart = utcDayjs(conferenceRecord.startTime!);
      const recordEnd = utcDayjs(conferenceRecord.endTime!);
      const actualDurationMinutes = Math.round(
        recordEnd.diff(recordStart, "minute", true)
      );

      return {
        status: "completed",
        verified: true,
        startTime: conferenceRecord.startTime,
        endTime: conferenceRecord.endTime,
        actualDurationMinutes,
        note: "Meeting completed - both startTime and endTime present",
        checkedAt,
      };
    } else if (hasStartTime && !hasEndTime) {
      // Has startTime but no endTime = meeting ongoing
      return {
        status: "ongoing",
        verified: false,
        startTime: conferenceRecord.startTime,
        note: "Meeting ongoing - has startTime but no endTime",
        checkedAt,
      };
    } else {
      // Unexpected state
      return {
        status: "not_started",
        verified: false,
        note: "Unexpected conference record state",
        checkedAt,
      };
    }
  } catch (error) {
    return {
      status: "not_started",
      verified: false,
      note: `Exception: ${error instanceof Error ? error.message : "Unknown error"}`,
      checkedAt,
    };
  }
}
