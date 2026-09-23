# Feature: Calendar Integration

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-02-06

## Overview
Calendar Integration allows users to connect their Google Calendar or Microsoft Outlook calendar accounts via OAuth. Once connected, the application can retrieve and display events, schedule meetings, and surface calendar-related badges and requirements during onboarding.

## Server Module
**Path:** `server/src/modules/calendar/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /calendar/callback/google | Public | OAuth callback for Google Calendar authorization |
| GET | /calendar/callback/microsoft | Public | OAuth callback for Microsoft Graph (Calendar) authorization |
| GET | /calendar/integrations | JWT | List the current user's connected calendar integrations |
| POST | /calendar/connect/google | JWT | Initiate Google Calendar OAuth flow |
| POST | /calendar/connect/microsoft | JWT | Initiate Microsoft Calendar OAuth flow |
| DELETE | /calendar/integrations/:id | JWT | Disconnect a calendar integration |
| GET | /calendar/events | JWT | Retrieve calendar events for the connected account |
| POST | /calendar/meetings | JWT | Schedule a new meeting via the connected calendar |

### Database Tables
| Table | Purpose |
|-------|---------|
| calendar_integrations | Stores OAuth tokens and metadata for connected calendar providers per user |
| scheduled_meetings | Records meetings scheduled through the platform |

## Client
### Pages
- **CalendarCallback** — Handles the OAuth redirect after the user authorizes a calendar provider
- **GettingStartedStep2** — Onboarding step where users connect their calendar

### Hooks
- `useCalendarIntegration()` — Manages the state of the user's calendar connection
- `useCalendarRequirement()` — Checks whether the user has fulfilled the calendar integration onboarding requirement
- `useCalendarBadges()` — Fetches badge/status indicators related to calendar connectivity
- `useGoogleCalendar()` — Google Calendar-specific integration logic and data fetching

## External Integrations
- **Google Calendar API** — OAuth 2.0 authorization and event retrieval/creation
- **Microsoft Graph (Calendar)** — OAuth 2.0 authorization and event retrieval/creation

## Business Logic
- **OAuth token storage:** When a user completes the OAuth flow, the access and refresh tokens are securely stored in `calendar_integrations`. Tokens are refreshed automatically when expired.
- **Event retrieval:** The platform fetches upcoming events from the connected calendar provider and displays them within the dashboard and meeting scheduling views.
- **Meeting scheduling:** Users can schedule meetings directly through the platform. The meeting is created in the connected calendar and recorded in `scheduled_meetings`.
- **Onboarding requirement:** Calendar connection is a required step during onboarding (Step 2). The `useCalendarRequirement()` hook enforces this.
- **Public callback endpoints:** The OAuth callback endpoints are marked `@Public()` since the redirect comes from the external provider before the user is authenticated in the app context.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
