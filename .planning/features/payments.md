# Feature: Payments & Finances

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-02-06

## Overview
Manages the financial lifecycle of introductions including payment intent creation, bounty capture, connector payouts via Stripe Connect, and refund handling. Also provides financial dashboards with charts and transaction history.

## Server Module
**Path:** `server/src/modules/payments/`, `server/src/modules/bounty-stages/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /payments/create-intent | Yes | Create a Stripe Payment Intent for an introduction bounty |
| POST | /payments/capture/:requestId | Yes | Capture the authorized payment after introduction fulfillment |
| POST | /payments/payout/:requestId | Yes | Disburse the bounty to the connector via Stripe Connect |
| GET | /payments/methods | Yes | List saved payment methods for the current user |
| GET | /payments/history | Yes | Retrieve payout history for the current user |
| POST | /payments/refund/:requestId | Yes | Initiate a refund for a captured payment |
| GET | /payments/transactions | Yes | List transaction history with filters and pagination |
| GET | /payments/charts | Yes | Retrieve aggregated financial data for dashboard charts |
| GET | /payments/disputes | Yes | List payment disputes for the current user |

### Key Services
- **PaymentsService** -- Orchestrates Stripe Payment Intents, captures, refunds, and payout disbursement via Stripe Connect
- **BountyStagesService** -- Manages bounty stage progression tied to introduction lifecycle milestones (request created, accepted, intro sent, meeting completed)

### Database Tables
| Table | Purpose |
|-------|---------|
| payment_stages | Tracks the payment status at each stage of the introduction lifecycle |
| payment_refunds | Records refund requests, amounts, Stripe refund IDs, and processing status |
| bounty_stages | Defines bounty amounts allocated to each introduction milestone stage |
| introduction_transactions | Links financial transactions to specific introduction requests with amounts, types, and timestamps |

## Client
### Pages
- **FinancesNew** -- `client/src/pages/FinancesNew.tsx` -- Financial dashboard with payment methods, transaction history, payout summary, charts, and dispute management

### Hooks
- `usePaymentMethods()` -- Fetches and manages the user's saved Stripe payment methods
- `usePayoutHistory()` -- Fetches the user's payout history with pagination and date filters
- `usePrimaryPaymentMethod()` -- Returns the user's default payment method for quick checkout
- `useFinancialCharts()` -- Fetches aggregated financial data formatted for dashboard chart rendering
- `useTransactionHistory()` -- Fetches paginated transaction history with type and date range filters
- `useDisputes()` -- Fetches and manages payment disputes raised by users

### API Module
- `client/src/lib/api/payments.ts` -- Payment intent creation, capture, payout, refund, and financial data retrieval

## External Integrations
- **Stripe Payment Intents** -- Creates and captures payment authorizations for introduction bounties
- **Stripe Connect** -- Handles payouts to connectors who have linked Stripe Connect accounts for receiving bounty earnings

## Business Logic
- Payment intents are created when a requester commits to an introduction request with a bounty; funds are authorized but not captured immediately
- Capture occurs only after the introduction is fulfilled (meeting completed), ensuring the requester is not charged for unfulfilled requests
- Bounty stages define how the total bounty is allocated across introduction milestones, allowing partial payouts at each stage
- Payouts to connectors are processed via Stripe Connect; connectors must have a linked Stripe Connect account to receive funds
- Refunds can be initiated if an introduction fails or is cancelled before completion; partial refunds are supported based on the stage reached
- Transaction history provides a unified view of all financial activity (payments, payouts, refunds) for auditing and user visibility
- Financial charts aggregate transaction data over time for dashboard visualizations (earnings trends, payout summaries)
- Dispute management allows users to flag and resolve payment disagreements

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
