# Feature: Onboarding

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-02-06

## Overview
Onboarding guides new users through a 4-step flow after signing up via invitation. The process sets up their profile, connects a calendar, imports contacts, and completes verification. The server-side onboarding service orchestrates user creation, Stripe customer provisioning, subscription setup, and initial data imports.

## Server Module
**Path:** `server/src/modules/onboarding/`

**Note:** This is an internal service module with no direct HTTP routes. It is consumed by other modules (e.g., auth, calendar, contacts) during the signup and setup process.

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| N/A | N/A | N/A | No direct routes; logic is invoked internally by other modules |

### Database Tables
| Table | Purpose |
|-------|---------|
| users | Core user profile data (name, email, OAuth provider info, onboarding status) |
| user_subscription | Tracks the subscription provisioned during onboarding |
| organisation_member | Links the user to their organization upon signup |
| contacts_provider_tokens | Stores OAuth tokens for contact import providers (Google, Microsoft) |
| contacts_imports | Records contact import jobs initiated during onboarding |

## Client
### Pages
- **GettingStarted** — Onboarding landing page and flow orchestrator
- **GettingStartedStep1** — Profile setup (name, avatar, preferences)
- **GettingStartedStep2** — Calendar integration (connect Google or Microsoft calendar)
- **GettingStartedStep3** — Contact import (authorize and import contacts from a provider)
- **GettingStartedStep4** — Verification and completion (confirm setup, finalize account)

### Hooks
N/A (onboarding steps use hooks from related features: calendar, contacts, auth)

## External Integrations
- **Stripe** — Customer creation and initial subscription provisioning during signup
- **Google Calendar API / Microsoft Graph** — Calendar connection during Step 2
- **Google People API / Microsoft Graph (Contacts)** — Contact import during Step 3

## Business Logic
- **Invite-based signup:** Users can only onboard via an invitation. The onboarding service validates the invite token and associates the new user with the inviting organization.
- **User profile creation:** The service creates the user record with data from the OAuth provider (Google or Microsoft), populating name, email, and avatar.
- **Stripe customer setup:** A Stripe customer is created for the user immediately upon signup, enabling future subscription and billing operations.
- **Subscription provisioning:** A default subscription plan is assigned to the user during onboarding, recorded in `user_subscription`.
- **Contact import initiation:** During Step 3, the user authorizes a contacts provider. OAuth tokens are stored in `contacts_provider_tokens`, and an import job is created in `contacts_imports` to be processed by the background worker.
- **Calendar integration:** During Step 2, the user connects a calendar provider. This delegates to the calendar module for OAuth flow and token storage.
- **4-step flow:**
  1. **Profile setup** — User reviews and completes their profile information
  2. **Calendar integration** — User connects Google or Microsoft calendar
  3. **Contact import** — User authorizes and imports contacts from a provider
  4. **Verification** — User confirms setup and the account is fully activated

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
