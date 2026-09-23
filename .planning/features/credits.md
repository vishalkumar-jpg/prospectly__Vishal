# Feature: Credits System

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-02-06

## Overview
The Credits System tracks earned credits from contact enrichment milestones, records credit usage for introduction requests, and calculates balance changes. Users earn credits through platform activity and spend them to unlock features such as introduction requests.

## Server Module
**Path:** `server/src/modules/credits/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /credits/me | JWT | Get the current user's credit balance |
| GET | /credits/rules | JWT | Get the rules governing credit earn/spend rates |
| GET | /credits/me/history | JWT | Get paginated credit history (max 100 per page) |

### Database Tables
| Table | Purpose |
|-------|---------|
| user_credit_awards | Records credits awarded to users from enrichment milestones and other activities |
| user_credit_history | Tracks every credit transaction (earn and spend) for audit and display |
| credit_rules | Defines the rules for how credits are earned and spent |

## Client
### Pages
N/A (credits information is surfaced within other pages)

### Hooks
- `useUserCredits()` — Fetches the current user's credit balance and history

## External Integrations
None. Credits are an internal accounting system.

## Business Logic
- **Earning credits:** Users earn credits when contact enrichment milestones are reached. Awards are recorded in `user_credit_awards` and reflected in `user_credit_history`.
- **Spending credits:** Credits are deducted when users make introduction requests. Each spend is logged in `user_credit_history`.
- **Balance calculation:** The user's current balance is derived from the sum of all credit transactions (awards minus spends) in `user_credit_history`.
- **Pagination:** The history endpoint supports pagination with a maximum of 100 records per page.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
