# Feature: Dashboard

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-02-06

## Overview
The Dashboard provides users with an at-a-glance summary of their Prospectly activity. It aggregates key statistics (contacts, introductions, meetings), highlights priority actions requiring attention, surfaces high-value opportunities, and displays upcoming meetings.

## Server Module
**Path:** `server/src/modules/dashboard/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /dashboard/stats | JWT | Aggregate statistics: total contacts, introductions made, meetings scheduled |
| GET | /dashboard/priority-actions | JWT | List priority actions the user should take next |
| GET | /dashboard/high-value-opportunities | JWT | Highlight high-value introduction or meeting opportunities |
| GET | /dashboard/upcoming-meetings | JWT | List upcoming scheduled meetings |

### Database Tables
| Table | Purpose |
|-------|---------|
| users | User profile data used in aggregation queries |
| introduction_requests | Tracks introduction requests for stats and opportunity identification |
| scheduled_meetings | Stores scheduled meetings for upcoming meetings display and stats |

**Note:** The dashboard module performs aggregation queries across these tables; it does not own its own dedicated tables.

## Client
### Pages
- **Dashboard** — Main dashboard view displaying stats cards, priority actions, high-value opportunities, and upcoming meetings

### Hooks
- `useDashboardStats()` — Fetches aggregated statistics (contacts count, introductions count, meetings count)
- `usePriorityActions()` — Fetches the list of priority actions for the current user
- `useHighValueOpportunities()` — Fetches high-value opportunities to surface to the user
- `useUpcomingMeetings()` — Fetches the user's upcoming scheduled meetings

## External Integrations
None. The dashboard aggregates data from internal tables only.

## Business Logic
- **Aggregate stats:** The `/dashboard/stats` endpoint queries across `users`, `introduction_requests`, and `scheduled_meetings` to compute summary metrics such as total contacts managed, introductions facilitated, and meetings scheduled.
- **Priority actions:** The system identifies actions the user should take next, such as following up on pending introduction requests, completing enrichment batches, or responding to meeting invitations. These are ranked by urgency and impact.
- **High-value opportunities:** The system analyzes introduction requests and contact data to surface opportunities with the highest potential value, helping users prioritize their networking efforts.
- **Upcoming meetings:** The `/dashboard/upcoming-meetings` endpoint retrieves meetings from `scheduled_meetings` that are in the future, sorted chronologically, providing the user with a clear view of their near-term schedule.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
