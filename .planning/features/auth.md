# Feature: Authentication & Authorization

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-02-06

## Overview
Handles user authentication via OAuth providers (Google, Microsoft), JWT-based session management with httpOnly cookies, CSRF protection, and invite-based signup. New users are provisioned with a Stripe customer on first sign-up.

## Server Module
**Path:** `server/src/modules/auth/`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /auth/me | Yes | Return the currently authenticated user profile |
| POST | /auth/refresh | Public, Throttled | Rotate the refresh token and issue a new access token |
| GET | /auth/google | Public, Throttled | Initiate Google OAuth sign-in flow |
| GET | /auth/google/callback | Public | Handle Google OAuth callback and issue tokens |
| GET | /auth/microsoft | Public, Throttled | Initiate Microsoft OAuth sign-in flow |
| GET | /auth/microsoft/callback | Public | Handle Microsoft OAuth callback and issue tokens |
| GET | /auth/google-contacts/callback | Public | Handle Google Contacts OAuth callback for contact import permissions |
| POST | /auth/logout | Public | Clear auth cookies and invalidate the refresh token |

### Key Services
- **AuthService** -- Orchestrates OAuth flows, creates/updates user records, issues JWT access and refresh tokens, handles token rotation and revocation.
- **JwtStrategy** -- Passport strategy that validates JWT from httpOnly cookies and attaches the user to the request.

### Database Tables
| Table | Purpose |
|-------|---------|
| users | Core user records including profile info, OAuth provider IDs, Stripe customer ID, and account status |
| refresh_tokens | Stores hashed refresh tokens with expiry for token rotation and revocation |

## Client
### Pages
- **SignIn** -- `client/src/pages/SignIn.tsx` -- Landing page with Google and Microsoft OAuth sign-in buttons
- **AuthCallback** -- `client/src/pages/AuthCallback.tsx` -- Handles OAuth redirect, exchanges code, and redirects authenticated users
- **AcceptInvite** -- `client/src/pages/AcceptInvite.tsx` -- Invite-only signup flow where a new user accepts a team or referral invitation

### Hooks
- `useAuth()` -- Provides login/logout actions and current authentication state
- `useCurrentUser()` -- Fetches and caches the authenticated user profile via GET /auth/me
- `useAuthGuard()` -- Route-level guard that redirects unauthenticated users to the sign-in page

### API Module
- `client/src/lib/api/core.ts` -- Central request handler that automatically injects CSRF tokens, retries on 401 with token refresh, and standardizes error responses

## External Integrations
- **Google OAuth** -- Used for user sign-in and Google Contacts import consent
- **Microsoft OAuth** -- Used for user sign-in via Microsoft accounts
- **Stripe** -- A Stripe customer is created for every new user at signup to enable future payment flows

## Business Logic
- OAuth sign-in creates a new user record on first login or matches an existing user by email/provider ID
- JWT access tokens (short-lived) and refresh tokens (long-lived) are issued as httpOnly, secure, SameSite cookies
- CSRF protection uses the double-submit cookie pattern; the client sends the token via the `X-CSRF-Token` header on mutating requests
- Invite-based signup requires a valid invite code; the inviting user receives credit upon successful signup
- Token rotation: on each refresh, the old refresh token is invalidated and a new one is issued, preventing replay attacks
- Rate limiting (throttle) is applied to public auth endpoints to prevent brute-force and abuse

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-06 | Initial documentation | Claude Code |
