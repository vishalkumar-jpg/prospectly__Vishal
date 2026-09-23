# Recruitment Connector Commission Tracking & Payout — Phase 1
## 1. Overview

Integrate connector commission tracking and payout functionality into the **recruitment jobs module**, similar to the existing prospecting module payout system. When a candidate progresses through the recruitment pipeline to the **"Interview Scheduled"** stage, the connector who facilitated that hire becomes eligible for a bounty payout.


## 2. Business Context

### How Recruitment Jobs Flow Today

1. A recruiter creates a recruitment job → it appears in **Job Marketplace** (`recruiting/job-marketplace`) and **Refer Candidates** (`recruiting/refer-candidates`) pages.
2. Connectors can:
   - **Share the job** on social media (creates a `recruitment_job_shares` record with a unique `sharer_code`).
   - **Send consent** directly to AI-matched candidates from the Refer Candidates page.
3. Candidates apply for jobs either through a shared link or after accepting consent.
4. The candidate progresses through stages: `in_review` → `shortlisted` → `interview_invite_sent` → `interview_scheduled`


### Existing Recruiter Payment Flow
When a candidate is moved to **Hired**, the recruiter is charged the full flat referral fee (a single create-and-capture Stripe PaymentIntent). Shortlisting and interview booking are free. This is tracked in the `recruitment_interview_transactions` table which is already working.

### Bounty Amount Source
The bounty amount comes from the `recruitment_job_prices` table (`bounty_amount` column), which is computed based on salary range tiers when the job is created.


## 3. Payout Case (Phase 1) that we need to implement
**Scenario:** A connector shares a job on social media OR sends consent to a candidate. The candidate applies and progresses through all stages until **Interview Scheduled**.

**How the connector is identified:**
- **Direct apply via shared link:** `recruitment_job_candidates.connector_user_id` is set to the sharer (from `recruitment_job_shares.sharer_id`) — see `candidates-mutation.service.ts` line 165.
- **Consent flow:** `recruitment_job_candidates.connector_user_id` is set to the connector who sent the consent (from `recruitment_job_pool_matches.connector_user_id`) — see `consent-mutation.service.ts` line 384.

**Payout split:**
| Recipient     | Percentage |
|---------------|-----------|
| Connector     | 80%       |
| Platform      | 20%       |

**Example:**
- Bounty amount = $100
- Connector receives: $80
- Platform retains: $20

you can take this commission percentage from constant file for this recruitment payout module.
---
## 4. Payout

### Payout Window
- **24 hours + 1 hour additional buffer** after the **actual interview date/time** (not when the interview was scheduled/booked).
- The actual interview date is when the meeting is set to occur (the calendar slot the candidate booked).

**Example:**
- Candidate books interview on Oct 8 for: `2025-10-10 10:00 AM UTC` (actual interview date)
- Payout processes at: `2025-10-11 11:00 AM UTC` (25 hours after the actual interview)
- This 25-hour window exists to allow the recruiter to raise a **dispute** (dispute feature is future scope but the window must be built now).

## 5. Validation & Security Requirements
### Pre-Payout Validations (Critical)

1. **Verify recruiter was charged:** Before processing any connector payout, confirm that a `recruitment_interview_transactions` record exists for that specific `candidate_id` with `status = 'captured'`. The platform must never pay out money it hasn't collected.
2. **Amount from database only:** Never trust client-passed amounts.
3. Also please make sure no duplicate payout can happen in any cases
4. **Stripe Connect account check:** If a connector has not connected their Stripe account, defer the payout (create a `onboarding_pending` record). When they connect their account later, immediately process all pending payouts.


## 6. Connector Credit System Integration

### Reference
The existing credit system is in `server/src/modules/credits/helpers/credit-usage.helper.ts`.

### How Credits Work
- If a connector has a **pending credit balance** (from promotions, referrals, etc.), the platform commission is reduced or waived.
- Credits are applied against the **platform's 20% commission**, not the full bounty.
- The connector receives the commission amount that would have gone to the platform (up to the credit balance).

### Example (Single Connector with Credits)
- Bounty = $100, normal split = $80 connector / $20 platform
- Connector has $15 credit balance
- Credits applied: $15 (against the $20 commission)
- Connector receives: $80 + $15 = $95
- Platform receives: $20 - $15 = $5
- Remaining credit balance: $0

### Example (Credits Exceed Commission)
- Bounty = $100, normal split = $80 connector / $20 platform
- Connector has $30 credit balance
- Credits applied: $20 (capped at commission amount)
- Connector receives: $80 + $20 = $100
- Platform receives: $0
- Remaining credit balance: $10



### File Size Constraint
All service files must be **≤ 200 lines**. Split into helpers, utils, and focused service files as shown above.

Also please write nit and clean code and you can create new folder inside "server/src/modules/recruitment" recruitment folder.
and which is dedicated for recruitment payout related functionality only. You can create multiple services file where needed
and put that services file inside dedicated services folder same as we followed for other recruitment modules. also make sure
any service file code can not exceeded more than 200 lines of code. create helpers, utils, reusable services where needed.


Read this plan file and interview me in detail using the AskUserQuestionTool about 
literally anything: technical implementation, UI & UX, concerns, tradeoffs, security, performance, scalability etc.
Ask about technical implementation ,dig into the hard parts I might not have considered

Keep interviewing until we've covered everything.