# PR: Microsoft Social Login Implementation

## Summary

This PR adds Microsoft OAuth 2.0 social login functionality, mirroring the existing Google login behavior. Users can now sign in with their Microsoft account, which will:

- Create/update their user profile
- Automatically sync Microsoft contacts in the background (for new users)
- Connect Microsoft Calendar with Teams meeting support (for new users)
- Create a Stripe customer record (for new users)

## Changes

### Backend

#### Configuration (`server/src/config/oauth.config.ts`)
- Added `redirectUri` for Microsoft login callback
- Added `loginScopes` for Microsoft OAuth:
  - `openid`, `email`, `profile` - User identification
  - `User.Read` - Microsoft Graph API profile access
  - `offline_access` - Refresh token support
  - `Contacts.Read` - Contacts import
  - `Calendars.ReadWrite` - Calendar access with Teams meetings

#### Auth Types (`server/src/modules/auth/auth.types.ts`)
- Added `LoginMicrosoftUser` interface
- Added `CreateNewMicrosoftContactsImport` interface
- Added `HandleMicrosoftCalendarConnection` interface

#### Auth Constants (`server/src/modules/auth/auth.constants.ts`)
- Added Microsoft-specific error messages:
  - `MICROSOFT_OAUTH_NOT_CONFIGURED`
  - `MICROSOFT_ACCOUNT_DOES_NOT_HAVE_A_VALID_EMAIL`
  - `NO_ACCESS_TOKEN_RECEIVED_FROM_MICROSOFT`
  - `FAILED_TO_EXCHANGE_MICROSOFT_CODE`
  - `FAILED_TO_FETCH_MICROSOFT_USER_PROFILE`
  - `FAILED_TO_CONNECT_MICROSOFT_CALENDAR`
  - `FAILED_TO_QUEUE_MICROSOFT_CONTACTS`

#### Auth Service (`server/src/modules/auth/auth.service.ts`)
- Injected `MicrosoftContactsQueueService`
- Added `loginWithMicrosoft()` - Main login method
- Added `setupMicrosoftServicesForNewUser()` - Setup Stripe, Calendar, Contacts for new users
- Added `handleMicrosoftCalendarConnection()` - Connect Microsoft Calendar with Teams support
- Added `createNewMicrosoftContactsImport()` - Create token record and queue import job

#### Auth Controller (`server/src/modules/auth/auth.controller.ts`)
- Added `GET /auth/microsoft` - Initiate Microsoft OAuth flow
- Added `GET /auth/microsoft/callback` - Handle Microsoft OAuth callback
  - Exchange authorization code for tokens
  - Fetch user profile from Microsoft Graph API
  - Fetch profile photo (optional)
  - Check granted scopes for contacts and calendar
  - Create/update user profile
  - Setup background services for new users
  - Set auth cookies and redirect

### Frontend

#### SignIn Page (`client/src/pages/SignIn.tsx`)
- Added separate loading states for Google and Microsoft sign-in
- Added "Continue with Microsoft" button with official Microsoft logo
- Styled to match the existing design

#### OAuthDivider Component (`client/src/components/OAuthDivider.tsx`)
- Added Microsoft sign-in button alongside Google button

## Flow Diagram

```
User clicks "Sign in with Microsoft"
       │
       ▼
GET /auth/microsoft
       │
       ▼
Redirect to Microsoft OAuth with loginScopes
       │
       ▼
User grants permissions
       │
       ▼
GET /auth/microsoft/callback?code=xxx
       │
       ▼
Exchange code for tokens
       │
       ▼
Fetch user profile from Graph API /me
       │
       ▼
┌─────────────────────────────────────┐
│          Is New User?               │
└─────────────────────────────────────┘
       │                    │
      Yes                   No
       │                    │
       ▼                    │
Setup Services:             │
• Stripe Customer           │
• Microsoft Calendar        │
• Microsoft Contacts Import │
       │                    │
       └────────┬───────────┘
                │
                ▼
       Generate JWT tokens
                │
                ▼
       Set auth cookies
                │
                ▼
       Redirect to dashboard/getting-started
```

## Environment Variables

No new environment variables required. Uses existing:
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

## Azure Portal Configuration Required

Add this redirect URI in Azure AD app registration:

**Production:**
- `https://your-api-domain.com/auth/microsoft/callback`

**Development:**
- `http://localhost:3000/auth/microsoft/callback`

## Testing Checklist

- [ ] Click "Continue with Microsoft" on sign-in page
- [ ] Microsoft consent screen shows with correct scopes
- [ ] New user is created with correct profile data (name, email, photo)
- [ ] New user's Microsoft contacts import is queued
- [ ] New user's Microsoft calendar is connected
- [ ] New user's Stripe customer is created
- [ ] Existing user can sign in and is redirected appropriately
- [ ] Auth cookies are set correctly
- [ ] Redirect to getting-started for incomplete imports
- [ ] Redirect to dashboard for completed imports

## Related Documentation

- [Microsoft OAuth 2.0 Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/overview)
