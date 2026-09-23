# Feature: Recruiter Dashboard — Payouts Due

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-09-14

## Overview
A "Payouts Due" card on the Recruiter Dashboard. It sits at the bottom of the right column, under Candidate Pipeline and Recent Activity, which balances the taller left column (v1.1). It lists hired-stage connector payouts and candidate bonuses the recruiter still has to act on, where the release date falls in the next 7 days or has already passed. Rows are sorted by priority: overdue first, then due today, then upcoming. Clicking a row opens the job pipeline, reveals and scrolls to the candidate's Hired card, highlights it, and opens the scoped Release dialog.

Design reference: `client/design/recruiter-dashboard-payouts-due.html` (option B).

## Server Module
**Path:** `server/src/modules/recruitment/recruiter-dashboard/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/recruiter/dashboard/payouts-due?countries=` | Yes (`recruiting` module) | Due payouts for accessible jobs, filtered by the dashboard country filter |

Response: `{ totalCount, overdueCount, dueTodayCount, items[≤50] }`. Each item carries `candidateId`, `jobId`, `payoutType`, `recipientName`, `candidateName`, `amount`, `currency`, `releaseDate`, `daysUntilRelease`, `dueStatus` (`overdue | due_today | upcoming`), and `isFailed`.

### Key Services
- **DashboardPayoutsDueService** (`services/dashboard-payouts-due.service.ts`)
  - **Rows included:** `recruitment_payout_history` rows with `status='pending'` and `processing_status` of null, `pending` or `failed` (the Release dialog's "actionable" set). The candidate must be at the `hired` stage with a `hire_date`. Rows in onboarding, queued, processing or manual review are excluded.
  - **Scope:** jobs from `buildAccessibleJobsCondition` (owner or active collaborator, plus the country filter). Closed jobs are included. A collaborator only sees rows if their role has `payout.release`.
  - **Release date:** uses `recruitment-payout-gating.helper`. For a connector it is `hire_date + int/ext wait days` when that classification's wait flag is on, otherwise `hire_date`. For a candidate it is `hire_date + probation_period_days`, or `hire_date` when no probation is set.
  - **Due window:** `daysUntilRelease` counts UTC calendar days. A row is included when it is `≤ PAYOUTS_DUE_WINDOW_DAYS` (7).
  - **Amount:** the latest amount, re-priced the same way as `RecruitmentPayoutStateService`. A connector row uses `getConnectorPayoutBreakdown(flatReferralAmount, SINGLE_CONNECTOR_SHARE_PERCENT)`. A candidate row uses the success fee × the candidate recipient %. Without a current fee, the stored snapshot is used.
  - **List cap:** `DASHBOARD_LIMITS.PAYOUTS_DUE = 50`, most urgent first. The counts cover every due row.

## Client
### Components
- **PayoutsDueSection** (`client/src/pages/recruitment/recruiter-dashboard/components/PayoutsDueSection.tsx`)
  - Header badges: "N overdue" and "N today", or "N due" when neither applies.
  - Shows the 5 most urgent rows. When there are more than 5, a **View all (N)** button expands the full list inside a fixed-height scroll (`max-h-[344px]`), and **View less** collapses it. Nothing redirects, and there is no total banner.
  - Rows are compact and two-line, and work at phone width. Line 1: recipient, type tag, amount. Line 2: release date · job · context, then the status pill (always icon + text).
  - States: loading skeleton, and an error state with **Try Again** (a payouts error does not trigger the page-level dashboard error). **The card is hidden when nothing is due.**
- **RecruiterDashboard.tsx** — renders the section as the last card in the right column.
- **Empty-card rule (v1.1):** Priority Actions and Recent Activity are also hidden when they have no data. Candidate Pipeline and Active Jobs always render.

### Hooks / API
- `useRecruiterPayoutsDue(countries)` (`recruiter-dashboard/hooks/`). The query key is `/api/recruiter/dashboard/payouts-due`, so the existing `invalidateRecruiterDashboardQueries` covers it.
- `recruiterDashboardApi.getPayoutsDue({ countries })`.

### Deep link → pipeline
- Row click → `/recruiting/my-job-posts/:jobId?payout=<candidateId>&payoutScope=connector|candidate`.
- `JobDetailWithKanban.tsx` waits for candidates and the stage-filter config to load, then removes both params so a refresh does not replay the link.
  - If the saved stage filter hides Hired, the column is shown for this visit only (`forceShowHiredStage`). The saved filter is not changed, and the override resets on any stage-filter change.
  - `KanbanCandidateCard` receives `isHighlighted` and scrolls itself into view (`scrollIntoView` with `inline: center`, which also scrolls the board horizontally). It shows a rose ring for 3 seconds.
  - After 700 ms the existing `ReleasePayoutDialog` opens with the matching scope.
  - An unknown candidate shows a "Payout not found" toast.

## Business Logic
- Priority order: `releaseDate` ascending (most overdue first), ties broken by larger amount first.
- A failed transfer shows a "Retry needed" pill in place of the due pill.
- The period filter does not apply to this section. It has a fixed 7-day window. The country filter does apply.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-09-14 | Initial implementation (option B) | Claude |
| 1.1 | 2026-09-14 | Moved to the bottom of the right column. Full list in a fixed-height scroll; removed "View all" and the total banner. Compact, responsive rows. Payouts Due, Priority Actions and Recent Activity hidden when empty. | Claude |
| 1.2 | 2026-09-14 | 5 rows by default; in-card "View all (N)" expands into the scroll and "View less" collapses it | Claude |
