# Functional Flows & Business Logic

This document describes all major business flows in the Prospectly application.

---

## 1. Authentication Flow

Google/Microsoft OAuth -> JWT tokens (access 15min, refresh 7d) in httpOnly cookies -> CSRF double-submit -> global JwtAuthGuard

- User initiates OAuth with Google or Microsoft
- OAuth callback exchanges code for provider tokens
- Server creates or retrieves user record
- JWT access token (15-minute expiry) and refresh token (7-day expiry) are issued
- Tokens are set as httpOnly, secure, sameSite:strict cookies
- CSRF token is generated and returned for double-submit pattern
- All subsequent requests validated by global JwtAuthGuard
- On access token expiry, client automatically refreshes via refresh endpoint
- Refresh token rotation: old refresh token invalidated on use, new one issued

---

## 2. Onboarding Flow

OAuth signup -> 4-step onboarding (profile -> calendar -> contacts -> verification) -> Stripe customer creation -> subscription provisioning -> contact import initiation

- After first-time OAuth signup, user enters onboarding
- **Step 1 - Profile**: User completes profile information (name, company, role, etc.)
- **Step 2 - Calendar**: User connects Google or Microsoft Calendar via OAuth
- **Step 3 - Contacts**: User selects contact import source(s) (Google, Microsoft, Apple, LinkedIn, CSV)
- **Step 4 - Verification**: User verifies email and confirms details
- Stripe customer record is created for the user's organisation
- Subscription is provisioned (free tier or selected plan)
- Contact import is initiated as a background job via BullMQ

---

## 3. Contact Management Flow

Multi-source import (Google, Microsoft, Apple, LinkedIn ZIP, CSV) -> BullMQ queue processing -> Clay.com enrichment -> PII encryption in separate table -> duplicate detection

- User initiates contact import from one or more sources:
  - **Google Contacts**: OAuth-based access to Google People API
  - **Microsoft Contacts**: OAuth-based access to Microsoft Graph API
  - **Apple iCloud**: App-specific password authentication for iCloud Contacts
  - **LinkedIn ZIP**: User uploads exported LinkedIn connections ZIP file
  - **CSV**: User uploads a CSV file with contact data
- Import jobs are queued in BullMQ for background processing
- Each contact is processed: parsed, normalized, and validated
- Clay.com enrichment API is called to enrich contact data (company, role, social profiles, etc.)
- PII (personally identifiable information) is stored in a separate encrypted table with hash indexing
- Duplicate detection runs to merge or flag duplicate contacts
- Import progress is tracked and reported to the client via polling or context updates

---

## 4. Introduction Request Flow

Requester searches contacts -> creates request with bounty -> potential connectors notified -> connector accepts -> sends introduction email -> prospect books meeting -> meeting completed -> feedback collected -> bounty released

- **Request Creation**: User searches the contact network, identifies a target prospect, and creates an introduction request with a bounty amount
- **Notification**: Users who have a connection to the prospect are notified of the request
- **Acceptance**: A connector (someone who knows the prospect) reviews and accepts the request
- **Introduction**: The connector sends a double-opt-in introduction email to the prospect
- **Meeting Booking**: The prospect books a meeting with the requester via calendar integration
- **Meeting Completion**: The system tracks whether the meeting was completed
- **Feedback**: Both parties provide feedback on the introduction quality
- **Bounty Release**: Upon successful completion and feedback, the bounty is released to the connector's Stripe Connect account

---

## 5. Marketplace Flow

User shares introduction request on marketplace -> public listing with sharerCode -> another user claims -> claim verification (multi-step) -> introduction made -> payout split

- A user with an active introduction request can share it on the marketplace
- The listing is made public with a unique `sharerCode` for tracking
- Other users browse the marketplace and find requests they can fulfill
- A user claims the request, asserting they can make the introduction
- **Claim Verification** (multi-step):
  - User confirms they know the prospect
  - User provides evidence of connection
  - System validates the claim
- Once verified, the claimer makes the introduction
- Upon successful completion, the payout is split between relevant parties
- The `sharerCode` ensures proper attribution for marketplace referrals

---

## 6. Payment Flow

Stripe payment intent created -> payment captured on acceptance -> bounty staged -> payout to Stripe Connect account -> refund handling for disputes

- When an introduction request is created, a Stripe payment intent is created for the bounty amount
- Payment is captured when a connector accepts the request
- The bounty amount is staged (held) pending introduction completion
- Upon successful introduction and meeting completion, payout is initiated to the connector's Stripe Connect account
- If a dispute arises or the introduction fails, refund handling processes the return of funds
- All payment events are tracked via Stripe webhooks for reliability

---

## 7. Trust Score Flow

Rules-based scoring -> points awarded for introductions, feedback, enrichments -> trust badges earned at thresholds -> score history tracked

- Trust scores are calculated using a rules-based scoring system
- Points are awarded for various activities:
  - Successful introductions made
  - Positive feedback received
  - Contact enrichment contributions
  - Other platform engagement metrics
- Trust badges are earned when users reach specific score thresholds
- Score history is tracked over time for trend analysis
- Users can provide feedback on trust scores of other users
- Trust scores are visible on user profiles and influence marketplace visibility

---

## 8. Credit System Flow

Credits earned from contact enrichment milestones -> credits spent on introduction requests -> balance tracking -> history with transaction types

- Users earn credits by reaching contact enrichment milestones (e.g., importing and enriching contacts)
- Credits can be spent on creating introduction requests (as an alternative or supplement to bounties)
- Credit balance is tracked per user/organisation
- Full transaction history is maintained with transaction types:
  - Earned (from enrichment milestones)
  - Spent (on introduction requests)
  - Refunded (from cancelled requests)
- Balance is validated before allowing credit expenditure

---

## 9. Email Flow

Template management -> variable substitution -> HTML sanitization -> send via Resend -> webhook tracking (sent, opened, clicked, bounced) -> retry on failure

- **Template Management**: Email templates are created and managed with customizable content
- **Variable Substitution**: Templates support dynamic variables (recipient name, company, etc.) that are substituted at send time
- **HTML Sanitization**: Email content is sanitized using sanitize-html on the server to prevent XSS and injection
- **Sending**: Emails are sent via Resend transactional email service
- **Webhook Tracking**: Resend webhooks (verified via Svix) track email events:
  - Sent
  - Opened
  - Clicked
  - Bounced
  - Failed
- **Retry on Failure**: Failed email sends are retried automatically via the background job system

---

## 10. Subscription Flow

Plans with monthly/yearly pricing -> Stripe checkout -> subscription sync via webhooks -> billing portal for management -> upgrade flow

- Multiple subscription plans are available with monthly and yearly pricing options
- Users initiate subscription via Stripe Checkout (hosted payment page)
- Subscription state is synced to the database via Stripe webhooks:
  - `checkout.session.completed`
  - `invoice.paid`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Users can manage their subscription (cancel, update payment method) via Stripe Billing Portal
- Upgrade flow allows users to move to a higher-tier plan with prorated billing

---

## 11. Referral Flow

User sends invite -> invite accepted -> referral tracked -> rewards issued at milestones

- Users can invite others to the platform via email or shareable invite link
- When an invite is accepted and the new user signs up, the referral is tracked
- Referrals are attributed to the inviting user
- Rewards are issued when referral milestones are reached (e.g., referred user completes onboarding, makes first introduction)
- Referral history and rewards are visible in the user's dashboard

---

## 12. Recruitment Flow

Recruiter posts job (bounty auto-calculated from salary) -> connectors share & candidates apply -> recruiter reviews Kanban pipeline -> shortlist (free) -> interview invite sent (30-day token) -> candidate books slot via public page -> calendar event created -> interview completed -> move to Hired (full referral fee captured)

- **Job Creation**: Recruiter creates job posting with salary range; bounty auto-calculated from tier lookup (salary normalized to yearly). Payment method required before posting.
- **AI Matching**: Job and contact embeddings (768-dim OpenAI vectors) are computed via BullMQ. Cosine similarity > 0.3 filters top 50, then LLM scores top 15. Matches with LLM score > 30 appear in connector's Inbox.
- **Consent Workflow**: Connector approves AI match → consent email sent to contact with unique token → contact accepts (applies to job) or declines with reason.
- **Candidate Application**: Candidates apply via public share link or consent flow. Anonymous label assigned (e.g., "Candidate #RC-ABC123"). Identity hidden until interview_scheduled stage.
- **Pipeline Management**: Recruiter manages candidates in Kanban board through stages: in_review → shortlisted → interview_invite_sent → interview_scheduled → interview_completed. Rejection possible from any stage.
- **Two-Step Payment**: Shortlisting authorizes Stripe PaymentIntent (not charged). Payment captured only when candidate confirms interview slot. Recruiter pays all fees (bounty + 2.9% + $0.30 Stripe + $0.25 processing).
- **Interview Booking**: Public token-based endpoint (no JWT/CSRF). Fetches recruiter calendar availability (Google/Microsoft) for 14-day window. Confirmation creates Google Meet or Teams event.
- **Sharing & Referrals**: Connectors share jobs via unique sharerCode. Share events tracked with IP, user agent, referer. Sharer attributed on candidate application.

---

## 13. Calendar Flow

Google/Microsoft Calendar OAuth -> token storage -> event retrieval -> meeting scheduling -> meeting completion tracking

- Users connect their Google or Microsoft Calendar via OAuth
- OAuth tokens are securely stored for ongoing access
- Calendar events are retrieved to check availability and track meetings
- Meeting scheduling integrates with the introduction request flow (prospect books via calendar)
- Meeting completion is tracked by monitoring calendar events
- Calendar data is used to verify that introduction meetings actually occurred
