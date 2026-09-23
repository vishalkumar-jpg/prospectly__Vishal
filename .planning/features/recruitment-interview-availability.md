# Feature: Recruiter Interview Availability (Working Hours)

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-06-18

## Overview
Recruiters set a simple working-hours range (start–end) and timezone when they
send an interview invite. Those hours are saved per recruiter as a reusable
default (pre-filled and editable on every future invite). The candidate booking
page generates 30-minute slots inside that range, Mon–Fri, and subtracts the
recruiter's real calendar busy times so blocked breaks are hidden.

This replaces the previous approach of deriving hours from Google Calendar: the
Google "Working hours" setting is not exposed by any Google API, so a fixed 9–5
window was used and unblocked breaks stayed bookable.

## Server Module
Working hours live on the existing per-user settings table; no new module/table.

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /profiles/me/configuration | Yes | Returns the user config incl. workingHours fields (used to pre-fill the invite dialog) |
| PATCH | /recruitment/candidate-workflow/:candidateId/send-interview-invite | Yes | Sends the invite; optional `availability { startTime, endTime, timezone }` is saved as the recruiter's default |
| GET | /recruitment/interview-booking/:candidateId/:token/availability | Public | Candidate-facing slots, generated from the recruiter's working hours minus busy times |

### Key Services
- **UserConfigurationsService** -- reads/upserts the working-hours columns.
- **CalendarService.getBusyPeriods()** -- provider-agnostic busy intervals (Google freeBusy / Microsoft calendarView).
- **working-hours.util** (`modules/calendar/shared/`) -- pure `resolveWorkingHours`, `generateSlotsFromHours`, `isSlotWithinHours`.
- **InterviewBookingAvailabilityService** -- builds candidate slots from working hours + busy periods.
- **InterviewBookingConfirmService** -- re-validates the chosen slot against working hours + live busy times before booking.
- **CandidateWorkflowInterviewInviteService** -- saves the working hours when sending the invite.

### Database Tables
| Table | Purpose |
|-------|---------|
| user_configurations | Adds `working_hours_start`, `working_hours_end`, `working_hours_timezone` (nullable, generic; default 09:00–17:00 applied in code) |

## Client
### Pages / Components
- **SendInterviewInviteRecruiterDialog** -- `client/src/components/recruitment/SendInterviewInviteRecruiterDialog.tsx` -- adds Start/End/Timezone inputs, pre-filled from saved config.
- **InterviewBookingCalendarPicker** -- candidate-side picker; renders slots in the candidate's own timezone (auto-detected, switchable).

### Hooks
- `useInterviewAvailability()` -- reads the recruiter's saved working hours for pre-fill.

### API Module
- `client/src/lib/api/recruitment.ts` -- `sendInterviewInvite` now accepts `availability`.
- `client/src/lib/timezones.ts` -- shared major-timezone list/labels used by both the dialog and the candidate picker.

## External Integrations
- **Google Calendar** -- freeBusy for busy-time subtraction; event creation on booking.
- **Microsoft Graph** -- calendarView busy times (wired; Google is the primary tested path).

## Business Logic
- Working hours are anchored to the recruiter's timezone; slots are absolute UTC instants shown to candidates in their own timezone.
- Slots are 30 minutes, Mon–Fri only; weekends and past times are excluded.
- Busy times on the recruiter's connected calendar are removed from the window.
- Editing the hours in the invite dialog updates the saved default (one config per recruiter).
- Confirm re-validates the slot (inside hours + still free) before charging/creating the event.
- When a recruiter has never configured hours, a 09:00–17:00 default in their resolvable timezone is used.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-18 | Initial documentation | jitendra_officebeacon |
