# Feature: Recruitment Finance

**Version:** 1.3
**Status:** Active
**Last Updated:** 2026-08-03

## Overview
The Recruitment Finance feature provides financial visibility for recruitment transactions on the `/transactions?section=recruitment` page. It has two views, both now live and API-backed: **Requester Spending** (what a requester has paid for interviews) and **Connector Earnings** (what a connector has earned in payouts). Each view has its own backend module, React Query hooks, stat cards, filters, paginated table, and detail modal. The two views are intentionally symmetrical so engineers can cross-reference patterns between them.

## Server Module
**Path:** `server/src/modules/recruitment/financial/requester-spending/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /recruitment/spending | Yes | Paginated list of requester's interview transactions with search, status, date, and sort filters |
| GET | /recruitment/spending/stats | Yes | Global spending statistics (total spent, upcoming payments, spent this month) |
| GET | /recruitment/spending/:id | Yes | Single transaction detail with fee breakdown, payment timeline, and receipt URL |

### Query Parameters (Listing)
- `page` (default: 1), `limit` (default: 10, max: 50)
- `search` — matches job title, candidate anonymous label, or amount
- `status` — `all | pending | authorized | captured | cancelled`
- `sortBy` — `date | amount | status`
- `sortOrder` — `asc | desc`
- `datePreset` — `all | last7days | last30days | last3months | lastyear | custom`
- `startDate`, `endDate` — ISO strings for custom date range

### Key Services
- **RequesterSpendingService** — Thin orchestrator that delegates to sub-services
- **SpendingListService** — Listing query with pagination, filters, sorting, search, and candidate name visibility logic
- **SpendingStatsService** — Global stats aggregation (total spent, upcoming payments, spent this month)
- **SpendingDetailService** — Single-record detail with pricing JOIN, fee breakdown, and payment timeline builder

### Module Files
| File | Purpose |
|------|---------|
| `requester-spending.module.ts` | NestJS module, imported by `RecruitmentModule` |
| `requester-spending.controller.ts` | 3 routes: listing, stats, detail |
| `requester-spending.service.ts` | Thin orchestrator — delegates to sub-services |
| `requester-spending.dto.ts` | Query validation with class-validator |
| `requester-spending.constants.ts` | Status/sort enums, error messages |
| `requester-spending.response.ts` | TypeScript response interfaces |
| `services/spending-list.service.ts` | Listing query logic with filters, pagination, sorting |
| `services/spending-stats.service.ts` | Global stats aggregation queries |
| `services/spending-detail.service.ts` | Detail query with pricing JOIN and timeline builder |

### Database Tables
| Table | Purpose |
|-------|---------|
| `recruitment_interview_transactions` | Primary table — one row per (candidate, fee type). `transaction_type` is the discriminator; requester spending surfaces all five recruiter-paid types (see Transaction Types below). Stores Stripe intent, amounts, status, timestamps |
| `recruitment_jobs` | JOINed for job title and company name |
| `recruitment_job_candidates` | JOINed for anonymous label and candidate user reference |
| `recruitment_job_prices` | JOINed (detail endpoint only) for fee breakdown: bounty, Stripe fee, processing fee — only built for the `interview_cost` type |
| `users` | JOINed for candidate real name and email (shown only when status = captured, and never for `flat_deposit`) |

The five transaction types the requester views include are defined once in `REQUESTER_SPENDING_TXN_TYPES` (`requester-spending.constants.ts`) and shared by the list, stats, and detail services so all three stay in sync.

### Security
- All queries filter by `recruiter_id = currentUserId` — users can only see their own spending
- All queries include `deleted_at IS NULL` (soft delete filter)
- `ParseUUIDPipe` validates the `:id` parameter on the detail endpoint
- JWT auth guard protects all routes (global guard, no `@Public()`)

## Client

### Pages
- **FinancesNew** — `client/src/pages/FinancesNew.tsx` — Main transactions page, renders `RecruitmentFinanceTab` when `section=recruitment`

### Components
| Component | Path | Purpose |
|-----------|------|---------|
| `RecruitmentFinanceTab` | `client/src/components/finance/RecruitmentFinanceTab.tsx` | Tab switcher between Connector Earnings and Requester Spending |
| `RequesterView` | `client/src/components/finance/recruitment/RequesterView.tsx` | Main container: orchestrates stats, filters, table, and modal |
| `RequesterSpendingStats` | `client/src/components/finance/recruitment/RequesterSpendingStats.tsx` | Two gradient stat cards: Total Spent + Upcoming Payments |
| `RequesterSpendingFilters` | `client/src/components/finance/recruitment/RequesterSpendingFilters.tsx` | Search input, status dropdown, date range picker |
| `RequesterSpendingTable` | `client/src/components/finance/recruitment/RequesterSpendingTable.tsx` | Sortable table with pagination. Columns: Job (title + company), Candidate (name/label + email), Amount, Status, Date, Action |
| `RequesterSpendingModal` | `client/src/components/finance/recruitment/RequesterSpendingModal.tsx` | Detail dialog: gradient header (job + company + candidate + amount), colored fee breakdown (Interview Cost, Stripe Fee, Application Fee), payment timeline with colored icons per event type, Stripe receipt link |

### Hooks
- `useRequesterSpending(filters, { enabled })` — Paginated listing query, lazy-loaded when tab is active
- `useRequesterSpendingStats({ enabled })` — Global stats query, lazy-loaded when tab is active
- `useRequesterSpendingDetail(id)` — Single transaction detail, fires only when modal opens (`enabled: !!id`)

### API Module
- `client/src/lib/api/recruitment-spending.ts` — Type definitions and `getDetail()` request function
- Listing and stats use React Query's default `queryFn` via `queryKey` pattern (no explicit API call needed)

## Design Decisions

### Performance: 3-Endpoint Split
The listing endpoint is intentionally lightweight — it does NOT JOIN with `recruitment_job_prices`. The fee breakdown (bounty, Stripe fee, processing fee) is only fetched via the dedicated detail endpoint when the user clicks "View" on a specific transaction. This keeps the listing fast.

### Lazy Loading
Both `useRequesterSpending` and `useRequesterSpendingStats` accept `enabled: boolean`. They only fire when the "Requester Spending" tab is active, preventing unnecessary API calls when the page loads with "Connector Earnings" selected.

### Candidate Name Visibility
Follows the same pattern as the recruitment pipeline: anonymous label (e.g., "Candidate #A7") is shown until the interview is booked (transaction status = `captured`), at which point the real candidate name and email are revealed.

### Stats Are Global
The two stat cards (Total Spent, Upcoming Payments) always show lifetime totals regardless of active filters. They use a separate API endpoint cached independently.

## Business Logic
- **Transaction types (all recruiter-paid, all included in the list and the stat totals):**
  - `interview_cost` — the referral fee charged at hire (the only type with a bounty + fees breakdown; the legacy type name is retained)
  - `flat_deposit` — one-time flat referral deposit captured at first shortlist (kept anonymized even when captured)
  - `flat_topup` — flat fee top-up captured at connector-payout release when the flat fee was raised after hire
  - `success_fee` — candidate success fee charged to the recruiter at booking to fund the candidate's retention bonus
  - `success_fee_topup` — top-up captured at candidate-bonus release when the success fee was raised after the candidate was charged
- **Transaction statuses:** `pending` → `authorized` → `captured` or `cancelled`
- **Total Spent** = SUM of `total_amount` where status = `captured` (across all five types)
- **Upcoming Payments** = SUM of `total_amount` where status = `authorized`
- **Spent This Month** = SUM of `total_amount` where status = `captured` AND `captured_at` is in current calendar month
- **Fee breakdown labels:** Interview Cost (bounty) + Stripe Processing Fee (2.9% + $0.30) + Application Fee ($0.25) = Total Charged. Only built for `interview_cost`; deposits, top-ups, and success fees are single amounts and show no breakdown
- **Payment timeline events:** Transaction Created → Payment Authorized → Payment Captured/Cancelled (with timestamps)

---

## Connector Earning Module

**Path:** `server/src/modules/recruitment/financial/connector-earning/`

This module powers the **Connector Earnings** tab. It is a structural mirror of Requester Spending, but sourced from `recruitment_payout_history` filtered to `payout_type = 'connector'` and scoped to the authenticated user as the payout recipient.

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /recruitment/earning | Yes | Paginated list of the current user's connector payouts with search, status, date, and sort filters |
| GET | /recruitment/earning/stats | Yes | Global earning stats: total earnings, this month, last month, pending payouts |
| GET | /recruitment/earning/:id | Yes | Single payout detail with breakdown, processing timeline, role/share, and error context |

### Query Parameters (Listing)
- `page` (default: 1), `limit` (default: 10, max: 50)
- `search` — matches job title or company name (ilike)
- `status` — `all | pending | onboarding_pending | processing | completed | failed` (backed by `processing_status`)
- `sortBy` — `date | amount | status`
- `sortOrder` — `asc | desc`
- `datePreset` — `all | last7days | last30days | last3months | lastyear | custom` (operates on `created_at`)
- `startDate`, `endDate` — ISO strings for custom date range

### Key Services
- **ConnectorEarningService** — Thin orchestrator that delegates to sub-services
- **EarningListService** — Lightweight listing query. Joins only `recruitment_jobs` and `recruitment_job_candidates`. Uses a correlated `EXISTS` subquery against `recruitment_candidate_connectors` to compute `isShared` without an extra join
- **EarningStatsService** — Four parallel `COALESCE(SUM(...), 0)` aggregates over `recipient_amount`: lifetime total (completed), this month (completed), last month (completed), pending (pending + processing + onboarding_pending)
- **EarningDetailService** — Heavy detail query. Joins `recruitment_job_prices` for the job bounty and `recruitment_candidate_connectors` (filtered to the current user) for `role` + `sharePercent`. Cross-checks `is_marketplace_deal` against `role` and logs a drift warning if they disagree

### Module Files
| File | Purpose |
|------|---------|
| `connector-earning.module.ts` | NestJS module, imported by `RecruitmentModule` |
| `connector-earning.controller.ts` | 3 routes: listing, stats, detail |
| `connector-earning.service.ts` | Thin orchestrator — delegates to sub-services |
| `connector-earning.dto.ts` | Query validation with class-validator |
| `connector-earning.constants.ts` | Status/sort enums, error + drift messages |
| `connector-earning.response.ts` | TypeScript response interfaces |
| `services/earning-list.service.ts` | Listing query with filters, pagination, sorting, shared-split detection |
| `services/earning-stats.service.ts` | Global stats aggregation (4 parallel sums) |
| `services/earning-detail.service.ts` | Detail query with pricing + candidate_connectors joins and timeline builder |

### Database Tables
| Table | Purpose |
|-------|---------|
| `recruitment_payout_history` | Primary table — one row per payout. Key fields: `recipient_id`, `payout_type`, `recipient_amount` (source of "You Earned"), `credits_applied`, `credits_remaining_after`, `processing_status`, `is_marketplace_deal`, `processing_started_at`, `processing_completed_at`, `error_message`, `retry_count` |
| `recruitment_jobs` | JOINed for job title and company name (list + detail) |
| `recruitment_job_candidates` | JOINed for the anonymous candidate label (list + detail) |
| `recruitment_job_prices` | JOINed (detail only) for the job's full bounty (`total_amount`) |
| `recruitment_candidate_connectors` | Detail query joins it filtered to `connector_user_id = currentUser` to pull `role` + `share_percent`. The list query only references it via a correlated `EXISTS` subquery for split detection |

### Security
- All queries filter by `recipient_id = currentUserId AND payout_type = 'connector'` — users can only ever see their own payouts, never another user's
- All queries include `deleted_at IS NULL` (soft delete filter)
- Detail endpoint returns 404 (not 403) on mismatch so valid payout ids cannot be enumerated
- `ParseUUIDPipe` validates the `:id` path parameter
- `limit` is capped at 50 in the DTO via `@Max(50)` to prevent DoS via oversized pages
- `search` is passed through Drizzle's parameterized `ilike()` — no raw SQL concatenation
- JWT auth guard protects all routes (global guard, no `@Public()`)

## Client — Connector Earning

### Components
| Component | Path | Purpose |
|-----------|------|---------|
| `ConnectorView` | `client/src/components/finance/recruitment/ConnectorView.tsx` | Main container: orchestrates stats, filters, table, and modal. Mirrors `RequesterView` |
| `ConnectorEarningStats` | `client/src/components/finance/recruitment/ConnectorEarningStats.tsx` | Two gradient stat cards: Total Earnings (with month-over-month delta computed on the client from `totalEarningsThisMonth` + `totalEarningsLastMonth`) and Pending Payouts |
| `ConnectorEarningFilters` | `client/src/components/finance/recruitment/ConnectorEarningFilters.tsx` | Search, status dropdown (including `Awaiting Setup` for onboarding_pending), date range picker |
| `ConnectorEarningTable` | `client/src/components/finance/recruitment/ConnectorEarningTable.tsx` | Sortable paginated table built on the shared `@/components/ui/table` primitives. Columns: Job (title + company), Candidate, You Earned (with inline violet credits chip when `creditsApplied > 0`), Status (status badge + optional violet "Shared Earning" pill below it), Date, Action |
| `ConnectorEarningModal` | `client/src/components/finance/recruitment/ConnectorEarningModal.tsx` | Detail dialog: header (job + company + candidate + status + "Shared Earning" pill), inline onboarding alert when `processingStatus === 'onboarding_pending'`, earning breakdown (Job Bounty → Platform Fee → Credits Applied when > 0 → Credit Balance Remaining when > 0 → You Earned), payout timeline, error message with retry count |

### Hooks
- `useConnectorEarning(filters, { enabled })` — Paginated listing query, lazy-loaded when the Connector Earnings tab is active
- `useConnectorEarningStats({ enabled })` — Global stats query, lazy-loaded
- `useConnectorEarningDetail(id)` — Single detail query, fires only when the modal opens (`enabled: !!id`)

### API Module
- `client/src/lib/api/connector-earning.ts` — Type definitions and `getDetail()` request function
- Listing and stats use React Query's default `queryFn` via `queryKey` pattern (same approach as `recruitment-spending`)

### Status + Color Conventions
Status badges pair a color family with an icon so color is never the sole indicator (per `.claude/rules/ux-design-system.md`):

| processingStatus | Label | Icon | Classes |
|------------------|-------|------|---------|
| `pending` | Pending | `Clock` | amber 500/15 + amber 700 |
| `onboarding_pending` | Awaiting Setup | `AlertCircle` | amber + tooltip "Complete your payout account to receive this payment." |
| `processing` | Processing | `Loader2` | blue 500/15 + blue 700 |
| `completed` | Paid | `CheckCircle2` | emerald 500/15 + emerald 700 |
| `failed` | Failed | `XCircle` | red 500/15 + red 700 |

Violet (financial color family) is reserved for two pieces of per-row financial metadata: the "Shared Earning" pill (when `isShared === true`) and the "– $X credit" chip (when `creditsApplied > 0`). Both share styling so they read as a coherent family.

## Design Decisions — Connector Earning

### Source Field for "You Earned"
The "You Earned" value and all amount aggregates use `recruitment_payout_history.recipient_amount`. This is the connector's actual net share of the payout after the platform cut. `commission_after_credits` is kept out of the aggregate totals so credits show up as a separate transparency line in the detail modal rather than silently reducing the headline number. Credits are still exposed on the list row via an inline chip and in the breakdown table in the modal.

### Lightweight List / Heavy Detail
The list endpoint joins only the two tables needed for display and search (`recruitment_jobs`, `recruitment_job_candidates`) and uses a correlated `EXISTS` subquery for shared-split detection. Pricing, credit balances, and the current user's role + share percent are deferred to the detail endpoint. This keeps the listing cheap at scale — the `EXISTS` rides the existing `idx_recruitment_candidate_connectors_candidate_id` index, so it's a single index lookup per row.

### Shared Earning Detection with Cross-Check
`is_marketplace_deal` on `recruitment_payout_history` is the primary flag, but `recruitment_candidate_connectors` is the authoritative source (it stores role + share percent and enforces the sharer/claimer model). The list `EXISTS` subquery combines them with OR so we're correct even if one field has drifted. The detail endpoint logs a `SPLIT_DRIFT` warning whenever the two disagree, so we can spot and fix data issues.

### Month-over-Month Delta
Computed on the frontend from `totalEarningsThisMonth` and `totalEarningsLastMonth`. Edge cases handled explicitly: both zero → "No change vs last month"; last month zero but this month > 0 → "New earnings this month" (avoids rendering "Infinity%"); otherwise a signed percentage.

### Onboarding Pending UX
Payouts stuck on `processing_status = 'onboarding_pending'` render an amber "Awaiting Setup" badge with a tooltip ("Complete your payout account to receive this payment."). The detail modal also shows an inline amber alert with the same copy so the blocker is visible both on the list and in the detail view.

### Authorization Posture
`recipient_id` is always `req.user.id`, never accepted from the client. Returning 404 on detail-id mismatches (rather than 403) prevents attackers from distinguishing between "exists but not yours" and "does not exist", avoiding id enumeration.

## Business Logic — Connector Earning
- **Processing statuses:** `pending` → `processing` → `completed` or `failed`. `onboarding_pending` is a special pre-processing state that blocks the payout until the recipient finishes Stripe onboarding
- **Total Earnings** = SUM of `recipient_amount` where `processing_status = 'completed'` (lifetime)
- **Total Earnings This Month** = same, additionally filtered to `created_at >= startOfThisMonth`
- **Total Earnings Last Month** = same, filtered to `created_at BETWEEN startOfLastMonth AND endOfLastMonth` (frontend uses it to compute the month-over-month delta)
- **Pending Payouts** = SUM of `recipient_amount` where `processing_status IN ('pending', 'processing', 'onboarding_pending')`
- **Credits** = `credits_applied` is the amount of platform credits consumed against this payout; `credits_remaining_after` is the user's remaining credit balance immediately after this row was written. Both are shown in the detail modal; only `credits_applied` surfaces on the list row (inline chip when > 0)
- **Month boundaries** use `utcDayjs()` — never `new Date()` — so results are stable across deployments regardless of server-local timezone

---

## Future Work
- **Export functionality** — CSV/PDF export of spending and earning records
- **Email notifications** — Notify requester on payment capture/cancellation and connector on payout completion
- **Stripe onboarding CTA** — Wire the onboarding alert on Connector Earning to a direct "Set up payouts" action linking into the existing Stripe Connect onboarding flow

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-11 | Initial implementation — Requester Spending module with listing, stats, detail APIs, and full frontend | Claude |
| 1.1 | 2026-04-11 | Split service into sub-services (spending-list, spending-stats, spending-detail). Added company name as separate table column. Colored fee breakdown and timeline icons in modal. Fixed currency formatting (show decimals). | Claude |
| 1.2 | 2026-04-15 | Added Connector Earning module (backend + frontend). Mirrors Requester Spending structure. Lightweight list + heavy detail split, correlated `EXISTS` for shared-split detection with `recruitment_candidate_connectors` cross-check, month-over-month delta stat, credits-applied chip on list row, onboarding_pending status with tooltip + modal alert. "You Earned" sourced from `recipient_amount`. Removed connector mock data. | Claude |
| 1.3 | 2026-08-03 | Requester Spending now surfaces `success_fee` and `success_fee_topup` (previously excluded) so recruiters see their full spend. Consolidated the per-service transaction-type allowlists into one shared `REQUESTER_SPENDING_TXN_TYPES` constant used by the list, stats, and detail services; success-fee amounts roll into the Total Spent / Upcoming / This Month totals. Detail fee breakdown now built only for `interview_cost`. Added "Success Fee" / "Success Fee Top-up" badges on the table and detail modal. | Claude |
