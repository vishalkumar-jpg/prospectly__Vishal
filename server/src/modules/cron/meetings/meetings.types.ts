export interface MeetingMetadata {
  endTime?: string;
  conferenceId?: string;
  timezone?: string;
}

export interface GoogleTokenData {
  accessToken: string;
  refreshToken: string | null;
  expiryDate: number | null;
}

export interface GoogleTokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface ConferenceRecord {
  name: string;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

export interface Participant {
  name: string;
  [key: string]: unknown;
}

export interface ParticipantsResponse {
  participants?: Participant[];
  nextPageToken?: string;
}

export interface ConferenceRecordsResponse {
  conferenceRecords?: ConferenceRecord[];
}

export interface ApiErrorDetail {
  reason?: string;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  error?: {
    details?: ApiErrorDetail[];
    [key: string]: unknown;
  };
}

export interface MeetingStatusCounts {
  completed: number;
  ongoing: number;
  notStarted: number;
}

export interface MicrosoftTokenResponse {
  transport?: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

export interface MicrosoftOnlineMeeting {
  id: string;
  joinWebUrl: string;
  startDateTime: string;
  endDateTime: string;
}

export interface MicrosoftAttendanceReport {
  id: string;
  totalParticipantCount: number;
  meetingStartDateTime: string;
  meetingEndDateTime: string;
}

export interface MicrosoftCalendarEvent {
  id: string;
  subject?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isCancelled?: boolean;
  isAllDay?: boolean;
  organizer?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  [key: string]: unknown;
}
