# Feature: Subscriptions

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-06-16

## Overview
The Subscriptions feature manages user subscription plans, billing, and payment processing through Stripe. Users can view available plans, manage their current subscription, access the Stripe billing portal, and view transaction history. The system stays synchronized with Stripe via webhooks.

## Server Module
**Path:** `server/src/modules/subscriptions/`, `server/src/modules/stripe/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /subscriptions/plans | JWT | Fetch all active subscription plans with pricing details |
| GET | /subscriptions/current | JWT | Get the current user's active subscription |
| POST | /subscriptions/portal | JWT | Create a Stripe billing portal session for subscription management |
| POST | /subscriptions/upgrade-portal | JWT | Create a Stripe billing portal session pre-configured for plan upgrade |
| POST | /subscriptions/sync | JWT | Manually trigger a sync of the user's subscription state with Stripe |
| GET | /subscriptions/history | JWT | Get the user's subscription transaction history |

### Database Tables
| Table | Purpose |
|-------|---------|
| subscription_plan | Defines available subscription plans (name, features, limits) |
| subscription_plan_price | Stores pricing tiers for each plan (monthly, annual, etc.) |
| user_subscription | Tracks each user's active subscription and its Stripe metadata |
| subscription_transactions | Records all subscription-related transactions (payments, refunds, upgrades) |

## Client
### Pages
N/A (subscription management is accessed via modals, settings, and the Stripe billing portal)

### Hooks
N/A (API calls are made directly via the subscriptions API module)

### Client API
- `subscriptions.ts` — API service module for all subscription-related operations

## External Integrations
- **Stripe** — Subscription lifecycle management (create, update, cancel), billing portal, webhook events for real-time sync

## Business Logic
- **Plan management:** Available plans and their pricing are stored in `subscription_plan` and `subscription_plan_price`. Plans include feature flags and usage limits.
- **Subscription lifecycle:** Users can subscribe, upgrade, downgrade, or cancel through the Stripe billing portal. The `user_subscription` table is updated to reflect the current state.
- **Plan-change emails:** On `customer.subscription.updated`, a higher-priced plan triggers the upgrade email (`subscription_upgrade`); a lower-priced plan triggers the downgrade email (`subscription_downgrade`). Same-price or unknown-price changes do not send a plan-change email.
- **Billing portal:** The `/subscriptions/portal` and `/subscriptions/upgrade-portal` endpoints create Stripe billing portal sessions, redirecting users to Stripe's hosted UI for payment method and plan management.
- **Stripe webhook sync:** The `stripe` module processes incoming Stripe webhook events (e.g., `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`) to keep `user_subscription` and `subscription_transactions` in sync with Stripe's state.
- **Manual sync:** The `/subscriptions/sync` endpoint allows a user to manually trigger a re-sync if their subscription state appears stale.
- **Transaction history:** All payments, refunds, and plan changes are recorded in `subscription_transactions` and surfaced via the history endpoint.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.1 | 2026-06-16 | Document separate upgrade/downgrade plan-change emails via `customer.subscription.updated` | Claude Code |
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
