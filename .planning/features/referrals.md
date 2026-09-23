# Feature: Referral Program

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-02-06

## Overview
The Referral Program allows users to invite others to the platform and earn rewards based on referral progress. The system manages referral configuration, tracks invite delivery and signup progress, and distributes rewards (such as coupons) when milestones are reached.

## Server Module
**Path:** `server/src/modules/referrals/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /referrals/progress | JWT | Get the current user's referral progress and milestone status |
| POST | /referrals/invite | JWT | Send a referral invite to a contact |
| GET | /referrals/earned-coupons | JWT | List coupons earned through referral milestones |
| GET | /referrals/verified-contacts | JWT | List contacts who have signed up via the user's referral |
| POST | /referrals/portal-session | JWT | Create a Stripe portal session for referral reward management |

### Database Tables
| Table | Purpose |
|-------|---------|
| referral_configuration | Defines referral program rules, milestones, and reward tiers |
| referral_progress | Tracks each user's referral activity and milestone completion |
| referral_audit_log | Audit trail of all referral-related events (invites sent, signups, rewards issued) |

## Client
### Pages
- **Referrals** — Dedicated page for viewing referral progress, sending invites, and managing earned rewards

### Hooks
N/A (API calls are made directly via the referrals API module)

### Client API
- `referrals.ts` — API service module providing:
  - `getProgress()` — Fetch referral progress
  - `sendInvite()` — Send a referral invitation
  - `getEarnedCoupons()` — Retrieve earned coupon rewards
  - `getVerifiedContacts()` — List verified referred contacts
  - `createPortalSession()` — Create a Stripe billing portal session for reward management

## External Integrations
- **Stripe** — Portal session creation for coupon/reward management

## Business Logic
- **Referral program management:** The program rules (milestones, reward amounts, eligibility criteria) are defined in `referral_configuration` and can be updated by administrators.
- **Invite tracking:** When a user sends an invite, it is recorded in `referral_progress` and logged in `referral_audit_log`. The system tracks whether the invite was delivered and whether the recipient signed up.
- **Progress rewards:** As referred contacts sign up and complete onboarding, the referring user's progress is updated. When milestones are reached, rewards (coupons) are automatically issued.
- **Audit logging:** Every referral event (invite sent, contact verified, reward issued) is recorded in `referral_audit_log` for compliance and debugging.

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
