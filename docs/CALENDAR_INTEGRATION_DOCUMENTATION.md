# Calendar Integration Documentation

## Implementation Status: COMPLETE ✅

This document outlines the comprehensive calendar integration system for Prospectly, supporting Google Calendar, Microsoft Outlook, Zoom, iCloud Calendar, and Calendly.

### What Has Been Implemented

#### 1. Database Schema ✅
- `calendar_integrations` table for storing provider connections with encrypted tokens
- `scheduled_meetings` table for tracking all scheduled meetings
- `meeting_status_updates` table for webhook status tracking
- Proper RLS policies and indexes for security and performance

#### 2. OAuth Authentication ✅
Created edge functions for all providers:
- `google-calendar-oauth` - Google Calendar OAuth handler
- `microsoft-calendar-oauth` - Microsoft Outlook OAuth handler
- `zoom-oauth` - Zoom OAuth handler
- `icloud-oauth` - iCloud Calendar OAuth handler (Sign in with Apple)
- `calendly-oauth` - Calendly OAuth handler
- `check-oauth-credentials` - Validates provider credentials are configured

#### 3. Meeting Creation ✅
- `calendar-meeting-create` - Universal meeting creation across all providers
- Supports Google Meet, Microsoft Teams, Zoom meetings
- Stores meeting details in database with provider event IDs

#### 4. Webhook Receivers ✅
- `calendar-webhook` - Universal webhook handler for all providers
- Handles meeting status updates (scheduled, confirmed, cancelled, completed, no_show)
- Logs all status changes in `meeting_status_updates` table

#### 5. Frontend Components ✅
- `useCalendarIntegration` hook - Manages all calendar operations
- `CalendarCallback` page - Universal OAuth callback handler
- Updated Getting Started Step 2 - Shows all 5 calendar integration options
- Calendar connection UI with status indicators

### How It Works

#### Connection Flow
1. User clicks "Connect" for a provider (Google, Microsoft, Zoom, iCloud, or Calendly)
2. `useCalendarIntegration` hook checks if OAuth credentials are configured
3. User is redirected to provider OAuth page
4. After authorization, provider redirects to `/auth/callback/{provider}`
5. `CalendarCallback` page processes the callback
6. Provider-specific OAuth edge function exchanges code for tokens
7. Tokens are encrypted and stored in `calendar_integrations`
8. User's profile is updated with the connected provider
9. User is redirected back to dashboard

#### Meeting Creation Flow
1. User initiates meeting creation (e.g., from introduction request)
2. Frontend calls `createMeeting` from `useCalendarIntegration` hook
3. `calendar-meeting-create` edge function:
   - Retrieves user's calendar integration
   - Calls provider API to create meeting
   - Stores meeting in `scheduled_meetings` table
   - Returns meeting details including join URL
4. Meeting details are displayed to user

#### Webhook Status Tracking
1. Provider sends webhook to `/calendar-webhook?provider={name}`
2. Webhook handler validates and processes the payload
3. Meeting status is updated in `scheduled_meetings`
4. Status change is logged in `meeting_status_updates`
5. Application can react to status changes in real-time

### Required Secrets Configuration

Set these secrets in Supabase Edge Functions settings for each provider you want to enable:

**Google Calendar:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Microsoft Outlook:**
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

**Zoom:**
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`

**iCloud Calendar:**
- `ICLOUD_CLIENT_ID` (Apple App ID)
- `ICLOUD_CLIENT_SECRET` (Generated from Apple)

**Calendly:**
- `CALENDLY_CLIENT_ID`
- `CALENDLY_CLIENT_SECRET`

### Next Steps for Production

1. **Configure OAuth Apps** - Create apps in each provider's developer console
2. **Set Redirect URLs** - Add `{your-domain}/auth/callback/{provider}` to OAuth apps
3. **Add Secrets** - Configure client IDs and secrets in Supabase
4. **Register Webhooks** - Set up webhook URLs for each provider
5. **Test Integration** - Verify each provider works end-to-end
6. **Monitor Logs** - Check edge function logs for any issues

### Testing Checklist

- [ ] Google Calendar connection and disconnection
- [ ] Microsoft Outlook connection and disconnection
- [ ] Zoom connection and disconnection
- [ ] iCloud Calendar connection and disconnection
- [ ] Calendly connection and disconnection
- [ ] Meeting creation for each provider
- [ ] Webhook status updates for each provider
- [ ] Multiple integrations per user
- [ ] Token refresh for expired credentials
- [ ] Error handling and user notifications

## Overview
This document provides comprehensive documentation for the calendar integration system in Prospectly. The system supports multiple calendar providers (Google, Microsoft, Zoom, iCloud, and Calendly) and enables automated meeting scheduling with webhook-based status tracking.

## Supported Providers
1. **Google Calendar** - Full calendar integration with OAuth 2.0
2. **Microsoft Calendar (Outlook)** - Full calendar integration with OAuth 2.0
3. **Zoom** - Meeting creation and webhook notifications
4. **iCloud Calendar** - CalDAV-based integration
5. **Calendly** - Booking page integration with webhooks

---

## Database Schema

### 1. calendar_integrations Table
Stores user calendar connections and provider credentials.

```sql
Columns:
- id (UUID, PK): Unique identifier
- user_id (UUID, FK): Reference to auth.users
- provider (TEXT): One of: google, microsoft, zoom, icloud, calendly
- provider_user_id (TEXT): Provider-specific user ID
- provider_email (TEXT): Email associated with provider account
- access_token_encrypted (TEXT): Encrypted OAuth access token
- refresh_token_encrypted (TEXT): Encrypted OAuth refresh token
- token_expires_at (TIMESTAMPTZ): Token expiration timestamp
- calendar_id (TEXT): Default calendar ID for the provider
- webhook_url (TEXT): Provider's webhook endpoint URL
- webhook_channel_id (TEXT): Webhook channel identifier
- webhook_resource_id (TEXT): Webhook resource identifier
- webhook_expires_at (TIMESTAMPTZ): Webhook expiration
- is_active (BOOLEAN): Integration active status
- last_sync_at (TIMESTAMPTZ): Last successful sync timestamp
- sync_error (TEXT): Last sync error message
- metadata (JSONB): Additional provider-specific data
- created_at (TIMESTAMPTZ): Creation timestamp
- updated_at (TIMESTAMPTZ): Last update timestamp
```

**RLS Policies:**
- Users can manage their own calendar integrations
- Admins can view all calendar integrations

### 2. scheduled_meetings Table
Tracks all scheduled meetings created through the platform.

```sql
Columns:
- id (UUID, PK): Unique identifier
- introduction_request_id (UUID, FK): Related introduction request
- organizer_id (UUID, FK): Meeting organizer (auth.users)
- attendee_id (UUID, FK): Meeting attendee (auth.users)
- calendar_integration_id (UUID, FK): Related calendar integration
- provider (TEXT): Calendar provider used
- provider_event_id (TEXT): Provider's event identifier
- provider_meeting_id (TEXT): Provider's meeting identifier (Zoom/Teams)
- title (TEXT): Meeting title
- description (TEXT): Meeting description
- start_time (TIMESTAMPTZ): Meeting start time
- end_time (TIMESTAMPTZ): Meeting end time
- timezone (TEXT): Meeting timezone
- location (TEXT): Meeting location/URL
- meeting_url (TEXT): Virtual meeting URL
- meeting_password (TEXT): Virtual meeting password
- status (TEXT): scheduled, confirmed, cancelled, completed, no_show
- cancellation_reason (TEXT): Reason for cancellation
- attendee_email (TEXT): Attendee's email address
- attendee_name (TEXT): Attendee's name
- reminder_sent (BOOLEAN): Reminder sent flag
- metadata (JSONB): Additional meeting data
- created_at (TIMESTAMPTZ): Creation timestamp
- updated_at (TIMESTAMPTZ): Last update timestamp
```

**RLS Policies:**
- Users can view meetings they organize or attend
- Users can create meetings as organizers
- Users can update/delete their own meetings
- Admins have full access

### 3. meeting_status_updates Table
Tracks all meeting status changes for audit and webhook purposes.

```sql
Columns:
- id (UUID, PK): Unique identifier
- meeting_id (UUID, FK): Reference to scheduled_meetings
- previous_status (TEXT): Previous meeting status
- new_status (TEXT): New meeting status
- update_source (TEXT): webhook, manual, system
- webhook_payload (JSONB): Full webhook payload if applicable
- updated_by (UUID, FK): User who made the update
- created_at (TIMESTAMPTZ): Timestamp of status change
```

**RLS Policies:**
- Users can view status updates for their meetings
- System can insert status updates

---

## Provider Integration Details

### Google Calendar Integration

**OAuth 2.0 Flow:**
1. User clicks "Connect Google Calendar"
2. Frontend redirects to Google OAuth consent screen
3. User grants permissions (calendar.events, calendar.readonly)
4. Google redirects back with authorization code
5. Edge function exchanges code for access/refresh tokens
6. Tokens encrypted and stored in calendar_integrations table

**Edge Functions:**
- `google-calendar-oauth`: Handles OAuth callback and token exchange
- `google-calendar-create-event`: Creates calendar events
- `google-calendar-sync`: Syncs calendar availability
- `google-calendar-webhook`: Receives calendar change notifications

**Webhook Setup:**
```javascript
// Register webhook channel
POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/watch
{
  "id": "channel-unique-id",
  "type": "web_hook",
  "address": "https://your-project.supabase.co/functions/v1/google-calendar-webhook",
  "expiration": timestamp
}
```

**Creating Events:**
```javascript
POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
{
  "summary": "Meeting Title",
  "description": "Meeting Description",
  "start": {
    "dateTime": "2025-01-15T10:00:00-07:00",
    "timeZone": "America/Los_Angeles"
  },
  "end": {
    "dateTime": "2025-01-15T11:00:00-07:00",
    "timeZone": "America/Los_Angeles"
  },
  "attendees": [
    {"email": "attendee@example.com"}
  ],
  "conferenceData": {
    "createRequest": {
      "requestId": "unique-request-id",
      "conferenceSolutionKey": {"type": "hangoutsMeet"}
    }
  }
}
```

---

### Microsoft Calendar (Outlook) Integration

**OAuth 2.0 Flow:**
1. User clicks "Connect Microsoft Calendar"
2. Frontend redirects to Microsoft Identity Platform
3. User grants permissions (Calendars.ReadWrite)
4. Microsoft redirects with authorization code
5. Edge function exchanges code for tokens
6. Tokens encrypted and stored

**Edge Functions:**
- `microsoft-calendar-oauth`: OAuth handling
- `microsoft-calendar-create-event`: Event creation
- `microsoft-calendar-sync`: Calendar sync
- `microsoft-calendar-webhook`: Webhook receiver

**Webhook Setup (Microsoft Graph Subscriptions):**
```javascript
POST https://graph.microsoft.com/v1.0/subscriptions
{
  "changeType": "created,updated,deleted",
  "notificationUrl": "https://your-project.supabase.co/functions/v1/microsoft-calendar-webhook",
  "resource": "/me/events",
  "expirationDateTime": "2025-01-20T11:00:00.0000000Z",
  "clientState": "secretClientValue"
}
```

**Creating Events:**
```javascript
POST https://graph.microsoft.com/v1.0/me/events
{
  "subject": "Meeting Title",
  "body": {
    "contentType": "HTML",
    "content": "Meeting Description"
  },
  "start": {
    "dateTime": "2025-01-15T10:00:00",
    "timeZone": "Pacific Standard Time"
  },
  "end": {
    "dateTime": "2025-01-15T11:00:00",
    "timeZone": "Pacific Standard Time"
  },
  "location": {
    "displayName": "Virtual"
  },
  "attendees": [
    {
      "emailAddress": {
        "address": "attendee@example.com",
        "name": "Attendee Name"
      },
      "type": "required"
    }
  ],
  "isOnlineMeeting": true,
  "onlineMeetingProvider": "teamsForBusiness"
}
```

---

### Zoom Integration

**OAuth 2.0 Flow:**
1. User clicks "Connect Zoom"
2. Frontend redirects to Zoom OAuth page
3. User authorizes with Zoom account
4. Zoom redirects with authorization code
5. Edge function exchanges for tokens
6. Tokens encrypted and stored

**Edge Functions:**
- `zoom-oauth`: OAuth handling
- `zoom-create-meeting`: Meeting creation
- `zoom-webhook`: Webhook receiver for meeting events

**Webhook Setup:**
```javascript
// Configure in Zoom App Marketplace
Event types to subscribe:
- meeting.started
- meeting.ended
- meeting.participant_joined
- meeting.participant_left

Webhook URL: https://your-project.supabase.co/functions/v1/zoom-webhook
```

**Creating Meetings:**
```javascript
POST https://api.zoom.us/v2/users/me/meetings
{
  "topic": "Meeting Title",
  "type": 2, // Scheduled meeting
  "start_time": "2025-01-15T10:00:00Z",
  "duration": 60,
  "timezone": "America/Los_Angeles",
  "agenda": "Meeting Description",
  "settings": {
    "host_video": true,
    "participant_video": true,
    "join_before_host": false,
    "mute_upon_entry": true,
    "waiting_room": true,
    "auto_recording": "cloud"
  }
}
```

---

### iCloud Calendar Integration

**CardDAV Authentication:**
1. User provides iCloud email and app-specific password
2. Edge function authenticates via CardDAV
3. Credentials encrypted and stored
4. Calendar discovery via PROPFIND requests

**Edge Functions:**
- `icloud-calendar-auth`: CardDAV authentication
- `icloud-calendar-create-event`: Event creation
- `icloud-calendar-sync`: Calendar sync

**Creating Events (CalDAV):**
```xml
PUT https://caldav.icloud.com/{userId}/calendars/{calendarId}/{eventId}.ics
Content-Type: text/calendar

BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Prospectly//EN
BEGIN:VEVENT
UID:{eventId}
DTSTAMP:20250115T100000Z
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
SUMMARY:Meeting Title
DESCRIPTION:Meeting Description
LOCATION:Virtual
ORGANIZER:mailto:organizer@example.com
ATTENDEE:mailto:attendee@example.com
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

---

### Calendly Integration

**API Key Authentication:**
1. User provides Calendly API key (Personal Access Token)
2. Edge function validates token
3. Token encrypted and stored
4. Fetch user's event types

**Edge Functions:**
- `calendly-auth`: API key validation
- `calendly-create-invitation`: Create booking link
- `calendly-webhook`: Webhook receiver

**Webhook Setup:**
```javascript
POST https://api.calendly.com/webhook_subscriptions
{
  "url": "https://your-project.supabase.co/functions/v1/calendly-webhook",
  "events": [
    "invitee.created",
    "invitee.canceled"
  ],
  "organization": "https://api.calendly.com/organizations/{org_uuid}",
  "scope": "organization"
}
```

**Creating Invitations:**
```javascript
// Calendly uses scheduling links, not direct event creation
// Get user's event type
GET https://api.calendly.com/event_types?user={user_uri}

// Share scheduling link from event type
{
  "scheduling_url": "https://calendly.com/{username}/{event-type}?email={attendee_email}&name={attendee_name}"
}
```

---

## Meeting Scheduling Workflow

### 1. User Connects Calendar
```typescript
// Frontend initiates OAuth flow
window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `response_type=code&` +
  `scope=https://www.googleapis.com/auth/calendar.events&` +
  `access_type=offline`;

// Edge function handles callback
const { code } = await request.json();
const tokens = await exchangeCodeForTokens(code);
const encryptedTokens = await encryptTokens(tokens);

await supabase.from('calendar_integrations').insert({
  user_id: userId,
  provider: 'google',
  access_token_encrypted: encryptedTokens.access_token,
  refresh_token_encrypted: encryptedTokens.refresh_token,
  token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
  is_active: true
});
```

### 2. Creating a Meeting
```typescript
// Frontend requests meeting creation
const response = await supabase.functions.invoke('create-meeting', {
  body: {
    introduction_request_id: 'uuid',
    attendee_email: 'attendee@example.com',
    attendee_name: 'John Doe',
    start_time: '2025-01-15T10:00:00Z',
    end_time: '2025-01-15T11:00:00Z',
    title: 'Introduction Meeting',
    description: 'Connect with...'
  }
});

// Edge function:
// 1. Fetches user's active calendar integration
// 2. Decrypts access token
// 3. Creates event via provider API
// 4. Stores meeting in scheduled_meetings table
// 5. Logs initial status in meeting_status_updates
```

### 3. Webhook Processing
```typescript
// Webhook receives event from provider
export default async function handler(req: Request) {
  const payload = await req.json();
  
  // Validate webhook signature
  const isValid = await validateWebhookSignature(req, payload);
  if (!isValid) return new Response('Invalid signature', { status: 401 });
  
  // Process event based on provider
  switch (payload.event_type) {
    case 'meeting.started':
      await updateMeetingStatus(payload.meeting_id, 'in_progress');
      break;
    case 'meeting.ended':
      await updateMeetingStatus(payload.meeting_id, 'completed');
      break;
    case 'meeting.participant_joined':
      await logParticipantJoin(payload);
      break;
  }
  
  // Store webhook payload for audit
  await supabase.from('meeting_status_updates').insert({
    meeting_id: meetingId,
    previous_status: currentStatus,
    new_status: newStatus,
    update_source: 'webhook',
    webhook_payload: payload
  });
  
  return new Response('OK', { status: 200 });
}
```

---

## Security Considerations

### Token Encryption
All OAuth tokens are encrypted before storage using AES-256-GCM:

```typescript
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const keyData = encoder.encode(Deno.env.get('ENCRYPTION_KEY'));
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}
```

### Webhook Validation
Each provider's webhooks must be validated:

**Google:**
```typescript
// Verify X-Goog-Channel-Token header
if (req.headers.get('x-goog-channel-token') !== EXPECTED_TOKEN) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Microsoft:**
```typescript
// Validate clientState in payload
if (payload.clientState !== EXPECTED_CLIENT_STATE) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Zoom:**
```typescript
// Verify HMAC signature
const signature = req.headers.get('x-zm-signature');
const timestamp = req.headers.get('x-zm-request-timestamp');
const message = `v0:${timestamp}:${JSON.stringify(payload)}`;
const expectedSignature = createHmac('sha256', ZOOM_SECRET)
  .update(message)
  .digest('hex');

if (signature !== `v0=${expectedSignature}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

### RLS Policies
Row-level security ensures users can only access their own data:
- Calendar integrations: Users see only their connections
- Meetings: Users see meetings they organize or attend
- Status updates: Users see updates for their meetings

---

## Edge Functions Reference

### Required Secrets
Configure these in Supabase Edge Functions:
```bash
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
ZOOM_CLIENT_ID
ZOOM_CLIENT_SECRET
CALENDLY_API_KEY
ENCRYPTION_KEY
WEBHOOK_VALIDATION_TOKEN
```

### Function Endpoints

**Google Calendar:**
- `POST /google-calendar-oauth` - OAuth callback
- `POST /google-calendar-create-event` - Create event
- `GET /google-calendar-availability` - Check availability
- `POST /google-calendar-webhook` - Webhook receiver

**Microsoft Calendar:**
- `POST /microsoft-calendar-oauth` - OAuth callback
- `POST /microsoft-calendar-create-event` - Create event
- `GET /microsoft-calendar-availability` - Check availability
- `POST /microsoft-calendar-webhook` - Webhook receiver

**Zoom:**
- `POST /zoom-oauth` - OAuth callback
- `POST /zoom-create-meeting` - Create meeting
- `POST /zoom-webhook` - Webhook receiver

**iCloud:**
- `POST /icloud-calendar-auth` - Authenticate with CardDAV
- `POST /icloud-calendar-create-event` - Create event
- `GET /icloud-calendar-sync` - Sync calendar

**Calendly:**
- `POST /calendly-auth` - Validate API key
- `POST /calendly-create-invitation` - Generate booking link
- `POST /calendly-webhook` - Webhook receiver

---

## Error Handling

### Token Refresh
Automatically refresh expired tokens:
```typescript
async function refreshAccessToken(integration: CalendarIntegration) {
  const { provider, refresh_token_encrypted } = integration;
  
  const refreshToken = await decryptToken(refresh_token_encrypted);
  
  let tokenUrl, clientId, clientSecret;
  switch (provider) {
    case 'google':
      tokenUrl = 'https://oauth2.googleapis.com/token';
      clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      break;
    // ... other providers
  }
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  const { access_token, expires_in } = await response.json();
  
  // Update stored token
  await supabase.from('calendar_integrations')
    .update({
      access_token_encrypted: await encryptToken(access_token),
      token_expires_at: new Date(Date.now() + expires_in * 1000),
      last_sync_at: new Date()
    })
    .eq('id', integration.id);
  
  return access_token;
}
```

### Webhook Renewal
Webhooks expire and must be renewed:
```typescript
// Cron job to renew expiring webhooks
async function renewWebhooks() {
  const expiringSoon = await supabase
    .from('calendar_integrations')
    .select('*')
    .lt('webhook_expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000))
    .eq('is_active', true);
  
  for (const integration of expiringSoon.data) {
    await renewWebhook(integration);
  }
}

// Schedule with pg_cron
SELECT cron.schedule(
  'renew-calendar-webhooks',
  '0 0 * * *', -- Daily at midnight
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/renew-webhooks',
    headers:='{\\\"Authorization\\\": \\\"Bearer YOUR_SERVICE_ROLE_KEY\\\"}'::jsonb
  );
  $$
);
```

---

## Testing

### Manual Testing Steps
1. **Connect Calendar**: Test OAuth flow for each provider
2. **Create Meeting**: Verify event creation in provider calendar
3. **Webhook Testing**: Use provider's test tools to send webhooks
4. **Token Refresh**: Test token expiration and renewal
5. **Meeting Status**: Verify status updates flow correctly

### Test Webhook Payloads

**Google (Event Created):**
```json
{
  "kind": "api#channel",
  "id": "channel-id",
  "resourceId": "resource-id",
  "resourceUri": "https://www.googleapis.com/calendar/v3/calendars/...",
  "token": "validation-token",
  "expiration": "1642281600000"
}
```

**Zoom (Meeting Started):**
```json
{
  "event": "meeting.started",
  "payload": {
    "account_id": "account-id",
    "object": {
      "uuid": "meeting-uuid",
      "id": 123456789,
      "host_id": "host-id",
      "topic": "Meeting Title",
      "start_time": "2025-01-15T10:00:00Z"
    }
  }
}
```

---

## Monitoring & Logs

### Key Metrics to Track
1. **Integration Success Rate**: % of successful calendar connections
2. **Meeting Creation Rate**: Meetings created per day
3. **Webhook Delivery**: % of webhooks successfully processed
4. **Token Refresh Success**: % of successful token renewals
5. **Meeting Completion Rate**: % of scheduled meetings that complete

### Logging Strategy
```typescript
// Log all calendar operations
await supabase.from('calendar_operation_logs').insert({
  operation_type: 'create_event',
  provider: 'google',
  user_id: userId,
  success: true,
  duration_ms: 1234,
  error_message: null,
  metadata: { event_id: 'evt_123' }
});
```

---

## Future Enhancements
1. **Calendar Sync**: Two-way sync with provider calendars
2. **Availability Detection**: Smart meeting slot suggestions
3. **Recurring Meetings**: Support for recurring meeting schedules
4. **Meeting Templates**: Pre-configured meeting types
5. **Analytics Dashboard**: Meeting insights and statistics
6. **Mobile Push Notifications**: Real-time meeting updates
7. **AI Scheduling Assistant**: Auto-schedule based on preferences

---

## Support & Troubleshooting

### Common Issues

**Issue: "Token expired" errors**
- Solution: Implement automatic token refresh before each API call

**Issue: Webhooks not received**
- Solution: Verify webhook URL is publicly accessible and SSL is valid

**Issue: Meeting not appearing in calendar**
- Solution: Check calendar_id is correct and user has write permissions

**Issue: Duplicate meetings created**
- Solution: Implement idempotency keys in meeting creation

### Debug Mode
Enable debug logging:
```typescript
const DEBUG = Deno.env.get('DEBUG_CALENDAR') === 'true';

if (DEBUG) {
  // Calendar operation logging disabled
}
```

---

## Conclusion
This calendar integration system provides a robust, secure, and scalable solution for managing meetings across multiple calendar providers. The webhook-based status tracking ensures real-time updates, while the encrypted token storage maintains security standards.

For implementation questions or issues, refer to the provider's official API documentation:
- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [Microsoft Graph Calendar](https://docs.microsoft.com/en-us/graph/api/resources/calendar)
- [Zoom API](https://marketplace.zoom.us/docs/api-reference/zoom-api)
- [CalDAV (iCloud)](https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/iCloudDesignGuide/Chapters/DesigningForCalendarsandReminders.html)
- [Calendly API](https://developer.calendly.com/api-docs)
