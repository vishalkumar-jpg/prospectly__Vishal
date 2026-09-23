# User Invite Referral System with Subscription Management - Implementation Guide

## Overview

This document provides a comprehensive guide to the implemented User Invite Referral System with Subscription Management. The system enables secure invite acceptance, referral tracking, subscription management via Stripe Customer Portal, and comprehensive fraud prevention mechanisms.

## Architecture

### System Components

1. **Backend Services**
   - Invite Service: Token validation, email matching, duplicate prevention
   - Onboarding Service: Complete invite signup flow with subscription creation
   - Referral Service: Progress tracking, contact verification, threshold checking
   - Verification Service: Fraud detection, rate limiting, audit logging
   - Subscription Service: Plan management, history tracking, access validation
   - Stripe Service: Customer Portal integration, subscription management
   - Webhook Service: Subscription lifecycle event handling

2. **Queue System**
   - Referral Queue: Background processing for progress updates, contact verification, threshold checks

3. **Database Tables**
   - `user_subscription` (extended): Added invite_id, coupon_applied, trial_end, metadata
   - `subscription_transactions`: Audit trail for subscription changes
   - `invite_verification_logs`: Fraud prevention and verification tracking
   - `referral_audit_log`: Complete audit trail for referral actions
   - `user_invites` (reference): Created by admin repo
   - `referral_progress` (reference): Created by admin repo

## Functional Flows

### 1. Invite Acceptance Flow

#### Flow Diagram

```
User clicks invite link
    ↓
GET /invites/:token (validate token)
    ↓
Display invite details (plan, email)
    ↓
User clicks "Continue with Google"
    ↓
Redirect to /api/auth/google?invite_token=xxx
    ↓
Google OAuth flow (with invite_token in state)
    ↓
OAuth callback: /api/auth/google/callback?code=xxx&state=invite_token=xxx
    ↓
Backend extracts invite_token from state
    ↓
Validate email match (case-insensitive)
    ↓
If match:
    - Create user profile
    - Create Stripe customer (synchronously)
    - Accept invite
    - Create subscription directly with coupon
    - Add to organisation (if org invite)
    ↓
Redirect to /accept-invite/:token?invite_accepted=true&subscription_created=true
    ↓
Frontend shows success message
    ↓
User can click "Manage Subscription" → Stripe Customer Portal
```

#### Step-by-Step Implementation

**Step 1: User Visits Invite Link**

- URL: `/accept-invite/:token`
- Frontend fetches invite details via `GET /api/invites/:token`
- Displays invite information (plan name, invited email, description)

**Step 2: Email Validation**

- If user is already signed in, validates email match
- If email doesn't match: Shows error modal with options
- If email matches: Proceeds to acceptance

**Step 3: Google OAuth Signup**

- User clicks "Continue with Google"
- Redirects to `/api/auth/google?invite_token=xxx`
- Backend includes invite_token in OAuth state parameter
- Google OAuth flow completes

**Step 4: OAuth Callback Processing**

- Backend receives callback with code and state
- Extracts invite_token from state parameter
- Validates invite token and checks eligibility
- Validates email match (case-insensitive, trimmed)
- If eligible: Proceeds with invite signup

**Step 5: User Creation**

```typescript
// OnboardingService.handleInviteSignup()
1. Validate invite and email match
2. Create user profile (if doesn't exist)
3. Create Stripe customer synchronously (needed immediately)
4. Update user profile with Stripe customer ID
5. Accept invite (update status to ACCEPTED)
```

**Step 6: Subscription Creation**

```typescript
// OnboardingService.createSubscriptionForInvite()
1. Get plan from subscription_plan table
2. Get price (default to yearly)
3. Create subscription via Stripe API with metadata:
   - invite_id
   - invite_type
   - organisation_id
   - user_id
4. Apply coupon if exists (via Stripe API)
5. Return subscription object
```

**Step 7: Webhook Processing**

- Stripe sends `customer.subscription.created` webhook
- Backend webhook handler:
  - Creates `user_subscription` record
  - Links to invite via `invite_id`
  - Extracts coupon from subscription.discounts
  - Creates `subscription_transaction` record
  - Updates referral progress (if user referral)

**Step 8: Success Display**

- Frontend shows success message
- Displays subscription status
- Provides "Go to Dashboard" button
- Provides "Manage Subscription" button (redirects to Customer Portal)

### 2. Subscription Management Flow (Stripe Customer Portal)

#### Flow Diagram

```
User clicks "Manage Subscription"
    ↓
POST /api/subscriptions/portal (with returnUrl)
    ↓
Backend creates Stripe Customer Portal session
    ↓
Returns portal URL
    ↓
Frontend redirects to Stripe Portal
    ↓
User manages subscription in Stripe Portal:
    - Upgrade/downgrade plan
    - Cancel subscription
    - Resume subscription
    - Update payment method
    - View invoices
    ↓
Stripe sends webhooks for all changes:
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_succeeded
    - invoice.payment_failed
    ↓
Backend webhook handlers update database
    ↓
User returns to app via returnUrl
```

#### Webhook Handlers

**customer.subscription.updated**

- Handles: upgrades, downgrades, cancellations, resumptions, renewals
- Updates `user_subscription`:
  - status
  - current_period_start/end
  - cancel_at_period_end
  - canceled_at
  - subscription_plan_id (if plan changed)
- Creates `subscription_transaction` record with appropriate type

**customer.subscription.deleted**

- Updates `user_subscription` status to 'canceled'
- Sets `canceled_at` timestamp
- Creates transaction record

**invoice.payment_succeeded**

- Updates subscription period dates
- Creates transaction record with type 'renewed'
- If first payment for invite: Updates referral progress

**invoice.payment_failed**

- Updates subscription status to 'past_due'
- Creates transaction record
- Can trigger notifications (if implemented)

### 3. Referral System Flow

#### Flow Diagram

```
User navigates to /dashboard/referrals
    ↓
Frontend fetches:
    - GET /api/referrals/progress
    - GET /api/referrals/earned-coupons
    - GET /api/subscriptions/plans
    ↓
Display referral dashboard:
    - Invites sent/accepted stats
    - Earned coupons
    - Plan-specific progress
    ↓
User fills invite form:
    - Email address
    - Subscription plan
    - Organisation ID (optional)
    ↓
POST /api/referrals/invite
    ↓
Backend validates:
    - User has active subscription for plan
    - No duplicate invite exists
    - Rate limits not exceeded
    ↓
Log referral action (audit log)
    ↓
Return success (actual invite creation handled by admin repo)
    ↓
When invite is accepted:
    - Queue job: update-referral-progress
    - Queue job: verify-contacts
    - Queue job: check-thresholds
    ↓
Background processing:
    - Update referral_progress.totalInvitesAccepted
    - Calculate verified contacts
    - Check if threshold met
    - Award coupon if threshold met
```

#### Contact Verification

**Runtime Calculation**

```typescript
// ReferralsService.calculateVerifiedContacts()
1. Get user's accepted invites for the plan
2. Extract invite emails (normalized)
3. Get user's imported contacts
4. Match contacts with invite emails (case-insensitive)
5. Return count of verified contacts
```

**Threshold Checking**

- Gets verified contacts count
- Compares with threshold (from referral_configuration table)
- If threshold met: Awards coupon (handled by admin repo or queue job)

### 4. Fraud Prevention Flow

#### Email Matching

```typescript
// InvitesService.validateEmailMatch()
1. Normalize both emails: toLowerCase().trim()
2. Compare normalized values
3. Return match result with normalized values
```

#### Duplicate Prevention

```typescript
// InvitesService.checkDuplicateAcceptance()
1. Query user_invites for email with status ACCEPTED
2. If found: Return hasAccepted = true
3. Prevent acceptance if duplicate found
```

#### Fraud Signal Detection

```typescript
// VerificationService.detectFraudSignals()
Checks for:
1. Multiple acceptances from same IP (within 24 hours)
2. Rapid acceptance rate (user accepting >5 invites/hour)
3. Disposable email domains
4. Suspicious patterns

Returns array of fraud signals
```

#### Rate Limiting

```typescript
// VerificationService.checkRateLimits()
1. Query referral_audit_log for user and action type
2. Count actions within last hour
3. Compare with limit (default: 10 invites/hour)
4. Return allowed status and remaining count
```

### 5. Queue Processing Flow

#### Queue Jobs

**update-referral-progress**

- Triggered: When invite is accepted
- Action: Updates `referral_progress.totalInvitesAccepted`
- Logs: Referral action in audit log

**verify-contacts**

- Triggered: After contact import or invite acceptance
- Action: Calculates verified contacts count
- Purpose: Track progress toward threshold

**check-thresholds**

- Triggered: After contact verification or invite acceptance
- Action: Checks if threshold met for plan
- If met: Awards coupon (via admin repo or direct update)

**send-invite-email**

- Triggered: When user sends referral invite
- Action: Email sending handled by admin repo
- Purpose: Tracking and logging

### 6. Fresh Signup vs Invite Flow

#### Fresh Signup (Non-Invited Users)

```
User visits /signin
    ↓
Clicks "Continue with Google"
    ↓
Google OAuth flow (no invite_token)
    ↓
OAuth callback: /api/auth/google/callback?code=xxx
    ↓
AuthService.loginWithGoogle() (existing method - NOT modified)
    ↓
Creates user profile (if doesn't exist)
    ↓
Queues Stripe customer creation
    ↓
StripeQueueProcessor.assignFreePlanToUser()
    ↓
Assigns default plan (free plan)
    ↓
Redirects to /dashboard
```

**Key Points:**
- Uses existing `loginWithGoogle()` method
- No subscription creation during signup
- Free plan assigned via queue processor
- No invite-related logic

#### Invite Flow (Invited Users)

```
User visits /accept-invite/:token
    ↓
Clicks "Continue with Google"
    ↓
Google OAuth with invite_token
    ↓
OAuth callback with invite_token in state
    ↓
OnboardingService.handleInviteSignup() (NEW method)
    ↓
Validates invite and email match
    ↓
Creates user profile
    ↓
Creates Stripe customer synchronously
    ↓
Accepts invite
    ↓
Creates subscription directly with coupon
    ↓
Redirects to success page
```

**Key Points:**
- Separate flow from fresh signup
- Subscription created immediately (not via queue)
- Coupon applied automatically
- Can result in paid plan subscription

## API Endpoints

### Public Endpoints

**GET /api/invites/:token**
- Returns invite details (plan, email, status)
- No authentication required
- Used for initial invite validation

**POST /api/invites/:token/validate**
- Validates invite eligibility with email
- No authentication required
- Returns eligible status and reason if not eligible

### Authenticated Endpoints

**POST /api/invites/:token/accept**
- Accepts invite (after OAuth signup)
- Requires authentication
- Can include googleUser object for complete signup flow

**GET /api/referrals/progress**
- Returns user's referral progress
- Requires authentication
- Returns: totalInvitesSent, totalInvitesAccepted, earnedCoupons

**POST /api/referrals/invite**
- Sends referral invite
- Requires authentication
- Body: { email, planId, organisationId? }
- Validates user can invite for plan

**GET /api/referrals/earned-coupons**
- Returns earned coupons array
- Requires authentication

**GET /api/referrals/verified-contacts/:planId**
- Returns verified contacts count for plan
- Requires authentication

**POST /api/subscriptions/portal**
- Creates Stripe Customer Portal session
- Requires authentication
- Body: { returnUrl }
- Returns: { url }

**GET /api/subscriptions/history**
- Returns subscription transaction history
- Requires authentication
- Returns array of transactions with details

## Database Schema

### Extended Tables

**user_subscription**
- `invite_id` (bigint, nullable): FK to user_invites
- `coupon_applied` (text, nullable): Stripe coupon ID
- `trial_end` (timestamptz, nullable): Trial end date
- `metadata` (jsonb, default '{}'): Additional metadata

### New Tables

**subscription_transactions**
- Audit trail for all subscription changes
- Tracks: created, upgraded, downgraded, canceled, renewed, payment_failed
- Links to user, subscription, from_plan, to_plan

**invite_verification_logs**
- Tracks all verification attempts
- Records: email_match, contact_import, subscription_created
- Includes: IP address, user agent, fraud signals

**referral_audit_log**
- Complete audit trail for referral actions
- Tracks: invite_sent, invite_accepted, threshold_met, coupon_earned, coupon_used
- Links to user, invite, referral_progress, plan

## Security Features

### Email Validation
- Case-insensitive matching
- Trimmed whitespace
- Strict validation during OAuth signup

### Duplicate Prevention
- Prevents same email from accepting multiple invites
- Checks before invite acceptance

### Rate Limiting
- 10 invites per hour per user
- Tracks via referral_audit_log
- Returns remaining count

### Fraud Detection
- IP address tracking
- Rapid acceptance detection
- Disposable email domain detection
- All signals logged in invite_verification_logs

### Audit Logging
- All referral actions logged
- All verification attempts logged
- All subscription changes logged
- Complete trail for compliance

## Error Handling

### Invite Errors
- Invalid/expired token: 404 Not Found
- Email mismatch: Shows error modal with options
- Duplicate acceptance: Prevents acceptance
- Already accepted: Shows appropriate message

### Subscription Errors
- Plan not found: 404 Not Found
- Price not found: 404 Not Found
- Stripe API errors: Logged and returned to user
- Webhook processing errors: Logged, retried via queue

### Referral Errors
- Cannot invite for plan: 400 Bad Request
- Duplicate invite: 400 Bad Request
- Rate limit exceeded: 429 Too Many Requests

## Testing Considerations

### Unit Tests
- Service methods: InviteService, ReferralService, VerificationService
- Email validation logic
- Fraud detection algorithms
- Rate limiting logic

### Integration Tests
- Complete invite acceptance flow
- Subscription creation with coupon
- Webhook processing
- Queue job processing

### E2E Tests
- User clicks invite link → completes signup → subscription created
- User sends referral invite → invite accepted → progress updated
- User manages subscription via Customer Portal → webhooks update database

### Fraud Prevention Tests
- Email mismatch scenarios
- Duplicate acceptance attempts
- Rate limiting enforcement
- Fraud signal detection

## Configuration

### Environment Variables
- `STRIPE_SECRET_KEY`: Stripe API key
- `STRIPE_WEBHOOK_SECRET`: Webhook signature verification
- `DATABASE_URL`: PostgreSQL connection string
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

### Stripe Customer Portal Configuration
- Must be configured in Stripe Dashboard
- Set return URL to frontend dashboard
- Configure allowed features (upgrade, downgrade, cancel, etc.)

## Monitoring and Logging

### Key Metrics to Monitor
- Invite acceptance rate
- Subscription creation success rate
- Referral progress updates
- Queue job processing times
- Webhook processing success rate
- Fraud signal frequency

### Logging Points
- Invite validation attempts
- Email mismatch events
- Subscription creation (success/failure)
- Webhook processing (all events)
- Queue job processing
- Fraud signal detection

## Future Enhancements

### Potential Improvements
1. Email notifications for referral milestones
2. Referral leaderboard
3. Enhanced fraud detection with ML
4. Multi-currency support
5. Referral analytics dashboard
6. Automated coupon distribution
7. Organisation-level referral tracking

## Troubleshooting

### Common Issues

**Invite token not found**
- Check if token is valid and not expired
- Verify user_invites table exists (created by admin repo)
- Check token format matches expected pattern

**Email mismatch**
- Verify email normalization (case-insensitive, trimmed)
- Check if user is signed in with correct Google account
- Ensure invite email matches exactly (after normalization)

**Subscription not created**
- Check Stripe API credentials
- Verify plan and price exist in database
- Check webhook processing logs
- Verify Stripe customer was created

**Webhook not processing**
- Verify webhook secret is correct
- Check webhook endpoint is accessible
- Verify webhook signature validation
- Check webhook processing logs

**Referral progress not updating**
- Verify queue is running
- Check queue job processing logs
- Verify referral_progress table exists (created by admin repo)
- Check database connection

## Support and Maintenance

### Regular Maintenance Tasks
1. Monitor queue job failures
2. Review fraud signals and adjust thresholds
3. Clean up expired invites
4. Archive old audit logs
5. Monitor subscription webhook processing
6. Review rate limiting effectiveness

### Database Maintenance
- Index optimization for invite queries
- Partitioning for large audit log tables
- Archiving old verification logs
- Cleaning up failed queue jobs

